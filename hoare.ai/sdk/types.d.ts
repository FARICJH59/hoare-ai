/**
 * HOARE.ai TypeScript Type Definitions
 *
 * Provides full TypeScript typings for the HOARE.ai SDK.
 * Import via:  import type { HoareClient, ... } from 'hoare-ai-runtime/sdk/types';
 */

// ── SDK ───────────────────────────────────────────────────────────────────────

export interface HoareClientOptions {
  baseUrl?:   string;
  apiKey?:    string;
  timeoutMs?: number;
}

export declare class HoareClient {
  constructor(options?: HoareClientOptions);
  health(): Promise<HealthReport>;
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
  listAgents(kind?: string): Promise<AgentRegistration[]>;
  listSkills(kind?: string): Promise<SkillRegistration[]>;
  listCapabilityPacks(): Promise<CapabilityPack[]>;
  enablePack(tenantId: string, packId: string): Promise<{ ok: boolean }>;
  disablePack(tenantId: string, packId: string): Promise<{ ok: boolean }>;
  getMetrics(): Promise<MetricsDump>;
  listTraces(limit?: number): Promise<WorkflowTrace[]>;
  getUsage(tenantId: string): Promise<UsageSummary>;
}

// ── Health ────────────────────────────────────────────────────────────────────

export interface HealthReport {
  status:    'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services:  Record<string, ServiceHealth>;
}

export interface ServiceHealth {
  healthy:   boolean;
  details?:  Record<string, unknown>;
  error?:    string | null;
  checkedAt: number;
}

// ── Generation ────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  tenantId?:      string;
  submitToQgps?:  boolean;
  monitor?:       boolean;
}

export interface GenerateResult {
  envelope:     RequestEnvelope;
  intent:       Intent;
  plan:         ExecutionPlan;
  artifacts:    ProjectArtifacts;
  verification: VerificationResult;
  submission:   QGPSSubmission | null;
}

export interface RequestEnvelope {
  requestId:       string;
  tenantId:        string;
  normalizedPrompt: string;
  state:           string;
  receivedAt:      string;
}

export interface Intent {
  requestId:      string;
  industry:       { primary: string; secondary: string[]; confidence: number };
  capabilities:   string[];
  complexity:     { level: string; score: number };
  infrastructure: InfrastructureItem[];
}

export interface InfrastructureItem {
  type:     string;
  provider: string;
}

export interface ExecutionPlan {
  workflowId:     string;
  steps:          WorkflowStep[];
  deployment:     { strategy: string };
  capabilityPacks: string[];
}

export interface WorkflowStep {
  id:       string;
  name:     string;
  type:     string;
  depends?: string[];
}

export interface ProjectArtifacts {
  projectId:   string;
  projectName: string;
  files:       Record<string, string>;
}

export interface VerificationResult {
  passed:  boolean;
  score:   number;
  checks:  Array<{ name: string; passed: boolean; reason?: string }>;
}

export interface QGPSSubmission {
  workflowId: string;
  status:     string;
}

// ── Registries ────────────────────────────────────────────────────────────────

export interface AgentRegistration {
  id:           string;
  name:         string;
  kind:         string;
  version:      string;
  author?:      string;
  description?: string;
  capabilities?: string[];
  registeredAt: string;
}

export interface SkillRegistration {
  id:           string;
  name:         string;
  kind:         'industry' | 'ai' | 'tool' | 'workflow';
  version:      string;
  pluginId?:    string;
  description?: string;
  registeredAt: string;
}

// ── Marketplace ───────────────────────────────────────────────────────────────

export interface CapabilityPack {
  id:           string;
  name:         string;
  version:      string;
  description?: string;
  author?:      string;
  capabilities?: string[];
  tags?:        string[];
  loadedAt:     string;
}

// ── Observability ─────────────────────────────────────────────────────────────

export interface MetricsDump {
  counters:   Record<string, number>;
  gauges:     Record<string, number>;
  histograms: Record<string, HistogramSummary | null>;
}

export interface HistogramSummary {
  count: number;
  min:   number;
  max:   number;
  avg:   number;
  p50:   number;
  p95:   number;
  p99:   number;
}

export interface WorkflowTrace {
  traceId:    string;
  workflowId: string;
  tenantId:   string;
  status:     'running' | 'ok' | 'error';
  startedAt:  number;
  endedAt:    number | null;
  durationMs: number | null;
  spans:      TraceSpan[];
}

export interface TraceSpan {
  spanId:     string;
  name:       string;
  kind:       string;
  status:     'running' | 'ok' | 'error';
  durationMs: number | null;
  error:      string | null;
}

// ── Enterprise ────────────────────────────────────────────────────────────────

export interface UsageSummary {
  tenantId:     string;
  requests:     number;
  tokens:       number;
  projects:     number;
  totalCostUsd?: number;
}

export interface Organization {
  orgId:     string;
  name:      string;
  plan:      string;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  tenantId:  string;
  name:      string;
  orgId:     string | null;
  plan:      string;
  status:    'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}
