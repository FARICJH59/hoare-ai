'use strict';

/**
 * Metrics Collector
 *
 * Collects and aggregates runtime metrics: counters, gauges, and histograms.
 * Metrics are queryable as JSON, suitable for export to Prometheus/DataDog.
 */

const logger = require('../utils/logger');

class Metrics {
  constructor() {
    /** @type {Map<string, number>} name → value (counters) */
    this._counters = new Map();
    /** @type {Map<string, number>} name → value (gauges) */
    this._gauges   = new Map();
    /** @type {Map<string, number[]>} name → [observations] (histograms) */
    this._histograms = new Map();
    /** @type {Map<string, { labels: object, value: number, updatedAt: string }[]>} */
    this._labeledCounters = new Map();
  }

  /**
   * Increment a counter by delta (default 1).
   * @param {string} name
   * @param {number} [delta=1]
   * @param {object} [labels]
   */
  increment(name, delta = 1, labels) {
    this._counters.set(name, (this._counters.get(name) || 0) + delta);
    if (labels) this._trackLabeled(name, delta, labels);
  }

  /**
   * Set a gauge value.
   * @param {string} name
   * @param {number} value
   */
  gauge(name, value) {
    this._gauges.set(name, value);
  }

  /**
   * Record a histogram observation.
   * @param {string} name
   * @param {number} value
   */
  observe(name, value) {
    if (!this._histograms.has(name)) this._histograms.set(name, []);
    const obs = this._histograms.get(name);
    obs.push(value);
    // Keep at most 10000 observations per metric
    if (obs.length > 10000) obs.shift();
  }

  /**
   * Get current value of a counter.
   * @param {string} name
   * @returns {number}
   */
  getCounter(name) {
    return this._counters.get(name) || 0;
  }

  /**
   * Get current value of a gauge.
   * @param {string} name
   * @returns {number|null}
   */
  getGauge(name) {
    const v = this._gauges.get(name);
    return v !== undefined ? v : null;
  }

  /**
   * Get histogram summary (min, max, avg, p50, p95, p99).
   * @param {string} name
   * @returns {object|null}
   */
  getSummary(name) {
    const obs = this._histograms.get(name);
    if (!obs || obs.length === 0) return null;
    const sorted = obs.slice().sort((a, b) => a - b);
    const n = sorted.length;
    const p = (pct) => sorted[Math.floor(n * pct / 100)];
    return {
      count: n,
      min:   sorted[0],
      max:   sorted[n - 1],
      avg:   Math.round(obs.reduce((s, v) => s + v, 0) / n),
      p50:   p(50),
      p95:   p(95),
      p99:   p(99),
    };
  }

  /**
   * Dump all metrics as a plain object.
   * @returns {object}
   */
  dump() {
    const counters = {};
    for (const [k, v] of this._counters.entries()) counters[k] = v;
    const gauges = {};
    for (const [k, v] of this._gauges.entries()) gauges[k] = v;
    const histograms = {};
    for (const k of this._histograms.keys()) histograms[k] = this.getSummary(k);
    return { counters, gauges, histograms };
  }

  /** @returns {{ counters: number, gauges: number, histograms: number }} */
  stats() {
    return {
      counters:   this._counters.size,
      gauges:     this._gauges.size,
      histograms: this._histograms.size,
    };
  }

  _trackLabeled(name, delta, labels) {
    if (!this._labeledCounters.has(name)) this._labeledCounters.set(name, []);
    this._labeledCounters.get(name).push({ labels, value: delta, updatedAt: new Date().toISOString() });
  }
}

const metrics = new Metrics();

module.exports = { Metrics, metrics };
