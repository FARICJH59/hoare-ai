'use strict';

/**
 * Agent Tracer
 *
 * Traces individual agent invocations within a workflow.
 * Each agent call creates a span with inputs, outputs, and timing.
 */

const logger = require('../utils/logger');
const { generateRequestId } = require('../utils/id-generator');

class AgentTracer {
  constructor() {
    /** @type {Map<string, object>} spanId → agent span */
    this._spans = new Map();
    this._maxSpans = 10000;
  }

  /**
   * Record the start of an agent invocation.
   * @param {object} options
   * @param {string}   options.agentId
   * @param {string}   options.agentName
   * @param {string}   [options.traceId]   - Parent workflow trace id
   * @param {string}   [options.tenantId]
   * @param {*}        [options.input]     - Agent input (sanitized, no secrets)
   * @returns {object} span
   */
  startSpan({ agentId, agentName, traceId, tenantId = 'default', input }) {
    const spanId = generateRequestId().replace('req-', 'aspan-');
    const span = {
      spanId,
      agentId,
      agentName,
      traceId:   traceId || null,
      tenantId,
      input:     input || null,
      output:    null,
      error:     null,
      status:    'running',
      startedAt: Date.now(),
      endedAt:   null,
      durationMs: null,
    };
    this._spans.set(spanId, span);
    this._evict();
    logger.debug('AgentTracer', 'Agent span started', { spanId, agentName });
    return span;
  }

  /**
   * Record the end of an agent invocation.
   * @param {string} spanId
   * @param {object} [options]
   * @param {*}        [options.output]
   * @param {string}   [options.error]
   * @param {boolean}  [options.success]
   * @returns {object|null}
   */
  endSpan(spanId, { output, error, success = true } = {}) {
    const span = this._spans.get(spanId);
    if (!span) return null;
    span.endedAt    = Date.now();
    span.durationMs = span.endedAt - span.startedAt;
    span.output     = output || null;
    span.error      = error  || null;
    span.status     = success ? 'ok' : 'error';
    logger.debug('AgentTracer', 'Agent span ended', { spanId, durationMs: span.durationMs, status: span.status });
    return span;
  }

  /**
   * Retrieve a span by id.
   * @param {string} spanId
   * @returns {object|null}
   */
  get(spanId) {
    return this._spans.get(spanId) || null;
  }

  /**
   * List spans for a workflow trace.
   * @param {string} traceId
   * @returns {object[]}
   */
  listByTrace(traceId) {
    return Array.from(this._spans.values())
      .filter(s => s.traceId === traceId)
      .sort((a, b) => a.startedAt - b.startedAt);
  }

  /**
   * List recent spans (newest first).
   * @param {number} [limit=100]
   * @returns {object[]}
   */
  list(limit = 100) {
    return Array.from(this._spans.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }

  /** @returns {{ total: number, running: number, ok: number, error: number, avgDurationMs: number }} */
  stats() {
    let running = 0, ok = 0, error = 0, totalDuration = 0, completed = 0;
    for (const s of this._spans.values()) {
      if (s.status === 'running') running++;
      else if (s.status === 'ok') { ok++; totalDuration += s.durationMs; completed++; }
      else { error++; totalDuration += s.durationMs || 0; completed++; }
    }
    return {
      total: this._spans.size,
      running,
      ok,
      error,
      avgDurationMs: completed > 0 ? Math.round(totalDuration / completed) : 0,
    };
  }

  _evict() {
    if (this._spans.size > this._maxSpans) {
      const oldest = Array.from(this._spans.entries())
        .sort((a, b) => a[1].startedAt - b[1].startedAt)
        .slice(0, this._spans.size - this._maxSpans);
      for (const [id] of oldest) this._spans.delete(id);
    }
  }
}

const agentTracer = new AgentTracer();

module.exports = { AgentTracer, agentTracer };
