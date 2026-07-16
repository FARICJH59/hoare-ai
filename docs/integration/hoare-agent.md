# HOARE Agent Integration

HOARE.ai exposes a governed, metered, tenant-isolated API surface for agents, workflows, domain tools, foundation models, governance, billing, audit logs, and sessions.

## Requirements

Every request must include authentication and an org context through `x-org-id`, `org_id`, or `orgId`. All routes enforce org isolation, governance checks, usage metering, audit logging, and metrics.

## Partner API contract

| Route | Method | Purpose |
| --- | --- | --- |
| `/agent/run` | POST | Run a governed autonomous agent. |
| `/workflow/execute` | POST | Execute a multi-step workflow definition. |
| `/tools/invoke` | POST | Invoke any domain or foundation tool by name. |
| `/foundation/generate` | POST | Generate text, code, plans, embeddings, simulations, or multimodal outputs. |
| `/governance/check` | GET | Check policy status for an action/resource. |
| `/billing/usage` | GET | Read org-scoped usage totals and records. |
| `/audit/logs` | GET | Read org-scoped audit logs. |
| `/session/state` | GET | Read org-scoped session state. |
| `/session/update` | POST | Update org-scoped session metadata. |
| `/api/devops/risk` | GET/POST | Read or run DevOps risk analysis. |

## Example

```bash
curl -X POST "$HOARE_API_URL/tools/invoke" \
  -H "Authorization: Bearer $HOARE_TOKEN" \
  -H "x-org-id: org_123" \
  -H "Content-Type: application/json" \
  -d '{"toolName":"energy.optimizeGrid","params":{"demandMw":120,"renewableMw":80}}'
```

## Node.js SDK sketch

```ts
import { HoareClient } from "@hoare-ai/sdk";

const client = new HoareClient({ baseUrl: process.env.HOARE_API_URL!, token: process.env.HOARE_TOKEN!, orgId: "org_123" });
const result = await client.invokeTool("foundation.generateText", { prompt: "Draft a grid risk summary" });
```

## Python SDK sketch

```py
from hoare_ai import HoareClient

client = HoareClient(base_url=HOARE_API_URL, token=HOARE_TOKEN, org_id="org_123")
result = client.invoke_tool("finance.riskModel", {"portfolioValue": 100000})
```

## Onboarding guide

1. Create or receive a partner API credential.
2. Map each customer tenant to a stable HOARE org ID.
3. Start with `/governance/check` and `/health` for readiness.
4. Use `/tools/invoke` for domain tools and `/workflow/execute` for chained operations.
5. Monitor `/metrics`, `/billing/usage`, `/audit/logs`, and `/api/devops/risk` during rollout.
