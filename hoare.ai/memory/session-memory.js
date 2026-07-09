'use strict';

/**
 * Session Memory
 *
 * Stores per-session conversation context and message history.
 * Sessions are scoped to a user + tenant pair.
 */

const logger = require('../utils/logger');
const { generateRequestId } = require('../utils/id-generator');

class SessionMemory {
  constructor() {
    /** @type {Map<string, object>} sessionId → session */
    this._sessions = new Map();
    /** @type {Map<string, string[]>} userId → [sessionId, ...] */
    this._byUser = new Map();
  }

  /**
   * Create a new session.
   * @param {object} params
   * @param {string} params.userId
   * @param {string} [params.tenantId]
   * @param {string} [params.title]
   * @returns {object}
   */
  create({ userId, tenantId = 'default', title = '' }) {
    if (!userId) throw new Error('SessionMemory.create: userId is required');
    const sessionId = generateRequestId().replace('req-', 'sess-');
    const now = new Date().toISOString();
    const session = { sessionId, userId, tenantId, title, messages: [], createdAt: now, updatedAt: now };
    this._sessions.set(sessionId, session);
    if (!this._byUser.has(userId)) this._byUser.set(userId, []);
    this._byUser.get(userId).push(sessionId);
    logger.debug('SessionMemory', 'Session created', { sessionId, userId });
    return session;
  }

  /**
   * Retrieve a session by id.
   * @param {string} sessionId
   * @returns {object|null}
   */
  get(sessionId) {
    return this._sessions.get(sessionId) || null;
  }

  /**
   * Append a message to a session.
   * @param {string} sessionId
   * @param {{ role: string, content: string }} message
   * @returns {object}
   */
  addMessage(sessionId, message) {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`SessionMemory.addMessage: session "${sessionId}" not found`);
    const entry = { ...message, timestamp: new Date().toISOString() };
    session.messages.push(entry);
    session.updatedAt = entry.timestamp;
    if (!session.title && message.role === 'user') {
      session.title = String(message.content).slice(0, 60);
    }
    return entry;
  }

  /**
   * List sessions for a user, sorted most-recent first.
   * @param {string} userId
   * @returns {object[]}
   */
  listByUser(userId) {
    const ids = this._byUser.get(userId) || [];
    return ids
      .map(id => this._sessions.get(id))
      .filter(Boolean)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /**
   * Delete a session.
   * @param {string} sessionId
   * @returns {boolean}
   */
  delete(sessionId) {
    const session = this._sessions.get(sessionId);
    if (!session) return false;
    this._sessions.delete(sessionId);
    const userList = this._byUser.get(session.userId) || [];
    const idx = userList.indexOf(sessionId);
    if (idx !== -1) userList.splice(idx, 1);
    return true;
  }

  /** @returns {{ sessions: number, messages: number }} */
  stats() {
    let messages = 0;
    for (const s of this._sessions.values()) messages += s.messages.length;
    return { sessions: this._sessions.size, messages };
  }
}

const sessionMemory = new SessionMemory();

module.exports = { SessionMemory, sessionMemory };
