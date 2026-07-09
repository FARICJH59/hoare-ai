'use strict';

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

let currentLevel = LOG_LEVELS.INFO;

/**
 * Sets the minimum log level.
 * @param {'DEBUG'|'INFO'|'WARN'|'ERROR'} level
 */
function setLevel(level) {
  if (LOG_LEVELS[level] !== undefined) currentLevel = LOG_LEVELS[level];
}

/**
 * Formats and emits a structured log line.
 * @param {string} level
 * @param {string} component
 * @param {string} message
 * @param {object} [meta]
 */
function log(level, component, message, meta = {}) {
  if (LOG_LEVELS[level] < currentLevel) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    component,
    message,
    ...meta,
  };
  const out = JSON.stringify(entry);
  if (level === 'ERROR') {
    process.stderr.write(out + '\n');
  } else {
    process.stdout.write(out + '\n');
  }
}

const logger = {
  debug: (component, message, meta) => log('DEBUG', component, message, meta),
  info:  (component, message, meta) => log('INFO',  component, message, meta),
  warn:  (component, message, meta) => log('WARN',  component, message, meta),
  error: (component, message, meta) => log('ERROR', component, message, meta),
  setLevel,
};

module.exports = logger;
