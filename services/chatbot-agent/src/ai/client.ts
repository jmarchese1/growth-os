import Anthropic from '@anthropic-ai/sdk';
import { db } from '@embedo/db';
import { ExternalApiError, createLogger } from '@embedo/utils';
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

  // Only include tools when message might contain lead/booking intent (saves ~500ms)
  const lowerMsg = message.toLowerCase();
  const needsTools = /\b(book|reserv|appointment|name is|my name|email|phone|call me|contact)\b/.test(lowerMsg);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: systemPrompt,
      ...(needsTools ? { tools: chatbotTools } : {}),
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
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error({ err: errMsg, businessId, sessionKey, messageCount: messages.length }, 'Anthropic API call failed');
    throw new ExternalApiError('Anthropic', `Chat failed: ${errMsg}`, err);
  }

  // Update session in DB separately — don't let DB errors kill the response
  if (!test) {
    try {
      // Read current messages, append, and write back (push on Json fields is unreliable)
      const currentSession = await db.chatSession.findUnique({ where: { sessionKey }, select: { messages: true } });
      const currentMsgs = Array.isArray(currentSession?.messages) ? currentSession.messages : [];
      const updatedMsgs = [
        ...(currentMsgs as Array<Record<string, string>>),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.chatSession.update as any)({
        where: { sessionKey },
        data: {
          messages: updatedMsgs,
          leadCaptured: leadCaptured,
          appointmentMade: appointmentRequested,
        },
      });
    } catch (dbErr) {
      log.error({ err: dbErr instanceof Error ? dbErr.message : String(dbErr), sessionKey }, 'DB update failed — reply still returned');
    }
  }

  return { reply, leadCaptured, appointmentRequested, actions };
}
