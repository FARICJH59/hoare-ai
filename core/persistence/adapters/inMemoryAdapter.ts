
import { InMemoryStore } from "../../shared/store";
import type { JsonRecord } from "../../types";
export const inMemoryPersistenceAdapter = new InMemoryStore<JsonRecord>();
