/**
 * Chat API Route — streaming chat endpoint with HOARE agent pipeline
 */

import { type NextRequest, NextResponse } from 'next/server';
import { PromptReceiverAgent }  from '@/agents/prompt-receiver';
import { IntentAgent }          from '@/agents/intent-agent';
import { PlannerAgent }         from '@/agents/planner-agent';
import { ProjectFactoryAgent }  from '@/agents/project-factory-agent';
import { VerificationAgent }    from '@/agents/verification-agent';
import { sessionMemory }        from '@/memory';
import { knowledgeBase }        from '@/knowledge';
import { z }                    from 'zod';

const chatSchema = z.object({
  message:   z.string().min(1).max(10_000),
  sessionId: z.string().optional(),
  userId:    z.string().optional(),
  mode:      z.enum(['chat', 'generate']).default('chat'),
});

const promptReceiver  = new PromptReceiverAgent({ tenantId: 'default' });
const intentAgent     = new IntentAgent();
const plannerAgent    = new PlannerAgent();
const factoryAgent    = new ProjectFactoryAgent();
const verificationAgent = new VerificationAgent();

/**
 * Constructs the streaming response text for a chat message.
 * If the mode is 'generate', runs the full agent pipeline.
 */
async function buildResponse(
  message: string,
  mode: 'chat' | 'generate',
  sessionId: string,
  userId: string,
): Promise<ReadableStream> {
  const openAiKey  = process.env.OPENAI_API_KEY;
  const openAiBase = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  const model      = process.env.OPENAI_MODEL     ?? 'gpt-4o';

  // Run HOARE agent pipeline for intent analysis (always)
  const envelope  = promptReceiver.receive(message, { userId, sessionId });
  const intent    = intentAgent.analyze(envelope);
  const knowledge = knowledgeBase.getPackForIndustry(intent.industry.primary);

  if (mode === 'generate') {
    // Full pipeline: plan + generate + verify
    const plan         = plannerAgent.plan(intent);
    const artifacts    = factoryAgent.generate(plan, intent, envelope);
    const verification = verificationAgent.verify(artifacts);

    const result = {
      type: 'generation',
      intent,
      plan,
      artifacts,
      verification,
    };

    const text = formatGenerationResponse(result, knowledge);
    return streamText(text);
  }

  // Chat mode: use LLM if configured, else local pipeline response
  if (openAiKey) {
    return streamFromOpenAI(message, intent, knowledge, openAiKey, openAiBase, model, sessionId);
  }

  // Fallback: local intelligent response
  const response = buildLocalResponse(message, intent, knowledge);
  return streamText(response);
}

function formatGenerationResponse(
  result: { intent: ReturnType<IntentAgent['analyze']>; plan: ReturnType<PlannerAgent['plan']>; artifacts: ReturnType<ProjectFactoryAgent['generate']>; verification: ReturnType<VerificationAgent['verify']> },
  knowledge: ReturnType<typeof knowledgeBase.getPackForIndustry>,
): string {
  const { intent, plan, artifacts, verification } = result;
  const lines: string[] = [
    `## 🏗️ Project Generated: **${artifacts.projectName}**`,
    '',
    `**Industry:** ${intent.industry.primary}  |  **Complexity:** ${intent.complexity.level}  |  **Estimated:** ${intent.complexity.estimatedWeeks} weeks`,
    '',
    '### 📦 Capabilities Detected',
    intent.capabilities.map(c => `- \`${c}\``).join('\n'),
    '',
    '### 🏛️ Architecture',
    '```json',
    JSON.stringify(artifacts.architectureManifest, null, 2),
    '```',
    '',
    '### 📁 Repository Structure',
    artifacts.repoStructure.directories.map(d => `- \`${d}/\``).join('\n'),
    '',
    '### 🚀 Deployment Plan',
    artifacts.deploymentPlan,
    '',
    '### ✅ Verification',
    `Score: **${verification.score}/100** — ${verification.passed ? '✅ Passed' : '⚠️ Needs Review'}`,
    verification.checks.map(c => `- ${c.passed ? '✅' : '❌'} ${c.name}: ${c.detail}`).join('\n'),
  ];

  if (knowledge) {
    lines.push('', `### 💡 ${knowledge.name} Recommendations`);
    lines.push(...knowledge.bestPractices.slice(0, 3).map(p => `- ${p}`));
  }

  return lines.join('\n');
}

function buildLocalResponse(
  message: string,
  intent: ReturnType<IntentAgent['analyze']>,
  knowledge: ReturnType<typeof knowledgeBase.getPackForIndustry>,
): string {
  const lines = [
    `I've analyzed your request and detected the following intent:`,
    '',
    `**Industry:** ${intent.industry.primary}`,
    `**Capabilities needed:** ${intent.capabilities.join(', ')}`,
    `**Complexity:** ${intent.complexity.level} (~${intent.complexity.estimatedWeeks} weeks)`,
    '',
    'To generate a complete project with architecture diagrams, repository structure, and deployment plans, type your request like:',
    '',
    '> *"Build me a healthcare AI platform with patient management and telemedicine"*',
    '',
    'Or switch to **Generate Mode** using the toggle above the input.',
  ];

  if (knowledge) {
    lines.push('', `**${knowledge.name} tip:** ${knowledge.bestPractices[0]}`);
  }

  return lines.join('\n');
}

async function streamFromOpenAI(
  message: string,
  intent: ReturnType<IntentAgent['analyze']>,
  knowledge: ReturnType<typeof knowledgeBase.getPackForIndustry>,
  apiKey: string,
  baseUrl: string,
  model: string,
  sessionId: string,
): Promise<ReadableStream> {
  const systemPrompt = [
    'You are HOARE.ai, an enterprise AI assistant specialized in software architecture, system design, and technical planning.',
    `The user is building a ${intent.industry.primary} application.`,
    `Detected capabilities: ${intent.capabilities.join(', ')}.`,
    knowledge ? `Relevant best practices: ${knowledge.bestPractices.slice(0, 3).join('; ')}.` : '',
    'Be concise, technical, and actionable. Use Markdown formatting.',
  ].filter(Boolean).join('\n');

  const session = sessionMemory.get(sessionId);
  const historyMessages = session?.messages.slice(-10).map(m => ({
    role: m.role,
    content: m.content,
  })) ?? [];

  const body = JSON.stringify({
    model,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: message },
    ],
    max_tokens: 2048,
    temperature: 0.7,
  });

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `******
    },
    body,
  });

  if (!upstream.ok || !upstream.body) {
    throw new Error(`OpenAI request failed: ${upstream.status}`);
  }

  const decoder = new TextDecoder();
  const upstreamBody = upstream.body;

  return new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          for (const line of text.split('\n')) {
            const trimmed = line.replace(/^data: /, '').trim();
            if (!trimmed || trimmed === '[DONE]') continue;
            try {
              const json = JSON.parse(trimmed) as { choices?: Array<{ delta?: { content?: string } }> };
              const content = json.choices?.[0]?.delta?.content;
              if (content) controller.enqueue(new TextEncoder().encode(content));
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });
}

function streamText(text: string): ReadableStream {
  const words = text.split(/(\s+)/);
  let index = 0;

  return new ReadableStream({
    async pull(controller) {
      if (index >= words.length) {
        controller.close();
        return;
      }
      const chunk = words[index++];
      controller.enqueue(new TextEncoder().encode(chunk));
      await new Promise(resolve => setTimeout(resolve, 8));
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as unknown;
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { message, sessionId, userId, mode } = parsed.data;
    const sid = sessionId ?? `session-${Date.now()}`;
    const uid = userId ?? 'anonymous';

    // Ensure session exists
    if (!sessionMemory.get(sid)) {
      sessionMemory.create({ sessionId: sid, userId: uid, tenantId: 'default', title: '' });
    }
    sessionMemory.addMessage(sid, { role: 'user', content: message });

    const stream = await buildResponse(message, mode, sid, uid);

    // Collect full response for memory storage (tee the stream)
    const [stream1, stream2] = stream.tee();

    // Store assistant response in background
    (async () => {
      const reader = stream2.getReader();
      const chunks: string[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(new TextDecoder().decode(value));
        }
        sessionMemory.addMessage(sid, { role: 'assistant', content: chunks.join('') });
      } catch {
        // Non-critical
      } finally {
        reader.releaseLock();
      }
    })();

    return new Response(stream1, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Session-Id': sid,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[chat] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', message: (err as Error).message },
      { status: 500 },
    );
  }
}
