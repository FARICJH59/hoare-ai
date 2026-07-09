'use strict';

/**
 * Vector Interface
 *
 * Provides a pluggable vector-store abstraction for semantic search
 * and RAG (Retrieval-Augmented Generation).
 *
 * Ships with an in-memory cosine-similarity implementation.
 * Production deployments should inject a Pinecone / pgvector / Qdrant adapter
 * via setAdapter().
 */

const logger = require('../utils/logger');

// ── Simple cosine similarity ──────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── In-memory adapter (default) ───────────────────────────────────────────────

class InMemoryVectorAdapter {
  constructor() {
    /** @type {Array<{ id: string, vector: number[], metadata: object, text: string }>} */
    this._vectors = [];
  }

  async upsert(id, vector, text, metadata = {}) {
    const idx = this._vectors.findIndex(v => v.id === id);
    const entry = { id, vector, text, metadata, updatedAt: new Date().toISOString() };
    if (idx !== -1) {
      this._vectors[idx] = entry;
    } else {
      this._vectors.push(entry);
    }
  }

  async query(queryVector, topK = 5) {
    return this._vectors
      .map(v => ({ ...v, score: cosineSimilarity(queryVector, v.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async delete(id) {
    const idx = this._vectors.findIndex(v => v.id === id);
    if (idx !== -1) { this._vectors.splice(idx, 1); return true; }
    return false;
  }

  stats() {
    return { vectors: this._vectors.length };
  }
}

// ── VectorInterface ───────────────────────────────────────────────────────────

class VectorInterface {
  constructor() {
    this._adapter = new InMemoryVectorAdapter();
  }

  /**
   * Swap out the underlying vector store adapter.
   * @param {object} adapter - Must implement upsert, query, delete, stats
   */
  setAdapter(adapter) {
    if (typeof adapter.upsert  !== 'function') throw new Error('VectorInterface: adapter.upsert must be a function');
    if (typeof adapter.query   !== 'function') throw new Error('VectorInterface: adapter.query must be a function');
    if (typeof adapter.delete  !== 'function') throw new Error('VectorInterface: adapter.delete must be a function');
    this._adapter = adapter;
    logger.info('VectorInterface', 'Adapter swapped', { adapter: adapter.constructor?.name || 'custom' });
  }

  /**
   * Upsert a vector.
   * @param {string}   id
   * @param {number[]} vector
   * @param {string}   text       - Original text (for retrieval display)
   * @param {object}   [metadata]
   */
  async upsert(id, vector, text, metadata = {}) {
    return this._adapter.upsert(id, vector, text, metadata);
  }

  /**
   * Semantic search.
   * @param {number[]} queryVector
   * @param {number}   [topK=5]
   * @returns {Promise<Array<{ id, text, score, metadata }>>}
   */
  async query(queryVector, topK = 5) {
    return this._adapter.query(queryVector, topK);
  }

  /**
   * Delete a vector by id.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    return this._adapter.delete(id);
  }

  /** @returns {object} */
  stats() {
    return this._adapter.stats ? this._adapter.stats() : {};
  }
}

const vectorInterface = new VectorInterface();

module.exports = { VectorInterface, InMemoryVectorAdapter, vectorInterface, cosineSimilarity };
