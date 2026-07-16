
import type { JsonRecord } from "../../types";
import { getTemplate } from "./registry";
export function applyTemplate(templateName?: string, templateConfig: JsonRecord = {}) { return { namespace: "usecases.templates.engine", template: getTemplate(templateName), templateConfig }; }
