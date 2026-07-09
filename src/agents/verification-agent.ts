/**
 * Verification Agent
 * Validates generated project artifacts for completeness and correctness.
 */

import type { ProjectArtifacts } from './project-factory-agent';

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface VerificationResult {
  requestId: string;
  passed: boolean;
  score: number;
  checks: CheckResult[];
  verifiedAt: string;
}

function runCheck(name: string, fn: () => boolean | string | void): CheckResult {
  try {
    const result = fn();
    return { name, passed: result !== false, detail: typeof result === 'string' ? result : 'ok' };
  } catch (err) {
    return { name, passed: false, detail: (err as Error).message };
  }
}

export class VerificationAgent {
  verify(artifacts: ProjectArtifacts): VerificationResult {
    const checks: CheckResult[] = [
      runCheck('has-project-id',         () => !!artifacts.projectId),
      runCheck('has-project-name',       () => !!artifacts.projectName && artifacts.projectName.length > 0),
      runCheck('has-repo-structure',     () => !!artifacts.repoStructure && artifacts.repoStructure.directories.length > 0),
      runCheck('has-arch-manifest',      () => !!artifacts.architectureManifest?.schemaVersion),
      runCheck('has-dockerfile',         () => artifacts.containers.dockerfile.includes('FROM node:')),
      runCheck('has-ci-pipeline',        () => artifacts.cicd.ci.includes('on:')),
      runCheck('has-api-spec',           () => !!artifacts.apiSpec?.openapi),
      runCheck('has-deployment-plan',    () => artifacts.deploymentPlan.length > 50),
      runCheck('capabilities-present',   () => artifacts.architectureManifest.capabilities.length > 0),
      runCheck('infrastructure-present', () => Array.isArray(artifacts.architectureManifest.infrastructure)),
    ];

    const passed = checks.filter(c => c.passed).length;
    const score  = Math.round((passed / checks.length) * 100);

    return {
      requestId:  artifacts.requestId,
      passed:     score >= 80,
      score,
      checks,
      verifiedAt: new Date().toISOString(),
    };
  }
}
