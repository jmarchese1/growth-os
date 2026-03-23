import Anthropic from '@anthropic-ai/sdk';
import { db } from '@embedo/db';
import { ExternalApiError, createLogger } from '@embedo/utils';
import { env } from '../config.js';
import { generateToolSchemas } from './tool-registry.js';
import { executeTool } from './tool-executor.js';
import { buildChatbotSystemPrompt, buildChatbotSystemPromptFromContext } from './prompt-builder.js';
import type { ChatMessage } from '@embedo/types';

const log = createLogger('chatbot-agent:ai');

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const MAX_TOOL_ITERATIONS = 5;

// Cache context for 5 minutes
const contextCache = new Map<string, { data: Record<string, unknown>; expiry: number }>();

export interface ChatResponse {
  reply: string;
  leadCaptured: boolean;
  appointmentRequested: boolean;
  actions: Array<{ type: string; data: Record<string, unknown> }>;
}

/**
 * Fetch chatbot context from API gateway. Returns enabled tools, business info, capabilities.
 */
async function fetchContext(businessId: string): Promise<Record<string, unknown> | null> {
  const cached = contextCache.get(businessId);
  if (cached && cached.expiry > Date.now()) return cached.data;

  try {
    const res = await fetch(`${env.API_GATEWAY_URL}/chatbot/context/${businessId}`);
    if (!res.ok) {
      log.warn({ businessId, status: res.status }, 'Failed to fetch chatbot context');
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    contextCache.set(businessId, { data, expiry: Date.now() + 5 * 60 * 1000 });
    return data;
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : String(err), businessId }, 'Context fetch error');
    return null;
  }
}

/**
 * Process a chat message with multi-turn tool execution.
 * Claude can call tools, get results back, and formulate a final response.
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

  // Fetch context from API gateway (includes enabled tools + configs)
  const context = await fetchContext(businessId);
  const enabledTools = (context?.['tools'] as Array<{ type: string; config: Record<string, unknown> }>) ?? [];

  // Build system prompt — use context-based builder if we have context, fallback to DB query
  const systemPrompt = context
    ? buildChatbotSystemPromptFromContext(context, enabledTools)
    : await buildChatbotSystemPrompt(businessId);

  // Generate Anthropic tool schemas based on enabled tools
  const tools = generateToolSchemas(enabledTools);

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
    // Multi-turn conversation loop
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages,
      });

      // Check if Claude wants to use tools
      if (response.stop_reason === 'tool_use') {
        // Collect all tool_use blocks from this response
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ContentBlock & { type: 'tool_use' } => b.type === 'tool_use',
        );

        // Also collect any text blocks (Claude sometimes writes text before tool calls)
        const textBlocks = response.content.filter(
          (b): b is Anthropic.TextBlock => b.type === 'text',
        );
        for (const tb of textBlocks) {
          reply += tb.text;
        }

        // Append the full assistant message (with tool_use blocks) to messages
        messages.push({ role: 'assistant', content: response.content });

        // Execute all tool calls in parallel
        const toolResults = await Promise.all(
          toolUseBlocks.map(async (block) => {
            const toolInput = block.input as Record<string, unknown>;
            actions.push({ type: block.name, data: toolInput });

            if (block.name === 'capture_lead') leadCaptured = true;
            if (block.name === 'make_reservation') appointmentRequested = true;

            const result = await executeTool({
              toolName: block.name,
              input: toolInput,
              businessId,
              sessionKey,
              channel,
              test,
              context: context ?? undefined,
              enabledTools,
            });

            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: JSON.stringify(result),
            };
          }),
        );

        // Append tool results as user message
        messages.push({ role: 'user', content: toolResults });

        // Continue loop — Claude will process tool results and respond
        continue;
      }

      // stop_reason === 'end_turn' (or max_tokens) — extract final text
      for (const block of response.content) {
        if (block.type === 'text') {
          reply += block.text;
        }
      }
      break;
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error({ err: errMsg, businessId, sessionKey, messageCount: messages.length }, 'Anthropic API call failed');
    throw new ExternalApiError('Anthropic', `Chat failed: ${errMsg}`, err);
  }

  // Fallback if we hit the iteration cap without a text reply
  if (!reply) {
    reply = "I'm sorry, I wasn't able to complete that request. Could you try again or call us directly?";
  }

  // Update session in DB separately — don't let DB errors kill the response
  if (!test) {
    try {
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
          leadCaptured,
          appointmentMade: appointmentRequested,
        },
      });
    } catch (dbErr) {
      log.error({ err: dbErr instanceof Error ? dbErr.message : String(dbErr), sessionKey }, 'DB update failed — reply still returned');
    }
  }

  return { reply, leadCaptured, appointmentRequested, actions };
}
