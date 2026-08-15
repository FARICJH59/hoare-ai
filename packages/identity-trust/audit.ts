import type { HoareIdentity } from "./types";

export interface IdentityAuditEvent {
  eventType: "identity.resolved" | "authorization.allowed" | "authorization.denied";
  timestamp: string;
  subject: string;
  tenantId?: string;
  identityType: HoareIdentity["identityType"];
  provider: string;
  action?: string;
  resource?: string;
  decision?: "allow" | "deny";
  reason?: string;
  correlationId?: string;
  source?: string;
}

export interface IdentityAuditSink {
  write(event: IdentityAuditEvent): Promise<void> | void;
}

export class MemoryIdentityAuditSink implements IdentityAuditSink {
  readonly events: IdentityAuditEvent[] = [];

  write(event: IdentityAuditEvent): void {
    this.events.push(Object.freeze({ ...event }));
  }
}

export function createIdentityAuditEvent(
  identity: HoareIdentity,
  input: Omit<IdentityAuditEvent, "timestamp" | "subject" | "tenantId" | "identityType" | "provider" | "correlationId" | "source">,
): IdentityAuditEvent {
  return {
    ...input,
    timestamp: new Date().toISOString(),
    subject: identity.subject,
    tenantId: identity.tenantId,
    identityType: identity.identityType,
    provider: identity.provider,
    correlationId: identity.auditContext?.correlationId,
    source: identity.auditContext?.source,
  };
}
