import { ElevenLabsClient } from 'elevenlabs';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { db } from '@embedo/db';
import { env } from '../config.js';
import { buildSystemPrompt } from './prompt.js';

const log = createLogger('voice-agent:elevenlabs');

let client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
  if (!client) {
    client = new ElevenLabsClient({ ...(env.ELEVENLABS_API_KEY ? { apiKey: env.ELEVENLABS_API_KEY } : {}) });
  }
  return client;
}

/**
 * Create an ElevenLabs conversational AI agent for a business.
 * Stores the agent ID on the Business record.
 */
export async function provisionAgent(businessId: string): Promise<string> {
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });

  if (business.elevenLabsAgentId) {
    log.info({ businessId, agentId: business.elevenLabsAgentId }, 'Agent already exists');
    return business.elevenLabsAgentId;
  }

  const systemPrompt = buildSystemPrompt(business);

  try {
    const agent = await getClient().conversationalAi.createAgent({
      name: `${business.name} — AI Receptionist`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: systemPrompt,
          },
          first_message: `Thank you for calling ${business.name}! I'm your AI assistant. How can I help you today?`,
          language: 'en',
        },
        tts: {
          voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah — professional female voice
        },
      },
    });

    const agentId = agent.agent_id;

    await db.business.update({
      where: { id: businessId },
      data: { elevenLabsAgentId: agentId },
    });

    await db.onboardingLog.create({
      data: {
        businessId,
        step: 'elevenlabs_agent_created',
        status: 'success',
        message: `ElevenLabs agent created: ${agentId}`,
        data: { agentId },
      },
    });

    log.info({ businessId, agentId }, 'ElevenLabs agent created');
    return agentId;
  } catch (err) {
    await db.onboardingLog.create({
      data: { businessId, step: 'elevenlabs_agent_created', status: 'error', message: String(err) },
    });
    throw new ExternalApiError('ElevenLabs', 'Failed to create conversational agent', err);
  }
}

/**
 * Update agent system prompt (e.g., when business hours or menu changes).
 */
export async function updateAgentPrompt(businessId: string): Promise<void> {
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  if (!business.elevenLabsAgentId) {
    throw new Error(`Business ${businessId} has no ElevenLabs agent`);
  }

  const systemPrompt = buildSystemPrompt(business);

  try {
    await getClient().conversationalAi.updateAgent(business.elevenLabsAgentId, {
      conversation_config: {
        agent: {
          prompt: { prompt: systemPrompt },
        },
      },
    });
    log.info({ businessId }, 'ElevenLabs agent prompt updated');
  } catch (err) {
    throw new ExternalApiError('ElevenLabs', 'Failed to update agent prompt', err);
  }
}
