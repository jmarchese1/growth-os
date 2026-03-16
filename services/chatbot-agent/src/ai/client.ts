import Anthropic from '@anthropic-ai/sdk';
import { db } from '@embedo/db';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { leadCreatedQueue } from '@embedo/queue';
import { env } from '../config.js';
import { chatbotTools } from './tools.js';
import { buildChatbotSystemPrompt } from './prompt-builder.js';
import type { ChatMessage } from '@embedo/types';

const log = createLogger('chatbot-agent:ai');

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface ChatResponse {
  reply: string;
  leadCaptured: boolean;
  appointmentRequested: boolean;
  actions: Array<{ type: string; data: Record<string, unknown> }>;
}

/**
 * Process a chat message and return a response with any triggered actions.
 */
export async function processMessage(params: {
  businessId: string;
  sessionKey: string;
  message: string;
  history: ChatMessage[];
  channel: string;
  test?: boolean;
}): Promise<ChatResponse> {
  const { businessId, sessionKey, message, history, channel, test } = params;

  const systemPrompt = await buildChatbotSystemPrompt(businessId);

  // Convert history to Anthropic message format
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Add current user message
  messages.push({ role: 'user', content: message });

  let reply = '';
  const actions: Array<{ type: string; data: Record<string, unknown> }> = [];
  let leadCaptured = false;
  let appointmentRequested = false;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      tools: chatbotTools,
      messages,
    });

    // Extract text reply and handle tool calls
    for (const block of response.content) {
      if (block.type === 'text') {
        reply += block.text;
      } else if (block.type === 'tool_use') {
        const toolInput = block.input as Record<string, unknown>;

        actions.push({ type: block.name, data: toolInput });

        if (block.name === 'capture_lead') {
          leadCaptured = true;
          if (!test) {
            // Emit lead.created event (skipped in test mode)
            await leadCreatedQueue().add(`lead:chat:${sessionKey}:${Date.now()}`, {
              businessId,
              source: channel === 'WEB' ? 'CHATBOT' : 'SOCIAL',
              sourceId: sessionKey,
              rawData: toolInput,
            });
          }
        }

        if (block.name === 'book_appointment') {
          appointmentRequested = true;
          if (!test) {
            // Emit lead with appointment intent (skipped in test mode)
            await leadCreatedQueue().add(`lead:chat:booking:${sessionKey}:${Date.now()}`, {
              businessId,
              source: 'CHATBOT',
              sourceId: sessionKey,
              rawData: { ...toolInput, intent: 'booking' },
            });
          }
        }
      }
    }

    // Update session in DB (skipped in test mode)
    if (!test) {
      await db.chatSession.update({
        where: { sessionKey },
        data: {
          messages: {
            push: [
              { role: 'user', content: message, timestamp: new Date().toISOString() },
              { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
            ],
          },
          leadCaptured: leadCaptured,
          appointmentMade: appointmentRequested,
        },
      });
    }

    return { reply, leadCaptured, appointmentRequested, actions };
  } catch (err) {
    throw new ExternalApiError('Anthropic', 'Failed to process chat message', err);
  }
}
