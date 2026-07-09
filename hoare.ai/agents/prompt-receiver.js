'use strict';

/**
 * Prompt Receiver Agent
 *
 * Responsibilities:
 *  - Accept natural language prompts (with tenant context)
 *  - Create unique request IDs
 *  - Normalize input (trim, collapse whitespace, unicode-safe)
 *  - Log full lifecycle state transitions
 */

const { generateRequestId } = require('../utils/id-generator');
const logger = require('../utils/logger');

const LIFECYCLE_STATES = {
  RECEIVED:    'RECEIVED',
  NORMALIZING: 'NORMALIZING',
  NORMALIZED:  'NORMALIZED',
  FORWARDED:   'FORWARDED',
  FAILED:      'FAILED',
};

/**
 * Normalizes a raw prompt string.
 * @param {string} raw
 * @returns {string}
 */
function normalizePrompt(raw) {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip zero-width chars
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

/**
 * Validates the prompt meets minimum requirements.
 * @param {string} prompt
 * @throws {Error} if invalid
 */
function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt must be a non-empty string');
  }
  if (prompt.length < 5) {
    throw new Error('Prompt too short (min 5 characters)');
  }
  if (prompt.length > 10000) {
    throw new Error('Prompt too long (max 10,000 characters)');
  }
}

class PromptReceiverAgent {
  /**
   * @param {object} [options]
   * @param {string} [options.tenantId] - Multi-tenant identifier
   * @param {object} [options.auditLog] - AuditLog instance for lifecycle events
   */
  constructor(options = {}) {
    this.tenantId = options.tenantId || 'default';
    this.auditLog = options.auditLog || null;
    this.LIFECYCLE_STATES = LIFECYCLE_STATES;
  }

  /**
   * Receives a prompt, assigns an ID, normalizes it, and returns a request envelope.
   *
   * @param {string} rawPrompt - Natural language prompt
   * @param {object} [meta] - Optional metadata (userId, source, etc.)
   * @returns {{ requestId: string, tenantId: string, originalPrompt: string, normalizedPrompt: string, state: string, receivedAt: string }}
   */
  receive(rawPrompt, meta = {}) {
    const requestId = generateRequestId('req');
    const receivedAt = new Date().toISOString();

    this._logState(requestId, LIFECYCLE_STATES.RECEIVED, { rawLength: (rawPrompt || '').length, meta });

    try {
      validatePrompt(rawPrompt);
    } catch (err) {
      this._logState(requestId, LIFECYCLE_STATES.FAILED, { reason: err.message });
      if (this.auditLog) {
        this.auditLog.record({
          event: 'PROMPT_RECEIVE_FAILED',
          requestId,
          tenantId: this.tenantId,
          reason: err.message,
        });
      }
      throw err;
    }

    this._logState(requestId, LIFECYCLE_STATES.NORMALIZING, {});

    const normalizedPrompt = normalizePrompt(rawPrompt);

    this._logState(requestId, LIFECYCLE_STATES.NORMALIZED, {
      normalizedLength: normalizedPrompt.length,
    });

    const envelope = {
      requestId,
      tenantId: this.tenantId,
      originalPrompt: rawPrompt,
      normalizedPrompt,
      state: LIFECYCLE_STATES.NORMALIZED,
      receivedAt,
      meta,
    };

    if (this.auditLog) {
      this.auditLog.record({
        event: 'PROMPT_RECEIVED',
        requestId,
        tenantId: this.tenantId,
        normalizedLength: normalizedPrompt.length,
      });
    }

    return envelope;
  }

  /**
   * Marks an envelope as forwarded to the next agent.
   * @param {object} envelope
   * @returns {object} Updated envelope
   */
  markForwarded(envelope) {
    this._logState(envelope.requestId, LIFECYCLE_STATES.FORWARDED, {});
    return { ...envelope, state: LIFECYCLE_STATES.FORWARDED };
  }

  _logState(requestId, state, extra) {
    logger.info('PromptReceiverAgent', `State: ${state}`, { requestId, tenantId: this.tenantId, ...extra });
  }
}

module.exports = { PromptReceiverAgent, LIFECYCLE_STATES, normalizePrompt };
