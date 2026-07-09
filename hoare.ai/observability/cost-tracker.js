'use strict';

/**
 * Cost Tracker
 *
 * Tracks LLM token costs, compute costs, and per-tenant cost attribution.
 * Uses configurable token pricing tables.
 */

const logger = require('../utils/logger');

// Default pricing (USD per 1M tokens) — update as provider pricing changes
const DEFAULT_PRICING = {
  'gpt-4o':             { input: 5.00,  output: 15.00  },
  'gpt-4o-mini':        { input: 0.15,  output: 0.60   },
  'gpt-4-turbo':        { input: 10.00, output: 30.00  },
  'gpt-3.5-turbo':      { input: 0.50,  output: 1.50   },
  'claude-3-opus':      { input: 15.00, output: 75.00  },
  'claude-3-sonnet':    { input: 3.00,  output: 15.00  },
  'claude-3-haiku':     { input: 0.25,  output: 1.25   },
  'default':            { input: 1.00,  output: 3.00   },
};

class CostTracker {
  constructor(pricingTable = DEFAULT_PRICING) {
    this._pricing = { ...DEFAULT_PRICING, ...pricingTable };
    /** @type {Map<string, object>} tenantId → cost aggregates */
    this._totals = new Map();
    /** @type {Array<object>} Recent cost events (ring buffer) */
    this._events = [];
    this._maxEvents = 10000;
  }

  /**
   * Record a token usage cost event.
   * @param {object} event
   * @param {string}   event.tenantId
   * @param {string}   event.model         - LLM model name
   * @param {number}   event.inputTokens
   * @param {number}   event.outputTokens
   * @param {string}   [event.requestId]
   * @param {string}   [event.agentId]
   * @returns {object} cost entry with USD amounts
   */
  recordTokens(event) {
    const { tenantId, model, inputTokens, outputTokens } = event;
    if (!tenantId) throw new Error('CostTracker.recordTokens: tenantId is required');
    if (!model)    throw new Error('CostTracker.recordTokens: model is required');

    const pricing = this._pricing[model] || this._pricing.default;
    const inputCost  = (inputTokens  || 0) / 1_000_000 * pricing.input;
    const outputCost = (outputTokens || 0) / 1_000_000 * pricing.output;
    const totalCost  = inputCost + outputCost;

    const entry = {
      tenantId,
      model,
      inputTokens:  inputTokens  || 0,
      outputTokens: outputTokens || 0,
      inputCostUsd:  inputCost,
      outputCostUsd: outputCost,
      totalCostUsd:  totalCost,
      requestId: event.requestId || null,
      agentId:   event.agentId   || null,
      recordedAt: new Date().toISOString(),
    };

    this._events.push(entry);
    if (this._events.length > this._maxEvents) this._events.shift();

    if (!this._totals.has(tenantId)) {
      this._totals.set(tenantId, { inputTokens: 0, outputTokens: 0, totalCostUsd: 0 });
    }
    const totals = this._totals.get(tenantId);
    totals.inputTokens  += entry.inputTokens;
    totals.outputTokens += entry.outputTokens;
    totals.totalCostUsd = parseFloat((totals.totalCostUsd + totalCost).toFixed(6));

    logger.debug('CostTracker', 'Tokens recorded', { tenantId, model, totalCostUsd: totalCost.toFixed(6) });
    return entry;
  }

  /**
   * Get cost totals for a tenant.
   * @param {string} tenantId
   * @returns {object}
   */
  getTotals(tenantId) {
    return this._totals.get(tenantId) || { inputTokens: 0, outputTokens: 0, totalCostUsd: 0 };
  }

  /**
   * Get recent cost events for a tenant.
   * @param {string} tenantId
   * @param {number} [limit=100]
   * @returns {object[]}
   */
  getEvents(tenantId, limit = 100) {
    return this._events.filter(e => e.tenantId === tenantId).slice(-limit);
  }

  /**
   * Get global cost summary across all tenants.
   * @returns {object}
   */
  globalSummary() {
    let totalCostUsd = 0, totalTokens = 0;
    for (const t of this._totals.values()) {
      totalCostUsd += t.totalCostUsd;
      totalTokens  += t.inputTokens + t.outputTokens;
    }
    return {
      tenants:      this._totals.size,
      totalTokens,
      totalCostUsd: parseFloat(totalCostUsd.toFixed(6)),
    };
  }

  /**
   * Update pricing for a model.
   * @param {string} model
   * @param {{ input: number, output: number }} pricing - USD per 1M tokens
   */
  setPricing(model, pricing) {
    this._pricing[model] = pricing;
  }

  /** @returns {{ tenants: number, events: number, totalCostUsd: number }} */
  stats() {
    return { ...this.globalSummary(), events: this._events.length };
  }
}

const costTracker = new CostTracker();

module.exports = { CostTracker, costTracker, DEFAULT_PRICING };
