/**
 * Knowledge Layer
 * Industry-specific knowledge packs and reusable patterns.
 */

export interface KnowledgePack {
  id: string;
  name: string;
  industry: string;
  description: string;
  patterns: string[];
  bestPractices: string[];
  commonPitfalls: string[];
  recommendedStack: Record<string, string>;
}

const KNOWLEDGE_PACKS: KnowledgePack[] = [
  {
    id: 'fintech-pack',
    name: 'FinTech Engineering Pack',
    industry: 'fintech',
    description: 'Best practices for building financial technology platforms.',
    patterns: ['CQRS', 'Event Sourcing', 'Saga Pattern', 'Double-Entry Ledger'],
    bestPractices: [
      'Idempotent payment operations',
      'Audit trail for all financial transactions',
      'PCI-DSS compliance for card data',
      'Real-time fraud detection hooks',
    ],
    commonPitfalls: [
      'Not handling decimal precision (use integers for cents)',
      'Missing idempotency keys on payment APIs',
      'Insufficient audit logging',
    ],
    recommendedStack: { payments: 'Stripe', db: 'PostgreSQL', queue: 'Kafka', auth: 'Auth0' },
  },
  {
    id: 'healthcare-pack',
    name: 'Healthcare Engineering Pack',
    industry: 'healthcare',
    description: 'HIPAA-compliant healthcare platform patterns.',
    patterns: ['FHIR R4', 'HL7 v2', 'SMART on FHIR'],
    bestPractices: [
      'HIPAA compliance for PHI',
      'End-to-end encryption at rest and in transit',
      'Break-glass access for emergency scenarios',
      'Consent management for patient data',
    ],
    commonPitfalls: [
      'Logging PHI in plain text',
      'Missing patient consent flows',
      'Weak access controls on EHR data',
    ],
    recommendedStack: { db: 'PostgreSQL', fhir: 'HAPI FHIR', auth: 'Keycloak', storage: 'S3 + KMS' },
  },
  {
    id: 'saas-pack',
    name: 'Enterprise SaaS Pack',
    industry: 'saas',
    description: 'Multi-tenant SaaS platform engineering patterns.',
    patterns: ['Multi-tenancy', 'Feature Flags', 'Usage Metering', 'Webhook Delivery'],
    bestPractices: [
      'Row-level security for tenant isolation',
      'Graceful degradation with circuit breakers',
      'Idempotent webhook delivery with retries',
      'Usage metering at API gateway layer',
    ],
    commonPitfalls: [
      'Shared database without row-level security',
      'No tenant-aware caching layer',
      'Missing rate limiting per tenant',
    ],
    recommendedStack: { db: 'PostgreSQL + RLS', auth: 'Keycloak', billing: 'Stripe', cache: 'Redis' },
  },
  {
    id: 'ai-platform-pack',
    name: 'AI Platform Engineering Pack',
    industry: 'ai_platform',
    description: 'LLM and ML platform engineering patterns.',
    patterns: ['RAG', 'Prompt Chaining', 'Agent Orchestration', 'Vector Search'],
    bestPractices: [
      'Prompt versioning and A/B testing',
      'Token usage tracking and budgets',
      'Fallback LLM provider chains',
      'Human-in-the-loop for high-stakes decisions',
    ],
    commonPitfalls: [
      'No streaming for long-running LLM calls',
      'Missing prompt injection defenses',
      'No vector index refresh strategy',
    ],
    recommendedStack: { llm: 'OpenAI GPT-4o', vector: 'pgvector', cache: 'Redis', queue: 'BullMQ' },
  },
];

export const knowledgeBase = {
  getPackForIndustry(industry: string): KnowledgePack | undefined {
    return KNOWLEDGE_PACKS.find(p => p.industry === industry);
  },

  getAllPacks(): KnowledgePack[] {
    return KNOWLEDGE_PACKS;
  },

  searchPatterns(query: string): KnowledgePack[] {
    const q = query.toLowerCase();
    return KNOWLEDGE_PACKS.filter(
      p =>
        p.patterns.some(pat => pat.toLowerCase().includes(q)) ||
        p.bestPractices.some(bp => bp.toLowerCase().includes(q)),
    );
  },
};
