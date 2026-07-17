import { createId, type JsonRecord } from "../types";
import { reliabilityHardening } from "../config/hardening/reliability";
import { getHardenedContext } from "../hardening/context";

export interface EventEnvelope {
  id: string;
  namespace: "events.bus" | "events.deadLetter";
  type: string;
  domain?: string;
  payload: JsonRecord;
  createdAt: string;
}

const events: EventEnvelope[] = [];
const deadLetters: EventEnvelope[] = [];

function pushBounded(target: EventEnvelope[], event: EventEnvelope, max: number) {
  if (target.length >= max) target.shift();
  target.push(event);
}

export function publishEvent(type: string, payload: JsonRecord = {}, domain?: string): EventEnvelope {
  const context = getHardenedContext({ metadata: payload });
  const event: EventEnvelope = {
    id: createId("evt"),
    namespace: "events.bus",
    type: type || "events.unknown",
    domain,
    payload: { ...payload, correlationId: payload.correlationId ?? context.correlationId, tenantId: payload.tenantId ?? context.tenantId },
    createdAt: new Date().toISOString(),
  };
  pushBounded(events, event, reliabilityHardening.eventBusMaxSize);
  return event;
}

export function publishDeadLetter(type: string, payload: JsonRecord = {}, domain?: string): EventEnvelope {
  const event: EventEnvelope = { id: createId("dlq"), namespace: "events.deadLetter", type, domain, payload, createdAt: new Date().toISOString() };
  pushBounded(deadLetters, event, reliabilityHardening.deadLetterMaxSize);
  return event;
}

export function listEvents(domain?: string) {
  const items = domain ? events.filter((event) => event.domain === domain) : events;
  return { namespace: "events.bus", count: items.length, deadLetterCount: deadLetters.length, items };
}

export function listDeadLetters() {
  return { namespace: "events.deadLetter", count: deadLetters.length, items: deadLetters };
}
