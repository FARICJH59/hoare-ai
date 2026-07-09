# HOARE.ai Prompt Receiver Agent

HOARE.ai is the Prompt Receiver Agent runtime that transforms natural-language project prompts into structured, executable workflows.

QGPS is the Autonomous Execution Control Plane used to submit generated workflows and track execution state.

## Architecture

- `agents/prompt-receiver.js`: entrypoint agent that normalizes prompts and routes to intent detection.
- `agents/intent-agent.js`: rule-based intent and capability detection with extension points for future LLM adapters.
- `agents/planner-agent.js`: workflow planner that maps intent into ordered implementation tasks.
- `gateway/qgps-client.js`: control-plane client wrapper with `submitWorkflow()` and `getWorkflowStatus()`.
- `capabilities/*.json`: industry capability registry packs.
- `workflows/*.json`: reusable workflow templates.
- `index.js`: runtime composition, startup lifecycle, and execution orchestration.

## Runtime features

- CommonJS-first modular implementation.
- Standardized agent contract: `start()`, `handle(input)`, `status()`.
- Structured JSON logging for operational observability.
- Error handling with explicit validation and failure propagation.
- Mock mode (`QGPS_MOCK_MODE=true`) for local/Termux testing.

## Environment variables

- `QGPS_URL`: Base URL for QGPS API (for non-mock mode)
- `QGPS_API_KEY`: ****** for QGPS API (for non-mock mode)
- `QGPS_MOCK_MODE`: `true`/`false` toggle (defaults to true if QGPS credentials are missing)
- `QGPS_TIMEOUT_MS`: Optional request timeout in milliseconds

## Scripts

- `npm start` – start runtime and process a test prompt.
- `npm test` – run runtime integration tests using Node test runner.

## Example prompt flow

Input:

```json
{
  "prompt": "Build an AI healthcare platform with patient analytics"
}
```

Output (intent stage):

```json
{
  "intent": "CREATE_APPLICATION",
  "industry": "healthcare",
  "capabilities": ["api", "database", "dashboard", "analytics"]
}
```

Then the planner transforms intent into workflow tasks and QGPS receives the submission payload.
