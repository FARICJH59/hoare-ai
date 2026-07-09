'use strict';

/**
 * Intent Agent
 *
 * Responsibilities:
 *  - Classify industry from prompt
 *  - Detect required capabilities
 *  - Estimate project complexity
 *  - Identify required infrastructure components
 */

const logger = require('../utils/logger');

// ─── Industry classifier ─────────────────────────────────────────────────────

const INDUSTRY_KEYWORDS = {
  fintech:     ['payment', 'finance', 'bank', 'wallet', 'invoice', 'ledger', 'trading', 'crypto', 'defi', 'lending', 'kyc'],
  healthcare:  ['patient', 'medical', 'health', 'ehr', 'fhir', 'hospital', 'clinic', 'pharma', 'telemedicine', 'hl7'],
  ecommerce:   ['shop', 'store', 'product', 'cart', 'checkout', 'order', 'inventory', 'catalog', 'marketplace', 'retail'],
  logistics:   ['shipment', 'tracking', 'warehouse', 'fleet', 'route', 'delivery', 'supply chain', 'cargo', 'dispatch'],
  saas:        ['subscription', 'tenant', 'billing', 'plan', 'tier', 'workspace', 'dashboard', 'analytics', 'multi-tenant'],
  iot:         ['sensor', 'device', 'telemetry', 'edge', 'firmware', 'mqtt', 'gateway', 'embedded', 'actuator'],
  media:       ['video', 'stream', 'content', 'media', 'cdn', 'broadcast', 'podcast', 'upload', 'transcode'],
  gaming:      ['game', 'leaderboard', 'player', 'matchmaking', 'session', 'score', 'achievement', 'lobby'],
  ai_platform: ['model', 'inference', 'training', 'dataset', 'pipeline', 'embedding', 'vector', 'llm', 'agent', 'ml'],
  enterprise:  ['erp', 'crm', 'hr', 'workflow', 'approval', 'compliance', 'audit', 'rbac', 'sso', 'ldap'],
};

function classifyIndustry(prompt) {
  const lower = prompt.toLowerCase();
  const scores = {};
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    scores[industry] = keywords.filter(kw => lower.includes(kw)).length;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topScore = sorted[0][1];
  if (topScore === 0) return { primary: 'general', secondary: [], confidence: 0 };
  const primary = sorted[0][0];
  const secondary = sorted.slice(1).filter(([, s]) => s > 0 && s >= topScore * 0.5).map(([ind]) => ind);
  return { primary, secondary, confidence: Math.min(1, topScore / 5) };
}

// ─── Capability detector ──────────────────────────────────────────────────────

const CAPABILITY_PATTERNS = {
  authentication:   ['auth', 'login', 'oauth', 'jwt', 'sso', 'saml', 'mfa', 'user account'],
  authorization:    ['rbac', 'permission', 'role', 'access control', 'acl', 'policy'],
  storage:          ['file', 'upload', 'storage', 's3', 'blob', 'attachment', 'document'],
  database:         ['database', 'db', 'postgres', 'mysql', 'mongodb', 'sqlite', 'persist', 'data store'],
  messaging:        ['queue', 'kafka', 'rabbitmq', 'pubsub', 'event', 'message', 'notification', 'webhook'],
  api_gateway:      ['api', 'rest', 'graphql', 'grpc', 'endpoint', 'gateway'],
  caching:          ['cache', 'redis', 'memcache', 'session', 'ttl'],
  search:           ['search', 'elasticsearch', 'opensearch', 'full-text', 'index'],
  payments:         ['payment', 'stripe', 'paypal', 'checkout', 'billing', 'invoice', 'subscription'],
  email:            ['email', 'smtp', 'sendgrid', 'ses', 'notification', 'newsletter'],
  ai_ml:            ['ai', 'ml', 'model', 'inference', 'llm', 'embedding', 'vector', 'openai'],
  monitoring:       ['monitor', 'log', 'trace', 'metric', 'alert', 'observability', 'apm'],
  ci_cd:            ['deploy', 'ci', 'cd', 'pipeline', 'release', 'kubernetes', 'docker'],
  realtime:         ['realtime', 'websocket', 'socket.io', 'live', 'streaming', 'sse'],
  multi_tenancy:    ['multi-tenant', 'tenant', 'org', 'workspace', 'saas', 'isolation'],
};

function detectCapabilities(prompt) {
  const lower = prompt.toLowerCase();
  const detected = [];
  for (const [cap, patterns] of Object.entries(CAPABILITY_PATTERNS)) {
    if (patterns.some(p => lower.includes(p))) {
      detected.push(cap);
    }
  }
  // Always include API gateway as base
  if (!detected.includes('api_gateway')) detected.push('api_gateway');
  return detected;
}

// ─── Complexity estimator ─────────────────────────────────────────────────────

const COMPLEXITY_THRESHOLDS = { low: 3, medium: 7, high: 12 };

function estimateComplexity(capabilities, industry) {
  const capCount = capabilities.length;
  const enterpriseIndustries = ['fintech', 'healthcare', 'enterprise', 'ai_platform'];
  const industryBonus = enterpriseIndustries.includes(industry) ? 3 : 0;
  const score = capCount + industryBonus;

  let level, estimatedWeeks;
  if (score <= COMPLEXITY_THRESHOLDS.low) {
    level = 'low'; estimatedWeeks = '1-2';
  } else if (score <= COMPLEXITY_THRESHOLDS.medium) {
    level = 'medium'; estimatedWeeks = '3-6';
  } else if (score <= COMPLEXITY_THRESHOLDS.high) {
    level = 'high'; estimatedWeeks = '7-14';
  } else {
    level = 'enterprise'; estimatedWeeks = '14+';
  }
  return { level, score, estimatedWeeks };
}

// ─── Infrastructure identifier ────────────────────────────────────────────────

const INFRA_MAP = {
  database:      { type: 'database',    service: 'PostgreSQL',     containerImage: 'postgres:16-alpine' },
  caching:       { type: 'cache',       service: 'Redis',          containerImage: 'redis:7-alpine' },
  messaging:     { type: 'queue',       service: 'RabbitMQ',       containerImage: 'rabbitmq:3-management-alpine' },
  search:        { type: 'search',      service: 'Elasticsearch',  containerImage: 'elasticsearch:8.12.0' },
  storage:       { type: 'object_store',service: 'MinIO',          containerImage: 'minio/minio:latest' },
  ai_ml:         { type: 'ai_runtime',  service: 'HOARE-AI Engine',containerImage: 'hoare-ai/engine:latest' },
  monitoring:    { type: 'observability',service: 'Prometheus+Grafana', containerImage: 'prom/prometheus:latest' },
  realtime:      { type: 'broker',      service: 'NATS',           containerImage: 'nats:2-alpine' },
};

function identifyInfrastructure(capabilities) {
  const infra = [];
  for (const cap of capabilities) {
    if (INFRA_MAP[cap]) infra.push({ capability: cap, ...INFRA_MAP[cap] });
  }
  // API gateway always needed
  infra.push({ capability: 'api_gateway', type: 'gateway', service: 'Kong/Traefik', containerImage: 'traefik:v3' });
  return infra;
}

// ─── Intent Agent class ───────────────────────────────────────────────────────

class IntentAgent {
  /**
   * @param {object} [options]
   * @param {object} [options.auditLog] - AuditLog instance
   */
  constructor(options = {}) {
    this.auditLog = options.auditLog || null;
  }

  /**
   * Analyzes a prompt envelope and returns a rich intent analysis.
   *
   * @param {object} envelope - Prompt envelope from PromptReceiverAgent
   * @returns {object} Intent result
   */
  analyze(envelope) {
    const { requestId, tenantId, normalizedPrompt } = envelope;
    logger.info('IntentAgent', 'Analyzing intent', { requestId });

    const industry      = classifyIndustry(normalizedPrompt);
    const capabilities  = detectCapabilities(normalizedPrompt);
    const complexity    = estimateComplexity(capabilities, industry.primary);
    const infrastructure = identifyInfrastructure(capabilities);

    const intent = {
      requestId,
      tenantId,
      industry,
      capabilities,
      complexity,
      infrastructure,
      analyzedAt: new Date().toISOString(),
    };

    logger.info('IntentAgent', 'Intent analysis complete', {
      requestId,
      industry: industry.primary,
      capabilityCount: capabilities.length,
      complexity: complexity.level,
    });

    if (this.auditLog) {
      this.auditLog.record({ event: 'INTENT_ANALYZED', requestId, tenantId, industry: industry.primary, complexity: complexity.level });
    }

    return intent;
  }
}

module.exports = {
  IntentAgent,
  classifyIndustry,
  detectCapabilities,
  estimateComplexity,
  identifyInfrastructure,
};
