import Anthropic from '@anthropic-ai/sdk';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { env } from '../config.js';
import type { ContentGenerationRequest, GeneratedContent } from '@embedo/types';

const log = createLogger('social-media:generator');
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

/**
 * Generate social media content for a business using Claude.
 */
export async function generateSocialContent(
  request: ContentGenerationRequest,
): Promise<GeneratedContent> {
  const { businessName, businessType, platform, topic, tone = 'casual', includeHashtags = true } = request;

  const platformGuidelines: Record<string, string> = {
    INSTAGRAM: 'Instagram post — engaging, visual storytelling. 150-200 characters caption. Include 5-8 relevant hashtags.',
    FACEBOOK: 'Facebook post — conversational, community-focused. 150-300 characters. Include 2-3 hashtags.',
    GOOGLE_MY_BUSINESS: 'Google Business post — professional, informative. 300-1500 characters. Focus on specials or events.',
  };

  const guidelines = platformGuidelines[platform] ?? platformGuidelines['INSTAGRAM']!;

  const prompt = `Write social media content for ${businessName}, a ${businessType}.

Platform: ${platform}
Format: ${guidelines}
Tone: ${tone}
${topic ? `Topic/Focus: ${topic}` : 'Create engaging general content about the business'}
Include hashtags: ${includeHashtags}

Return a JSON object with these fields:
- caption: the post caption text
- hashtags: array of hashtag strings (without #)
- imagePrompt: a brief prompt to generate a relevant image (max 50 words)

Return ONLY the JSON object, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}';

    // Clean up any markdown code blocks
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as { caption: string; hashtags: string[]; imagePrompt: string };

    log.info({ businessName, platform }, 'Content generated');

    return {
      caption: parsed.caption,
      hashtags: parsed.hashtags ?? [],
      imagePrompt: parsed.imagePrompt,
    };
  } catch (err) {
    throw new ExternalApiError('Anthropic', 'Failed to generate social content', err);
  }
}

/**
 * Generate an auto-DM reply for someone who commented or engaged.
 */
export async function generateAutoDmMessage(params: {
  businessName: string;
  businessType: string;
  recipientName?: string;
  context: string;
}): Promise<string> {
  const { businessName, businessType, recipientName, context } = params;

  const prompt = `You are writing a friendly direct message for ${businessName}, a ${businessType}.

A person ${recipientName ? `named ${recipientName} ` : ''}engaged with the business: "${context}"

Write a warm, brief DM response that:
1. Acknowledges their engagement warmly
2. Invites them to come in or learn more
3. Offers a next step (like booking a reservation or asking a question)

Keep it to 2-3 sentences maximum. Sound human and genuine.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0]?.type === 'text' ? response.content[0].text : '';
}
