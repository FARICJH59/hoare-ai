import { Tool } from "./index";

export interface QuantumCircuit {
  qubits: number;
  gates: QuantumGate[];
}

export interface QuantumGate {
  type: "H" | "X" | "Y" | "Z" | "CNOT" | "T" | "S" | "RZ" | "RX" | "RY";
  targets: number[];
  controls?: number[];
  angle?: number;
}

export interface QuantumSimulationResult {
  statevector: Array<{ amplitude: [number, number]; probability: number }>;
  measurements: number[];
  shots: number;
  circuitDepth: number;
}

export interface QuantumOptimizationResult {
  optimalValue: number;
  optimalParams: number[];
  iterations: number;
  convergenceHistory: number[];
}

function complexMagnitudeSquared(re: number, im: number): number {
  return re * re + im * im;
}

function simulateStatevector(circuit: QuantumCircuit): Array<{ amplitude: [number, number]; probability: number }> {
  const dim = 1 << circuit.qubits;
  // Initialize |0...0> state
  const re: number[] = new Array(dim).fill(0);
  const im: number[] = new Array(dim).fill(0);
  re[0] = 1;

  for (const gate of circuit.gates) {
    const target = gate.targets[0];
    if (gate.type === "H") {
      const inv = 1 / Math.SQRT2;
      for (let i = 0; i < dim; i++) {
        const bit = (i >> target) & 1;
        const partner = i ^ (1 << target);
        if (bit === 0 && i < partner) {
          const r0 = re[i], i0 = im[i];
          const r1 = re[partner], i1 = im[partner];
          re[i] = inv * (r0 + r1);
          im[i] = inv * (i0 + i1);
          re[partner] = inv * (r0 - r1);
          im[partner] = inv * (i0 - i1);
        }
      }
    } else if (gate.type === "X") {
      for (let i = 0; i < dim; i++) {
        const partner = i ^ (1 << target);
        if (i < partner) {
          [re[i], re[partner]] = [re[partner], re[i]];
          [im[i], im[partner]] = [im[partner], im[i]];
        }
      }
    }
    // Additional gates left as identity for simulation scaffold
  }

  return re.map((r, idx) => ({
    amplitude: [r, im[idx]] as [number, number],
    probability: complexMagnitudeSquared(r, im[idx]),
  }));
}

function measureStatevector(sv: Array<{ probability: number }>, shots: number): number[] {
  const measurements: number[] = [];
  const probs = sv.map((s) => s.probability);
  for (let i = 0; i < shots; i++) {
    let rand = Math.random();
    for (let j = 0; j < probs.length; j++) {
      rand -= probs[j];
      if (rand <= 0) {
        measurements.push(j);
        break;
      }
    }
  }
  return measurements;
}

export const quantumSimulateTool: Tool = {
  name: "quantum-simulate",
  description: "Simulate a quantum circuit and return statevector and measurement outcomes.",
  async execute(params) {
    const circuit = (params.circuit as QuantumCircuit | undefined) ?? {
      qubits: 2,
      gates: [{ type: "H" as const, targets: [0] }, { type: "CNOT" as const, targets: [1], controls: [0] }],
    };
    const shots = (params.shots as number | undefined) ?? 1024;

    const statevector = simulateStatevector(circuit);
    const measurements = measureStatevector(statevector, shots);
    const depth = circuit.gates.length;

    const result: QuantumSimulationResult = {
      statevector,
      measurements,
      shots,
      circuitDepth: depth,
    };
    return result;
  },
};

export const quantumOptimizeTool: Tool = {
  name: "quantum-optimize",
  description: "Run a variational quantum eigensolver (VQE)-style optimization loop.",
  async execute(params) {
    const iterations = (params.iterations as number | undefined) ?? 50;
    const paramCount = (params.paramCount as number | undefined) ?? 4;

    const convergenceHistory: number[] = [];
    let optimalParams: number[] = Array.from({ length: paramCount }, () => Math.random() * 2 * Math.PI);
    let optimalValue = Infinity;

    for (let i = 0; i < iterations; i++) {
      // Simulated energy expectation value (Rosenbrock-inspired landscape)
      const value = optimalParams.reduce((acc, p, idx) => {
        const next = optimalParams[idx + 1] ?? 0;
        return acc + 100 * (next - p * p) ** 2 + (p - 1) ** 2;
      }, 0);

      convergenceHistory.push(value);
      if (value < optimalValue) {
        optimalValue = value;
      }

      // Gradient-free update (random perturbation)
      optimalParams = optimalParams.map((p) => p + (Math.random() - 0.5) * 0.1);
    }

    const result: QuantumOptimizationResult = {
      optimalValue,
      optimalParams,
      iterations,
      convergenceHistory,
    };
    return result;
  },
};

export const quantumHybridWorkflowTool: Tool = {
  name: "quantum.hybridWorkflow",
  description: "Run a hybrid classical/quantum workflow with simulation and optimization stages.",
  async execute(params) {
    const simulation = await quantumSimulateTool.execute(params);
    const optimization = await quantumOptimizeTool.execute({ iterations: (params.iterations as number | undefined) ?? 12, paramCount: 4 });
    return { simulation, optimization, orchestration: "hybrid", governed: true };
  },
};

export const quantumTools: Tool[] = [quantumSimulateTool, quantumOptimizeTool, quantumHybridWorkflowTool];
