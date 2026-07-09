/**
 * Generate API Route
 * Full HOARE agent pipeline: intent → plan → artifacts → verification → QGPS
 */

import { type NextRequest, NextResponse } from 'next/server';
import { PromptReceiverAgent }   from '@/agents/prompt-receiver';
import { IntentAgent }           from '@/agents/intent-agent';
import { PlannerAgent }          from '@/agents/planner-agent';
import { ProjectFactoryAgent }   from '@/agents/project-factory-agent';
import { VerificationAgent }     from '@/agents/verification-agent';
import { QGPSClient }            from '@/gateway/qgps-client';
import { projectMemory }         from '@/memory';
import { knowledgeBase }         from '@/knowledge';
import { capabilitiesRegistry }  from '@/capabilities';
import { z }                     from 'zod';

const generateSchema = z.object({
  prompt:     z.string().min(5).max(10_000),
  sessionId:  z.string().optional(),
  userId:     z.string().optional(),
  submit:     z.boolean().default(false),
});

const promptReceiver    = new PromptReceiverAgent({ tenantId: 'default' });
const intentAgent       = new IntentAgent();
const plannerAgent      = new PlannerAgent();
const factoryAgent      = new ProjectFactoryAgent();
const verificationAgent = new VerificationAgent();
const qgpsClient        = new QGPSClient();

export async function POST(request: NextRequest) {
  try {
    const body   = await request.json() as unknown;
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { prompt, sessionId, userId, submit } = parsed.data;
    const sid = sessionId ?? `session-${Date.now()}`;
    const uid = userId    ?? 'anonymous';

    // ── Agent Pipeline ────────────────────────────────────────────────────────
    const envelope     = promptReceiver.receive(prompt, { userId: uid, sessionId: sid });
    const intent       = intentAgent.analyze(envelope);
    const plan         = plannerAgent.plan(intent);
    const artifacts    = factoryAgent.generate(plan, intent, envelope);
    const verification = verificationAgent.verify(artifacts);

    // ── Knowledge enrichment ──────────────────────────────────────────────────
    const knowledge = knowledgeBase.getPackForIndustry(intent.industry.primary);

    // ── Capability resolution ─────────────────────────────────────────────────
    const resolvedCaps = capabilitiesRegistry.resolveDependencies(intent.capabilities);
    const estimatedHours = capabilitiesRegistry.estimateTotalHours(resolvedCaps);

    // ── QGPS Submission (optional) ────────────────────────────────────────────
    let submission = null;
    if (submit && process.env.ENABLE_QGPS_SUBMISSION === 'true') {
      submission = await qgpsClient.submitWorkflow({
        workflowId: plan.workflowId,
        tenantId:   envelope.tenantId,
        tasks:      plan.tasks,
        artifacts:  { projectId: artifacts.projectId },
      });
    }

    // ── Persist to project memory ─────────────────────────────────────────────
    projectMemory.save({
      projectId:   artifacts.projectId,
      projectName: artifacts.projectName,
      industry:    intent.industry.primary,
      complexity:  intent.complexity.level,
      sessionId:   sid,
      artifacts:   artifacts as unknown as Record<string, unknown>,
      createdAt:   new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      requestId: envelope.requestId,
      sessionId: sid,
      result: {
        envelope: {
          requestId:  envelope.requestId,
          receivedAt: envelope.receivedAt,
        },
        intent: {
          industry:       intent.industry,
          capabilities:   intent.capabilities,
          complexity:     intent.complexity,
          infrastructure: intent.infrastructure,
        },
        plan: {
          workflowId:         plan.workflowId,
          selectedPacks:      plan.selectedPacks,
          techStack:          plan.techStack,
          deploymentStrategy: plan.deploymentStrategy,
          taskCount:          plan.tasks.length,
        },
        artifacts: {
          projectId:            artifacts.projectId,
          projectName:          artifacts.projectName,
          repoStructure:        artifacts.repoStructure,
          architectureManifest: artifacts.architectureManifest,
          deploymentPlan:       artifacts.deploymentPlan,
          apiSpec:              artifacts.apiSpec,
          containers:           artifacts.containers,
          cicd:                 artifacts.cicd,
        },
        verification,
        knowledge: knowledge
          ? {
              name:          knowledge.name,
              bestPractices: knowledge.bestPractices,
              patterns:      knowledge.patterns,
            }
          : null,
        meta: {
          resolvedCapabilities: resolvedCaps,
          estimatedSetupHours:  estimatedHours,
          submission,
        },
      },
    });
  } catch (err) {
    console.error('[generate] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', message: (err as Error).message },
      { status: 500 },
    );
  }
}
