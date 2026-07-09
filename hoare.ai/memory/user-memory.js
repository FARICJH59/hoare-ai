'use strict';

/**
 * User Memory
 *
 * Stores per-user preferences, context, and history.
 * Complements ProjectMemory (project-scoped) with user-scoped data.
 */

const logger = require('../utils/logger');

class UserMemory {
  constructor() {
    /** @type {Map<string, object>} userId → profile */
    this._profiles = new Map();
    /** @type {Map<string, object[]>} userId → interaction history */
    this._history = new Map();
  }

  /**
   * Upsert a user profile.
   * @param {string} userId
   * @param {object} data - Arbitrary key/value data (preferences, metadata)
   * @returns {object}
   */
  setProfile(userId, data) {
    if (!userId) throw new Error('UserMemory.setProfile: userId is required');
    const existing = this._profiles.get(userId) || {};
    const profile = { ...existing, ...data, userId, updatedAt: new Date().toISOString() };
    if (!existing.createdAt) profile.createdAt = profile.updatedAt;
    this._profiles.set(userId, profile);
    logger.debug('UserMemory', 'Profile updated', { userId });
    return profile;
  }

  /**
   * Retrieve a user profile.
   * @param {string} userId
   * @returns {object|null}
   */
  getProfile(userId) {
    return this._profiles.get(userId) || null;
  }

  /**
   * Append an interaction event to user history.
   * @param {string} userId
   * @param {object} event - { type, data, ... }
   * @returns {object}
   */
  addHistory(userId, event) {
    if (!userId) throw new Error('UserMemory.addHistory: userId is required');
    if (!this._history.has(userId)) this._history.set(userId, []);
    const entry = { ...event, userId, timestamp: new Date().toISOString() };
    this._history.get(userId).push(entry);
    return entry;
  }

  /**
   * Retrieve recent interaction history for a user.
   * @param {string} userId
   * @param {number} [limit=20]
   * @returns {object[]}
   */
  getHistory(userId, limit = 20) {
    const history = this._history.get(userId) || [];
    return history.slice(-limit);
  }

  /**
   * Clear all memory for a user (GDPR compliance).
   * @param {string} userId
   */
  forget(userId) {
    this._profiles.delete(userId);
    this._history.delete(userId);
    logger.info('UserMemory', 'User data erased', { userId });
  }

  /** @returns {{ users: number, totalHistoryEntries: number }} */
  stats() {
    let totalHistoryEntries = 0;
    for (const history of this._history.values()) totalHistoryEntries += history.length;
    return { users: this._profiles.size, totalHistoryEntries };
  }
}

const userMemory = new UserMemory();

module.exports = { UserMemory, userMemory };
