import { Tool } from "../../tools";
import { assertGoverned } from "./governance";
import { meterUsage, BillingMeter } from "./billing";
import { writeAuditLog } from "./audit";

export async function invokeGovernedTool(args: {
  orgId: string;
  actor?: string;
  tool: Tool;
  params: Record<string, unknown>;
  meter?: BillingMeter;
}): Promise<unknown> {
  const { orgId, actor, tool, params, meter = tool.name.startsWith("foundation.") ? "foundation_model_call" : "tool_invocation" } = args;
  const decision = assertGoverned({ orgId, action: "tool.invoke", resource: tool.name, metadata: params });
  const result = await tool.execute(params);
  meterUsage(orgId, meter, 1, { tool: tool.name });
  writeAuditLog({ orgId, actor, action: "tool.invoke", resource: tool.name, metadata: { governed: decision.allowed } });
  return result;
}
