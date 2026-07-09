'use strict';

/**
 * REST API Client
 *
 * Lightweight HTTP client for calling HOARE.ai REST endpoints.
 * Works in Node.js 18+ (native fetch) and browsers.
 */

class RestClient {
  /**
   * @param {object} [options]
   * @param {string} [options.baseUrl]   - API base URL (default: process.env.HOARE_API_URL)
   * @param {string} [options.apiKey]    - API key for authentication
   * @param {number} [options.timeoutMs] - Request timeout in ms (default: 30000)
   * @param {object} [options.headers]   - Default extra headers
   */
  constructor(options = {}) {
    this.baseUrl   = (options.baseUrl   || (typeof process !== 'undefined' && process.env.HOARE_API_URL) || 'http://localhost:3000').replace(/\/$/, '');
    this.apiKey    = options.apiKey    || (typeof process !== 'undefined' && process.env.HOARE_API_KEY) || '';
    this.timeoutMs = options.timeoutMs || 30000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'X-Api-Key': this.apiKey } : {}),
      ...options.headers,
    };
  }

  /**
   * Make an HTTP request.
   * @param {string} method
   * @param {string} path
   * @param {object} [body]
   * @param {object} [extraHeaders]
   * @returns {Promise<object>}
   */
  async request(method, path, body, extraHeaders = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = { ...this.defaultHeaders, ...extraHeaders };
    const init = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    init.signal = controller.signal;

    try {
      const res = await fetch(url, init);
      clearTimeout(timeout);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}: ${typeof data === 'object' ? (data.error || data.message || res.statusText) : res.statusText}`);
        err.status = res.status;
        err.data   = data;
        throw err;
      }
      return data;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error(`Request timed out after ${this.timeoutMs}ms`);
      throw err;
    }
  }

  get(path, headers)        { return this.request('GET',    path, undefined, headers); }
  post(path, body, headers) { return this.request('POST',   path, body, headers); }
  put(path, body, headers)  { return this.request('PUT',    path, body, headers); }
  patch(path, body, headers){ return this.request('PATCH',  path, body, headers); }
  delete(path, headers)     { return this.request('DELETE', path, undefined, headers); }
}

module.exports = { RestClient };
