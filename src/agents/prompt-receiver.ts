/**
 * Prompt Receiver Agent
 * Accepts natural language prompts, normalizes them, and returns a request envelope.
 */

export type LifecycleState = 'RECEIVED' | 'NORMALIZING' | 'NORMALIZED' | 'FORWARDED' | 'FAILED';

export interface PromptEnvelope {
  requestId: string;
  tenantId: string;
  userId: string;
  sessionId: string;
  originalPrompt: string;
  normalizedPrompt: string;
  state: LifecycleState;
  receivedAt: string;
  meta: Record<string, unknown>;
}

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizePrompt(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function validatePrompt(prompt: string): void {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt must be a non-empty string');
  }
  if (prompt.length < 3) {
    throw new Error('Prompt too short (min 3 characters)');
  }
  if (prompt.length > 10_000) {
    throw new Error('Prompt too long (max 10,000 characters)');
  }
}

export class PromptReceiverAgent {
  private tenantId: string;

  constructor(options: { tenantId?: string } = {}) {
    this.tenantId = options.tenantId ?? 'default';
  }

  receive(
    rawPrompt: string,
    meta: { userId?: string; sessionId?: string } & Record<string, unknown> = {},
  ): PromptEnvelope {
    const requestId = generateRequestId();
    const receivedAt = new Date().toISOString();

    validatePrompt(rawPrompt);

    const normalizedPrompt = normalizePrompt(rawPrompt);

    return {
      requestId,
      tenantId: this.tenantId,
      userId: (meta.userId as string) ?? 'anonymous',
      sessionId: (meta.sessionId as string) ?? `session-${Date.now()}`,
      originalPrompt: rawPrompt,
      normalizedPrompt,
      state: 'NORMALIZED',
      receivedAt,
      meta,
    };
  }

  markForwarded(envelope: PromptEnvelope): PromptEnvelope {
    return { ...envelope, state: 'FORWARDED' };
  }
}
