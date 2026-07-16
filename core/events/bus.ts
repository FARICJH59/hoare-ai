
import { createId, type JsonRecord } from "../types";

export interface EventEnvelope {
  id: string;
  namespace: "events.bus";
  type: string;
  domain?: string;
  payload: JsonRecord;
  createdAt: string;
}

const events: EventEnvelope[] = [];

export function publishEvent(type: string, payload: JsonRecord = {}, domain?: string): EventEnvelope {
  const event: EventEnvelope = { id: createId("evt"), namespace: "events.bus", type, domain, payload, createdAt: new Date().toISOString() };
  events.push(event);
  return event;
}

export function listEvents(domain?: string) {
  const items = domain ? events.filter((event) => event.domain === domain) : events;
  return { namespace: "events.bus", count: items.length, items };
}
