/**
 * Intent Agent
 * Classifies industry, detects capabilities, estimates complexity,
 * and identifies required infrastructure from a normalized prompt.
 */

import type { PromptEnvelope } from './prompt-receiver';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Industry =
  | 'fintech' | 'healthcare' | 'ecommerce' | 'logistics' | 'saas'
  | 'iot' | 'media' | 'gaming' | 'ai_platform' | 'enterprise' | 'general';

export type Capability =
  | 'authentication' | 'authorization' | 'storage' | 'database' | 'messaging'
  | 'api_gateway' | 'caching' | 'search' | 'payments' | 'email'
  | 'ai_ml' | 'monitoring' | 'ci_cd' | 'realtime' | 'multi_tenancy';

export type ComplexityLevel = 'low' | 'medium' | 'high' | 'enterprise';

export interface IndustryResult {
  primary: Industry;
  secondary: Industry[];
  confidence: number;
}

export interface ComplexityResult {
  level: ComplexityLevel;
  score: number;
  estimatedWeeks: string;
}

export interface InfrastructureItem {
  capability: string;
  type: string;
  service: string;
  containerImage: string;
}

export interface IntentResult {
  requestId: string;
  tenantId: string;
  industry: IndustryResult;
  capabilities: Capability[];
  complexity: ComplexityResult;
  infrastructure: InfrastructureItem[];
  analyzedAt: string;
}

// ─── Industry Classifier ──────────────────────────────────────────────────────

const INDUSTRY_KEYWORDS: Record<Industry, string[]> = {
  fintech:     ['payment', 'finance', 'bank', 'wallet', 'invoice', 'ledger', 'trading', 'crypto', 'defi', 'lending', 'kyc'],
  healthcare:  ['patient', 'medical', 'health', 'ehr', 'fhir', 'hospital', 'clinic', 'pharma', 'telemedicine'],
  ecommerce:   ['shop', 'store', 'product', 'cart', 'checkout', 'order', 'inventory', 'catalog', 'marketplace'],
  logistics:   ['shipment', 'tracking', 'warehouse', 'fleet', 'route', 'delivery', 'supply chain', 'cargo'],
  saas:        ['subscription', 'tenant', 'billing', 'plan', 'tier', 'workspace', 'dashboard', 'analytics'],
  iot:         ['sensor', 'device', 'telemetry', 'edge', 'firmware', 'mqtt', 'gateway', 'embedded'],
  media:       ['video', 'stream', 'content', 'media', 'cdn', 'broadcast', 'podcast', 'upload', 'transcode'],
  gaming:      ['game', 'leaderboard', 'player', 'matchmaking', 'session', 'score', 'achievement'],
  ai_platform: ['model', 'inference', 'training', 'dataset', 'pipeline', 'embedding', 'vector', 'llm', 'agent', 'ml'],
  enterprise:  ['erp', 'crm', 'hr', 'workflow', 'approval', 'compliance', 'audit', 'rbac', 'sso'],
  general:     [],
};

function classifyIndustry(prompt: string): IndustryResult {
  const lower = prompt.toLowerCase();
  const scores: Partial<Record<Industry, number>> = {};

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS) as [Industry, string[]][]) {
    scores[industry] = keywords.filter(kw => lower.includes(kw)).length;
  }

  const sorted = (Object.entries(scores) as [Industry, number][]).sort((a, b) => b[1] - a[1]);
  const topScore = sorted[0][1];

  if (topScore === 0) return { primary: 'general', secondary: [], confidence: 0 };

  const primary = sorted[0][0];
  const secondary = sorted
    .slice(1)
    .filter(([, s]) => s > 0 && s >= topScore * 0.5)
    .map(([ind]) => ind);

  return { primary, secondary, confidence: Math.min(1, topScore / 5) };
}

// ─── Capability Detector ──────────────────────────────────────────────────────

const CAPABILITY_PATTERNS: Record<Capability, string[]> = {
  authentication:  ['auth', 'login', 'oauth', 'jwt', 'sso', 'saml', 'mfa', 'user account'],
  authorization:   ['rbac', 'permission', 'role', 'access control', 'acl', 'policy'],
  storage:         ['file', 'upload', 'storage', 's3', 'blob', 'attachment', 'document'],
  database:        ['database', 'db', 'postgres', 'mysql', 'mongodb', 'sqlite', 'persist', 'data store'],
  messaging:       ['queue', 'kafka', 'rabbitmq', 'pubsub', 'event', 'message', 'notification', 'webhook'],
  api_gateway:     ['api', 'rest', 'graphql', 'grpc', 'endpoint', 'gateway'],
  caching:         ['cache', 'redis', 'memcache', 'session', 'ttl'],
  search:          ['search', 'elasticsearch', 'opensearch', 'full-text', 'index'],
  payments:        ['payment', 'stripe', 'paypal', 'checkout', 'billing', 'invoice', 'subscription'],
  email:           ['email', 'smtp', 'sendgrid', 'ses', 'notification', 'newsletter'],
  ai_ml:           ['ai', 'ml', 'model', 'inference', 'llm', 'embedding', 'vector', 'openai'],
  monitoring:      ['monitor', 'log', 'trace', 'metric', 'alert', 'observability', 'apm'],
  ci_cd:           ['deploy', 'ci', 'cd', 'pipeline', 'release', 'kubernetes', 'docker'],
  realtime:        ['realtime', 'websocket', 'socket.io', 'live', 'streaming', 'sse'],
  multi_tenancy:   ['multi-tenant', 'tenant', 'org', 'workspace', 'saas', 'isolation'],
};

function detectCapabilities(prompt: string): Capability[] {
  const lower = prompt.toLowerCase();
  const detected: Capability[] = [];

  for (const [cap, patterns] of Object.entries(CAPABILITY_PATTERNS) as [Capability, string[]][]) {
    if (patterns.some(p => lower.includes(p))) detected.push(cap);
  }

  if (!detected.includes('api_gateway')) detected.push('api_gateway');
  return detected;
}

// ─── Complexity Estimator ─────────────────────────────────────────────────────

function estimateComplexity(capabilities: Capability[], industry: Industry): ComplexityResult {
  const score = capabilities.length + (['fintech', 'healthcare', 'enterprise', 'ai_platform'].includes(industry) ? 3 : 0);

  if (score <= 3)  return { level: 'low',        score, estimatedWeeks: '1-2' };
  if (score <= 7)  return { level: 'medium',     score, estimatedWeeks: '3-6' };
  if (score <= 12) return { level: 'high',       score, estimatedWeeks: '7-14' };
  return               { level: 'enterprise', score, estimatedWeeks: '14+' };
}

// ─── Infrastructure Identifier ────────────────────────────────────────────────

const INFRA_MAP: Partial<Record<Capability, Omit<InfrastructureItem, 'capability'>>> = {
  database:      { type: 'database',       service: 'PostgreSQL',          containerImage: 'postgres:16-alpine' },
  caching:       { type: 'cache',          service: 'Redis',               containerImage: 'redis:7-alpine' },
  messaging:     { type: 'queue',          service: 'RabbitMQ',            containerImage: 'rabbitmq:3-management-alpine' },
  search:        { type: 'search',         service: 'Elasticsearch',       containerImage: 'elasticsearch:8.12.0' },
  storage:       { type: 'object_store',   service: 'MinIO',               containerImage: 'minio/minio:latest' },
  ai_ml:         { type: 'ai_runtime',     service: 'HOARE-AI Engine',     containerImage: 'hoare-ai/engine:latest' },
  monitoring:    { type: 'observability',  service: 'Prometheus+Grafana',  containerImage: 'prom/prometheus:latest' },
  realtime:      { type: 'broker',         service: 'NATS',                containerImage: 'nats:2-alpine' },
};

function identifyInfrastructure(capabilities: Capability[]): InfrastructureItem[] {
  const infra: InfrastructureItem[] = [];
  for (const cap of capabilities) {
    if (INFRA_MAP[cap]) infra.push({ capability: cap, ...INFRA_MAP[cap]! });
  }
  infra.push({ capability: 'api_gateway', type: 'gateway', service: 'Traefik', containerImage: 'traefik:v3' });
  return infra;
}

// ─── Intent Agent ─────────────────────────────────────────────────────────────

export class IntentAgent {
  analyze(envelope: PromptEnvelope): IntentResult {
    const { requestId, tenantId, normalizedPrompt } = envelope;

    const industry       = classifyIndustry(normalizedPrompt);
    const capabilities   = detectCapabilities(normalizedPrompt);
    const complexity     = estimateComplexity(capabilities, industry.primary);
    const infrastructure = identifyInfrastructure(capabilities);

    return {
      requestId,
      tenantId,
      industry,
      capabilities,
      complexity,
      infrastructure,
      analyzedAt: new Date().toISOString(),
    };
  }
}

export { classifyIndustry, detectCapabilities, estimateComplexity, identifyInfrastructure };
