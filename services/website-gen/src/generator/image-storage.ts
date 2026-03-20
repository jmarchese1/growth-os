import { createLogger } from '@embedo/utils';
import { env } from '../config.js';

const logger = createLogger('website-gen:image-storage');

/**
 * Download an image from a temporary URL (like DALL-E) and upload it
 * to Supabase Storage for a permanent public URL.
 */
export async function persistImage(params: {
  tempUrl: string;
  businessId: string;
  filename?: string;
}): Promise<string> {
  const { tempUrl, businessId, filename } = params;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn('Supabase credentials not set — returning temporary URL');
    return tempUrl;
  }

  try {
    // 1. Download the image
    const imageRes = await fetch(tempUrl, { signal: AbortSignal.timeout(30000) });
    if (!imageRes.ok) throw new Error(`Download failed: ${imageRes.status}`);

    const contentType = imageRes.headers.get('content-type') ?? 'image/png';
    const imageBuffer = await imageRes.arrayBuffer();

    // 2. Generate a unique filename
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const name = filename ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = `images/${businessId}/${name}.${ext}`;

    // 3. Ensure bucket exists
    await createBucketIfNeeded();

    // 4. Upload to Supabase Storage using the upload endpoint
    const uploadRes = await fetch(
      `${env.SUPABASE_URL}/storage/v1/object/public-images/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: new Uint8Array(imageBuffer),
      },
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      logger.warn({ status: uploadRes.status, error: errText }, 'Direct upload failed, trying multipart');

      // Try multipart form upload as fallback
      const formData = new FormData();
      formData.append('', new Blob([imageBuffer], { type: contentType }), `${name}.${ext}`);

      const multipartRes = await fetch(
        `${env.SUPABASE_URL}/storage/v1/object/public-images/${storagePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'x-upsert': 'true',
          },
          body: formData,
        },
      );

      if (!multipartRes.ok) {
        const multiErr = await multipartRes.text();
        throw new Error(`Upload failed: ${multipartRes.status} ${multiErr}`);
      }
    }

    // 4. Return the permanent public URL
    const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/public-images/${storagePath}`;
    logger.info({ storagePath, size: imageBuffer.byteLength }, 'Image persisted to Supabase Storage');
    return publicUrl;
  } catch (err) {
    logger.warn({ error: String(err) }, 'Failed to persist image — returning temporary URL');
    return tempUrl;
  }
}

let bucketChecked = false;

async function createBucketIfNeeded() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || bucketChecked) return;
  bucketChecked = true;

  try {
    // Check if bucket exists
    const checkRes = await fetch(`${env.SUPABASE_URL}/storage/v1/bucket/public-images`, {
      headers: { 'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });

    if (checkRes.ok) {
      // Bucket exists — make sure it's public
      await fetch(`${env.SUPABASE_URL}/storage/v1/bucket/public-images`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public: true }),
      });
      return;
    }

    // Create bucket
    const createRes = await fetch(`${env.SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'public-images',
        name: 'public-images',
        public: true,
        file_size_limit: 10485760,
        allowed_mime_types: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      }),
    });

    if (createRes.ok) {
      logger.info('Created public-images bucket');
    } else {
      const err = await createRes.text();
      logger.warn({ error: err }, 'Bucket creation response');
    }
  } catch (err) {
    logger.warn({ error: String(err) }, 'Bucket setup failed');
  }
}
