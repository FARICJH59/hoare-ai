import type { Tool } from "../../tools";
import { assertGoverned, applyGovernanceDowngrade } from "./governance";
import { meterUsage, BillingMeter } from "./billing";
import { writeAuditLog } from "./audit";

export async function invokeGovernedTool(args: {
  orgId: string;
  actorId?: string;
  tool: Tool;
  params: Record<string, unknown>;
  source?: string;
  meter?: BillingMeter;
}): Promise<unknown> {
  const meter = args.meter ?? (args.tool.name.startsWith("foundation.") ? "foundation_model_call" : "tool_invocation");
  const decision = assertGoverned({ orgId: args.orgId, actorId: args.actorId, action: "tool.invoke", resource: args.tool.name, metadata: args.params });
  const governedParams = applyGovernanceDowngrade(args.params, decision);
  const result = await args.tool.execute(governedParams);
  meterUsage({ orgId: args.orgId, actorId: args.actorId, meter, source: args.source ?? "tool", sourceId: args.tool.name, metadata: { tool: args.tool.name, governanceDecision: decision.decision } });
  writeAuditLog({ org_id: args.orgId, actor_id: args.actorId, action: "tool.invoke", resource_type: args.tool.name, decision: decision.decision, metadata: { meter } });
  return result;
}

export function governedTool(orgId: string, actorId: string | undefined, tool: Tool): Tool {
  return {
    ...tool,
    async execute(params: Record<string, unknown>): Promise<unknown> {
      return invokeGovernedTool({ orgId, actorId, tool, params, source: "agent_tool" });
    },
  };
}
