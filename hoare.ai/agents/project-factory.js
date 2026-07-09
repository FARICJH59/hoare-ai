'use strict';

/**
 * Project Factory Agent
 *
 * Responsibilities:
 *  - Generate repository structures
 *  - Create architecture manifests
 *  - Create CI/CD workflows
 *  - Create Docker/Kubernetes templates
 */

const { generateProjectId } = require('../utils/id-generator');
const logger = require('../utils/logger');
const {
  generateRepoStructure,
  generateArchitectureManifest,
  generateGithubActionsCI,
  generateGithubActionsCD,
  generateDockerfile,
  generateDockerCompose,
  generateK8sDeployment,
  generateK8sService,
  generateK8sHPA,
} = require('../templates/generators');

/**
 * Derives a URL-safe project name from the normalized prompt.
 * @param {string} prompt
 * @param {string} industry
 * @returns {string}
 */
function deriveProjectName(prompt, industry) {
  const words = prompt.toLowerCase().split(/\s+/);
  // Pick first 2-3 meaningful words (>3 chars, skip stop words)
  const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'which', 'have', 'been', 'will', 'build', 'create', 'make', 'want', 'need', 'using', 'use']);
  const meaningful = words.filter(w => w.length > 3 && !stopWords.has(w));
  const nameParts = meaningful.slice(0, 2);
  if (nameParts.length === 0) nameParts.push(industry);
  return nameParts.join('-').replace(/[^a-z0-9-]/g, '').slice(0, 40) || `${industry}-app`;
}

class ProjectFactoryAgent {
  /**
   * @param {object} [options]
   * @param {object} [options.auditLog] - AuditLog instance
   * @param {object} [options.projectMemory] - ProjectMemory instance
   */
  constructor(options = {}) {
    this.auditLog      = options.auditLog      || null;
    this.projectMemory = options.projectMemory || null;
  }

  /**
   * Generates all project artifacts from a plan.
   *
   * @param {object} plan   - Result from PlannerAgent.plan()
   * @param {object} intent - Result from IntentAgent.analyze()
   * @param {object} envelope - Original request envelope
   * @returns {object} Generated project artifacts
   */
  generate(plan, intent, envelope) {
    const { requestId, tenantId, normalizedPrompt } = envelope;
    const projectId   = generateProjectId();
    const projectName = deriveProjectName(normalizedPrompt, intent.industry.primary);

    logger.info('ProjectFactoryAgent', 'Generating project artifacts', { requestId, projectId, projectName });

    // 1. Repository structure
    const repoStructure = generateRepoStructure({
      projectName,
      capabilities: intent.capabilities,
      industry: intent.industry.primary,
    });

    // 2. Architecture manifest
    const architectureManifest = generateArchitectureManifest({
      projectName,
      intent,
      plan,
      tenantId,
    });

    // 3. CI/CD workflows
    const hasDocker      = true;
    const ciWorkflow     = generateGithubActionsCI({ projectName, hasDocker });
    const cdWorkflow     = generateGithubActionsCD({
      projectName,
      environments: plan.deploymentPlan.environments,
    });

    // 4. Container templates
    const dockerfile       = generateDockerfile({ nodeVersion: '20', port: 3000 });
    const dockerCompose    = generateDockerCompose({
      projectName,
      infrastructure: intent.infrastructure,
      appPort: 3000,
    });

    // 5. Kubernetes manifests
    const k8sDeployment  = generateK8sDeployment({
      projectName,
      replicas: plan.deploymentPlan.replicas,
      port: 3000,
      resourceLimits: plan.deploymentPlan.resourceLimits,
    });
    const k8sService       = generateK8sService({ projectName, port: 3000 });
    const k8sHPA           = plan.deploymentPlan.autoscale
      ? generateK8sHPA({ projectName, minReplicas: plan.deploymentPlan.replicas, maxReplicas: plan.deploymentPlan.replicas * 3 })
      : null;

    const artifacts = {
      projectId,
      projectName,
      requestId,
      tenantId,
      workflowId: plan.workflowId,
      repoStructure,
      architectureManifest,
      cicd: {
        ci: { filename: '.github/workflows/ci.yml',     content: ciWorkflow },
        cd: { filename: '.github/workflows/deploy.yml', content: cdWorkflow },
      },
      containers: {
        dockerfile:   { filename: 'Dockerfile',           content: dockerfile },
        dockerCompose:{ filename: 'docker-compose.yml',   content: dockerCompose },
      },
      kubernetes: {
        deployment: { filename: 'k8s/deployment.yaml',  content: k8sDeployment },
        service:    { filename: 'k8s/service.yaml',      content: k8sService },
        hpa:        k8sHPA ? { filename: 'k8s/hpa.yaml', content: k8sHPA } : null,
      },
      generatedAt: new Date().toISOString(),
    };

    // Persist to project memory if available
    if (this.projectMemory) {
      this.projectMemory.save({
        projectId,
        projectName,
        tenantId,
        requestId,
        workflowId: plan.workflowId,
        industry: intent.industry.primary,
        capabilities: intent.capabilities,
        complexity: intent.complexity.level,
        generatedAt: artifacts.generatedAt,
      });
    }

    logger.info('ProjectFactoryAgent', 'Project artifacts generated', {
      requestId,
      projectId,
      projectName,
      artifactCount: Object.keys(artifacts).length,
    });

    if (this.auditLog) {
      this.auditLog.record({
        event: 'PROJECT_GENERATED',
        requestId,
        tenantId,
        projectId,
        projectName,
      });
    }

    return artifacts;
  }
}

module.exports = { ProjectFactoryAgent, deriveProjectName };
