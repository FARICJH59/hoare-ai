
import { listEvents } from "./bus";

export function getEventStream(domain?: string) {
  return { ...listEvents(domain), namespace: domain ? "events.stream.domain" : "events.stream" };
}
