// Placeholder documentation for the external HOARE-AGENT verification engine.
// Once HOARE-AGENT is available as a proper package (npm or local path),
// replace the ts-ignore in agent.ts and the VerificationResult type below
// with the real types from that package.

export type VerificationResult = {
  verified: boolean;
  timestamp: string;
  details: unknown;
};
