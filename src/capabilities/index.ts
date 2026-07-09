/**
 * Capabilities Registry
 * Defines available capability packs and their metadata.
 */

export interface CapabilityDefinition {
  id: string;
  name: string;
  description: string;
  category: 'infrastructure' | 'application' | 'security' | 'observability' | 'ai';
  dependencies: string[];
  estimatedSetupHours: number;
}

export const CAPABILITIES: CapabilityDefinition[] = [
  { id: 'authentication',  name: 'Authentication',    description: 'User identity and login flows (JWT, OAuth2, SSO)', category: 'security',        dependencies: [],            estimatedSetupHours: 8  },
  { id: 'authorization',   name: 'Authorization',     description: 'RBAC/ABAC permission management',                  category: 'security',        dependencies: ['authentication'], estimatedSetupHours: 12 },
  { id: 'database',        name: 'Database',          description: 'Relational or document data persistence',           category: 'infrastructure',  dependencies: [],            estimatedSetupHours: 6  },
  { id: 'caching',         name: 'Caching',           description: 'Redis or in-memory caching layer',                  category: 'infrastructure',  dependencies: [],            estimatedSetupHours: 4  },
  { id: 'messaging',       name: 'Messaging',         description: 'Event queues and pub/sub (Kafka, RabbitMQ)',         category: 'infrastructure',  dependencies: [],            estimatedSetupHours: 8  },
  { id: 'storage',         name: 'Object Storage',    description: 'File uploads and blob storage (S3-compatible)',     category: 'infrastructure',  dependencies: [],            estimatedSetupHours: 4  },
  { id: 'search',          name: 'Search',            description: 'Full-text and vector search (Elasticsearch)',       category: 'application',     dependencies: ['database'],  estimatedSetupHours: 8  },
  { id: 'payments',        name: 'Payments',          description: 'Payment processing (Stripe, PayPal)',               category: 'application',     dependencies: ['authentication', 'database'], estimatedSetupHours: 16 },
  { id: 'email',           name: 'Email',             description: 'Transactional email (SendGrid, SES)',               category: 'application',     dependencies: [],            estimatedSetupHours: 4  },
  { id: 'ai_ml',           name: 'AI / ML',           description: 'LLM inference, embeddings, model serving',         category: 'ai',              dependencies: ['database'],  estimatedSetupHours: 16 },
  { id: 'monitoring',      name: 'Observability',     description: 'Logging, metrics, and distributed tracing',        category: 'observability',   dependencies: [],            estimatedSetupHours: 8  },
  { id: 'realtime',        name: 'Real-time',         description: 'WebSockets and SSE for live updates',              category: 'application',     dependencies: ['caching'],   estimatedSetupHours: 8  },
  { id: 'multi_tenancy',   name: 'Multi-tenancy',     description: 'Tenant isolation, org management',                 category: 'application',     dependencies: ['authentication', 'database'], estimatedSetupHours: 20 },
  { id: 'ci_cd',           name: 'CI/CD',             description: 'Build, test, and deploy pipelines',                category: 'infrastructure',  dependencies: [],            estimatedSetupHours: 8  },
  { id: 'api_gateway',     name: 'API Gateway',       description: 'Rate limiting, routing, and API management',       category: 'infrastructure',  dependencies: [],            estimatedSetupHours: 4  },
];

export const capabilitiesRegistry = {
  getAll(): CapabilityDefinition[] {
    return CAPABILITIES;
  },

  getById(id: string): CapabilityDefinition | undefined {
    return CAPABILITIES.find(c => c.id === id);
  },

  getByCategory(category: CapabilityDefinition['category']): CapabilityDefinition[] {
    return CAPABILITIES.filter(c => c.category === category);
  },

  resolveDependencies(ids: string[]): string[] {
    const resolved = new Set(ids);
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of resolved) {
        const cap = this.getById(id);
        if (cap) {
          for (const dep of cap.dependencies) {
            if (!resolved.has(dep)) { resolved.add(dep); changed = true; }
          }
        }
      }
    }
    return Array.from(resolved);
  },

  estimateTotalHours(ids: string[]): number {
    return ids.reduce((sum, id) => {
      const cap = this.getById(id);
      return sum + (cap?.estimatedSetupHours ?? 0);
    }, 0);
  },
};
