'use strict';

/**
 * Verification Agent
 *
 * Validates generated project artifacts for completeness and correctness.
 * Checks:
 *  - Required files are present
 *  - Architecture manifest schema
 *  - Kubernetes manifests have required fields
 *  - CI/CD workflows have required stages
 *  - Docker templates are valid
 */

const logger = require('../utils/logger');

const REQUIRED_ARTIFACT_KEYS = [
  'projectId', 'projectName', 'requestId', 'tenantId',
  'repoStructure', 'architectureManifest',
  'cicd', 'containers', 'kubernetes',
];

const REQUIRED_MANIFEST_FIELDS = [
  'schemaVersion', 'project', 'capabilities', 'infrastructure',
  'deployment', 'workflow', 'security', 'observability',
];

/**
 * Runs a named check and records pass/fail.
 * @param {string} name
 * @param {Function} fn
 * @returns {{ name: string, passed: boolean, detail: string }}
 */
function runCheck(name, fn) {
  try {
    const result = fn();
    return { name, passed: result === true || result === undefined, detail: typeof result === 'string' ? result : 'ok' };
  } catch (err) {
    return { name, passed: false, detail: err.message };
  }
}

class VerificationAgent {
  /**
   * @param {object} [options]
   * @param {object} [options.auditLog]
   */
  constructor(options = {}) {
    this.auditLog = options.auditLog || null;
  }

  /**
   * Verifies all generated artifacts.
   * @param {object} artifacts - Output from ProjectFactoryAgent.generate()
   * @returns {{ passed: boolean, score: number, checks: object[] }}
   */
  verify(artifacts) {
    const { requestId = 'unknown', tenantId = 'unknown' } = artifacts;
    logger.info('VerificationAgent', 'Starting verification', { requestId });

    const checks = [
      // Top-level structure
      runCheck('artifact-keys-present', () => {
        const missing = REQUIRED_ARTIFACT_KEYS.filter(k => !(k in artifacts));
        if (missing.length > 0) throw new Error(`Missing keys: ${missing.join(', ')}`);
      }),

      // Architecture manifest
      runCheck('architecture-manifest-schema', () => {
        const m = artifacts.architectureManifest;
        if (!m) throw new Error('architectureManifest missing');
        const missing = REQUIRED_MANIFEST_FIELDS.filter(f => !(f in m));
        if (missing.length > 0) throw new Error(`Manifest missing: ${missing.join(', ')}`);
      }),

      // CI workflow
      runCheck('ci-workflow-content', () => {
        const ci = artifacts.cicd && artifacts.cicd.ci;
        if (!ci || !ci.content) throw new Error('CI workflow content missing');
        if (!ci.content.includes('npm test') && !ci.content.includes('npm run test')) {
          throw new Error('CI workflow must include test step');
        }
      }),

      // CD workflow
      runCheck('cd-workflow-content', () => {
        const cd = artifacts.cicd && artifacts.cicd.cd;
        if (!cd || !cd.content) throw new Error('CD workflow content missing');
        if (!cd.content.includes('deploy')) throw new Error('CD workflow must include deploy step');
      }),

      // Dockerfile
      runCheck('dockerfile-content', () => {
        const df = artifacts.containers && artifacts.containers.dockerfile;
        if (!df || !df.content) throw new Error('Dockerfile content missing');
        if (!df.content.includes('FROM')) throw new Error('Dockerfile must have FROM directive');
        if (!df.content.includes('HEALTHCHECK')) throw new Error('Dockerfile must have HEALTHCHECK');
      }),

      // Docker Compose
      runCheck('docker-compose-content', () => {
        const dc = artifacts.containers && artifacts.containers.dockerCompose;
        if (!dc || !dc.content) throw new Error('docker-compose content missing');
        if (!dc.content.includes('services:')) throw new Error('docker-compose must define services');
      }),

      // Kubernetes deployment
      runCheck('k8s-deployment-content', () => {
        const kd = artifacts.kubernetes && artifacts.kubernetes.deployment;
        if (!kd || !kd.content) throw new Error('K8s deployment content missing');
        if (!kd.content.includes('kind: Deployment')) throw new Error('K8s manifest must declare Deployment kind');
        if (!kd.content.includes('livenessProbe')) throw new Error('K8s deployment must have livenessProbe');
      }),

      // Kubernetes service
      runCheck('k8s-service-content', () => {
        const ks = artifacts.kubernetes && artifacts.kubernetes.service;
        if (!ks || !ks.content) throw new Error('K8s service content missing');
        if (!ks.content.includes('kind: Service')) throw new Error('K8s manifest must declare Service kind');
      }),

      // Repo structure
      runCheck('repo-structure-dirs', () => {
        const rs = artifacts.repoStructure;
        if (!rs || !Array.isArray(rs.directories) || rs.directories.length === 0) {
          throw new Error('Repo structure must have directories');
        }
        if (!rs.directories.includes('src')) throw new Error('Repo structure must include src/');
      }),

      // Project name safety
      runCheck('project-name-safe', () => {
        const name = artifacts.projectName;
        if (!name || typeof name !== 'string') throw new Error('projectName missing');
        if (!/^[a-z0-9-]{1,40}$/.test(name)) throw new Error(`Unsafe project name: ${name}`);
      }),
    ];

    const passed     = checks.filter(c => c.passed).length;
    const total      = checks.length;
    const score      = Math.round((passed / total) * 100);
    const allPassed  = passed === total;

    logger.info('VerificationAgent', 'Verification complete', {
      requestId, score, passed, total, allPassed,
    });

    if (this.auditLog) {
      this.auditLog.record({
        event: 'VERIFICATION_COMPLETE',
        requestId,
        tenantId,
        score,
        passed,
        total,
        allPassed,
      });
    }

    return { passed: allPassed, score, checks, requestId };
  }
}

module.exports = { VerificationAgent };
