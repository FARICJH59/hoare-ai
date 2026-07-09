# Tools Reference

All tools share the same interface:

```typescript
interface Tool {
  name: string;           // Unique tool identifier
  description: string;    // Human-readable purpose
  execute(params: Record<string, unknown>): Promise<unknown>;
}
```

---

## Quantum Compute (`tools/quantum-compute.ts`)

### `quantum-simulate`

Simulate a quantum circuit using a statevector model and return measurement outcomes.

**Params**

| Field | Type | Default | Description |
|---|---|---|---|
| `circuit` | `QuantumCircuit` | Bell-state circuit | Circuit definition |
| `shots` | `number` | `1024` | Number of measurement samples |

**QuantumCircuit**

```json
{
  "qubits": 2,
  "gates": [
    { "type": "H", "targets": [0] },
    { "type": "CNOT", "targets": [1], "controls": [0] }
  ]
}
```

Supported gate types: `H`, `X`, `Y`, `Z`, `CNOT`, `T`, `S`, `RZ`, `RX`, `RY`.

**Returns** `QuantumSimulationResult`

```json
{
  "statevector": [{ "amplitude": [0.707, 0], "probability": 0.5 }, ...],
  "measurements": [0, 3, 0, 3, ...],
  "shots": 1024,
  "circuitDepth": 2
}
```

---

### `quantum-optimize`

Run a variational parameter-sweep optimisation loop (VQE-style).

**Params**

| Field | Type | Default |
|---|---|---|
| `iterations` | `number` | `50` |
| `paramCount` | `number` | `4` |

**Returns** `QuantumOptimizationResult`

```json
{
  "optimalValue": 0.0012,
  "optimalParams": [1.01, 0.99, 1.00, 1.00],
  "iterations": 50,
  "convergenceHistory": [12.3, 8.1, ...]
}
```

---

## Finance (`tools/finance.ts`)

### `finance-market-data`

Fetch simulated real-time market data for one or more ticker symbols.

**Params**

| Field | Type | Default |
|---|---|---|
| `symbols` | `string[]` | `["AAPL","GOOG","MSFT"]` |

**Returns** `MarketData[]`

---

### `finance-portfolio-analysis`

Analyse a set of portfolio positions — compute market values and unrealised P&L.

**Params**

| Field | Type | Description |
|---|---|---|
| `positions` | `Array<{symbol, quantity, avgCost}>` | Position list |

**Returns** `PortfolioPosition[]`

---

### `finance-risk-analysis`

Compute risk metrics: daily VaR, Sharpe ratio, beta, and max drawdown.

**Params**

| Field | Type | Default |
|---|---|---|
| `portfolioValue` | `number` | `100000` |
| `confidence` | `number` | `0.95` |

**Returns** `RiskMetrics`

---

## Robotics (`tools/robotics.ts`)

### `robotics-status`

Query the live state of a robot (position, orientation, joints, battery).

**Params**

| Field | Type | Default |
|---|---|---|
| `robotId` | `string` | `"robot-1"` |

**Returns** `RobotState`

---

### `robotics-command`

Send a motion or gripper command to a robot.

**Params**

| Field | Type | Description |
|---|---|---|
| `robotId` | `string` | Target robot |
| `command` | `RobotCommand` | `{ type, params }` |

Command types: `move`, `rotate`, `grasp`, `release`, `home`, `stop`, `execute-trajectory`.

---

### `robotics-trajectory-plan`

Plan a collision-free path from the robot's current position to a goal.

**Params**

| Field | Type | Default |
|---|---|---|
| `robotId` | `string` | `"robot-1"` |
| `goal` | `{x, y, z}` | `{x:5, y:5, z:0}` |

**Returns** `TrajectoryPlan`

---

## Machine Learning (`tools/ml.ts`)

### `ml-train`

Train a model (classification, regression, clustering, or embedding) and return per-epoch history.

**Params**

| Field | Type | Default |
|---|---|---|
| `modelType` | `string` | `"classification"` |
| `epochs` | `number` | `10` |
| `learningRate` | `number` | `0.001` |
| `batchSize` | `number` | `32` |
| `hiddenLayers` | `number[]` | `[128, 64]` |

**Returns** `TrainingResult`

---

### `ml-inference`

Run inference on a trained model.

**Params**

| Field | Type | Default |
|---|---|---|
| `modelId` | `string` | `"model-default"` |
| `input` | `number[]` | `[0.5,0.3,0.8,0.1]` |

**Returns** `InferenceResult` (prediction class index + confidence)

---

### `ml-embedding`

Generate a dense vector embedding for a text string.

**Params**

| Field | Type | Default |
|---|---|---|
| `text` | `string` | `""` |
| `dimensions` | `number` | `128` |

**Returns** `EmbeddingResult`
