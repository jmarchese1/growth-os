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

    // 3. Upload to Supabase Storage
    const uploadRes = await fetch(
      `${env.SUPABASE_URL}/storage/v1/object/public-images/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: imageBuffer,
      },
    );

    if (!uploadRes.ok) {
      // Bucket might not exist — try creating it first
      if (uploadRes.status === 404 || uploadRes.status === 400) {
        await createBucketIfNeeded();
        // Retry upload
        const retryRes = await fetch(
          `${env.SUPABASE_URL}/storage/v1/object/public-images/${storagePath}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': contentType,
              'x-upsert': 'true',
            },
            body: imageBuffer,
          },
        );
        if (!retryRes.ok) {
          const errText = await retryRes.text();
          throw new Error(`Upload retry failed: ${retryRes.status} ${errText}`);
        }
      } else {
        const errText = await uploadRes.text();
        throw new Error(`Upload failed: ${uploadRes.status} ${errText}`);
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

async function createBucketIfNeeded() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    await fetch(`${env.SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'public-images',
        name: 'public-images',
        public: true,
        file_size_limit: 10485760, // 10MB
      }),
    });
    logger.info('Created public-images bucket');
  } catch {
    // Bucket might already exist — that's fine
  }
}
