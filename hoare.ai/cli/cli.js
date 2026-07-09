#!/usr/bin/env node
'use strict';

/**
 * HOARE.ai CLI Interface
 *
 * Commands:
 *   generate <prompt>   - Run the full pipeline and print artifacts summary
 *   status              - Show runtime status
 *   audit               - Show recent audit log entries
 *   version             - Show runtime version
 */

const { HoareRuntime } = require('../index');

const COMMANDS = ['generate', 'status', 'audit', 'version', 'help'];

function printHelp() {
  process.stdout.write(`
HOARE.ai Project Factory CLI

Usage:
  hoare generate "<prompt>"       Run the full project factory pipeline
  hoare generate "<prompt>" --submit    Also submit workflow to QGPS
  hoare status                    Show runtime status
  hoare audit                     Show recent audit log entries
  hoare version                   Show runtime version
  hoare help                      Show this help

Options:
  --tenant <id>     Set tenant ID (default: "default")
  --log-level <l>   Set log level: DEBUG|INFO|WARN|ERROR (default: WARN)
  --submit          Submit workflow to QGPS Control Plane
  --monitor         Start monitoring after QGPS submission

Examples:
  hoare generate "Build a fintech payment API with auth and postgres"
  hoare generate "SaaS platform with multi-tenancy" --tenant acme --submit
  hoare status
  hoare audit
`);
}

function parseArgs(argv) {
  const args   = argv.slice(2);
  const opts   = { logLevel: 'WARN', tenant: 'default', submit: false, monitor: false };
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--tenant'   && args[i + 1]) { opts.tenant   = args[++i]; }
    else if (arg === '--log-level' && args[i + 1]) { opts.logLevel = args[++i].toUpperCase(); }
    else if (arg === '--submit')  { opts.submit  = true; }
    else if (arg === '--monitor') { opts.monitor = true; }
    else { positional.push(arg); }
  }

  return { command: positional[0], rest: positional.slice(1), opts };
}

async function main() {
  const { command, rest, opts } = parseArgs(process.argv);

  if (!command || command === 'help') {
    printHelp();
    return;
  }

  if (command === 'version') {
    const pkg = require('../package.json');
    process.stdout.write(`hoare-ai-runtime v${pkg.version}\n`);
    return;
  }

  const runtime = new HoareRuntime({
    tenantId:  opts.tenant,
    logLevel:  opts.logLevel,
    persistMemory: false, // CLI sessions use in-memory only by default
  });

  if (command === 'status') {
    process.stdout.write(JSON.stringify(runtime.status(), null, 2) + '\n');
    return;
  }

  if (command === 'audit') {
    const entries = runtime.auditLog.tail(20);
    process.stdout.write(JSON.stringify(entries, null, 2) + '\n');
    return;
  }

  if (command === 'generate') {
    const prompt = rest.join(' ');
    if (!prompt) {
      process.stderr.write('Error: prompt is required. Usage: hoare generate "<prompt>"\n');
      process.exit(1);
    }

    process.stderr.write(`\nRunning pipeline for prompt: "${prompt}"\n\n`);

    let result;
    try {
      result = await runtime.run(prompt, { source: 'cli' }, {
        submit:  opts.submit,
        monitor: opts.monitor,
      });
    } catch (err) {
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(1);
    }

    const { artifacts, verification, intent, plan } = result;

    // Print a human-readable summary
    const summary = {
      project: {
        name:       artifacts.projectName,
        id:         artifacts.projectId,
        industry:   intent.industry.primary,
        complexity: intent.complexity.level,
      },
      capabilities:   intent.capabilities,
      infrastructure: intent.infrastructure.map(i => `${i.service} (${i.type})`),
      deployment: {
        strategy:     plan.deploymentPlan.strategy,
        replicas:     plan.deploymentPlan.replicas,
        environments: plan.deploymentPlan.environments,
      },
      workflow: {
        id:    plan.workflowId,
        tasks: plan.workflowGraph.metadata.totalTasks,
      },
      verification: {
        passed: verification.passed,
        score:  `${verification.score}%`,
        failed: verification.checks.filter(c => !c.passed).map(c => `${c.name}: ${c.detail}`),
      },
      artifacts: {
        ciWorkflow:    artifacts.cicd.ci.filename,
        cdWorkflow:    artifacts.cicd.cd.filename,
        dockerfile:    artifacts.containers.dockerfile.filename,
        dockerCompose: artifacts.containers.dockerCompose.filename,
        k8sDeployment: artifacts.kubernetes.deployment.filename,
        k8sService:    artifacts.kubernetes.service.filename,
        k8sHPA:        artifacts.kubernetes.hpa ? artifacts.kubernetes.hpa.filename : null,
      },
    };

    if (opts.submit && result.submission) {
      summary.submission = result.submission;
    }

    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    return;
  }

  process.stderr.write(`Unknown command: ${command}\nRun "hoare help" for usage.\n`);
  process.exit(1);
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
