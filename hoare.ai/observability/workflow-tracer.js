'use strict';

/**
 * Workflow Tracer
 *
 * Provides distributed tracing for HOARE.ai workflow executions.
 * Traces are structured as spans within a trace tree, compatible
 * with OpenTelemetry trace semantics.
 */

const logger = require('../utils/logger');
const { generateWorkflowId } = require('../utils/id-generator');

class WorkflowTracer {
  constructor() {
    /** @type {Map<string, object>} traceId → trace */
    this._traces = new Map();
    this._maxTraces = 5000;
  }

  /**
   * Start a new workflow trace.
   * @param {object} options
   * @param {string}   options.workflowId
   * @param {string}   [options.tenantId]
   * @param {string}   [options.requestId]
   * @param {object}   [options.attributes]
   * @returns {object} trace context
   */
  startTrace({ workflowId, tenantId = 'default', requestId, attributes = {} }) {
    const traceId = generateWorkflowId().replace('wf-', 'trace-');
    const now = Date.now();
    const trace = {
      traceId,
      workflowId,
      tenantId,
      requestId:  requestId || null,
      attributes,
      spans:      [],
      status:     'running',
      startedAt:  now,
      endedAt:    null,
      durationMs: null,
    };
    this._traces.set(traceId, trace);
    this._evict();
    logger.debug('WorkflowTracer', 'Trace started', { traceId, workflowId });
    return trace;
  }

  /**
   * Add a span to an existing trace.
   * @param {string} traceId
   * @param {object} span
   * @param {string}   span.name
   * @param {string}   [span.kind]     - internal|client|server|producer|consumer
   * @param {object}   [span.attributes]
   * @returns {object} span with spanId
   */
  addSpan(traceId, span) {
    const trace = this._traces.get(traceId);
    if (!trace) throw new Error(`WorkflowTracer.addSpan: trace "${traceId}" not found`);
    const entry = {
      spanId:     generateWorkflowId().replace('wf-', 'span-'),
      name:       span.name,
      kind:       span.kind || 'internal',
      attributes: span.attributes || {},
      startedAt:  Date.now(),
      endedAt:    null,
      durationMs: null,
      status:     'running',
      error:      null,
    };
    trace.spans.push(entry);
    return entry;
  }

  /**
   * End a span.
   * @param {string} traceId
   * @param {string} spanId
   * @param {object} [options]
   * @param {boolean} [options.success]
   * @param {string}  [options.error]
   */
  endSpan(traceId, spanId, { success = true, error } = {}) {
    const trace = this._traces.get(traceId);
    if (!trace) return;
    const span = trace.spans.find(s => s.spanId === spanId);
    if (!span) return;
    span.endedAt   = Date.now();
    span.durationMs = span.endedAt - span.startedAt;
    span.status    = success ? 'ok' : 'error';
    span.error     = error || null;
  }

  /**
   * End a trace.
   * @param {string} traceId
   * @param {object} [options]
   * @param {boolean} [options.success]
   * @param {string}  [options.error]
   */
  endTrace(traceId, { success = true, error } = {}) {
    const trace = this._traces.get(traceId);
    if (!trace) return;
    trace.endedAt   = Date.now();
    trace.durationMs = trace.endedAt - trace.startedAt;
    trace.status    = success ? 'ok' : 'error';
    trace.error     = error || null;
    logger.debug('WorkflowTracer', 'Trace ended', { traceId, durationMs: trace.durationMs, status: trace.status });
  }

  /**
   * Retrieve a trace.
   * @param {string} traceId
   * @returns {object|null}
   */
  get(traceId) {
    return this._traces.get(traceId) || null;
  }

  /**
   * List recent traces (newest first).
   * @param {number} [limit=50]
   * @returns {object[]}
   */
  list(limit = 50) {
    return Array.from(this._traces.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }

  /** @returns {{ total: number, running: number, ok: number, error: number }} */
  stats() {
    let running = 0, ok = 0, error = 0;
    for (const t of this._traces.values()) {
      if (t.status === 'running') running++;
      else if (t.status === 'ok') ok++;
      else error++;
    }
    return { total: this._traces.size, running, ok, error };
  }

  _evict() {
    if (this._traces.size > this._maxTraces) {
      // Remove oldest
      const oldest = Array.from(this._traces.entries())
        .sort((a, b) => a[1].startedAt - b[1].startedAt)
        .slice(0, this._traces.size - this._maxTraces);
      for (const [id] of oldest) this._traces.delete(id);
    }
  }
}

const workflowTracer = new WorkflowTracer();

module.exports = { WorkflowTracer, workflowTracer };
