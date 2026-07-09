'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Generates a unique request ID with an optional prefix.
 * @param {string} [prefix='req'] - Prefix for the ID.
 * @returns {string} Unique ID string.
 */
function generateRequestId(prefix = 'req') {
  return `${prefix}-${uuidv4()}`;
}

/**
 * Generates a unique project ID.
 * @returns {string}
 */
function generateProjectId() {
  return generateRequestId('proj');
}

/**
 * Generates a unique workflow ID.
 * @returns {string}
 */
function generateWorkflowId() {
  return generateRequestId('wf');
}

/**
 * Generates a unique tenant ID.
 * @returns {string}
 */
function generateTenantId() {
  return generateRequestId('tenant');
}

/**
 * Generates a unique audit entry ID.
 * @returns {string}
 */
function generateAuditId() {
  return generateRequestId('audit');
}

module.exports = {
  generateRequestId,
  generateProjectId,
  generateWorkflowId,
  generateTenantId,
  generateAuditId,
};
