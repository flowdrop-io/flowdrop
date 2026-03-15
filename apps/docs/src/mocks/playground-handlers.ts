/**
 * MSW handlers for playground demo.
 * Simulates a chat-based playground with fake AI responses.
 */

import { http, HttpResponse, delay } from 'msw';

const API_BASE = '/api/flowdrop';

// In-memory state
let sessions: Array<{
  id: string;
  workflowId: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}> = [];

let messages: Array<{
  id: string;
  sessionId: string;
  role: string;
  content: string;
  timestamp: string;
  status?: string;
  sequenceNumber?: number;
  parentMessageId?: string;
  nodeId?: string | null;
  metadata?: Record<string, unknown>;
}> = [];

let sessionCounter = 0;
let messageCounter = 0;

/** Simulated AI response sequence for demo */
const demoResponses = [
  {
    steps: [
      {
        role: 'log',
        content: 'Loading content from source...',
        nodeId: 'content_loader.1',
        metadata: { level: 'info', nodeLabel: 'Content Loader', duration: 320 }
      },
      {
        role: 'log',
        content: 'Found 12 articles matching criteria',
        nodeId: 'content_loader.1',
        metadata: { level: 'info', nodeLabel: 'Content Loader' }
      },
      {
        role: 'log',
        content: 'Running AI analysis on content...',
        nodeId: 'ai_content_analyzer.1',
        metadata: { level: 'info', nodeLabel: 'AI Content Analyzer', duration: 1850 }
      },
      {
        role: 'log',
        content: 'Analysis complete: 8 items need updates',
        nodeId: 'ai_content_analyzer.1',
        metadata: { level: 'info', nodeLabel: 'AI Content Analyzer' }
      },
      {
        role: 'assistant',
        content:
          "I analyzed 12 articles and found **8 items** that need content updates. The AI Content Analyzer identified patterns in naming conventions that should be standardized.\n\nHere's a summary:\n- **3 articles** have outdated terminology\n- **5 articles** need formatting improvements\n- All changes have a confidence score above 0.8\n\nWould you like me to apply the suggested changes?"
      }
    ]
  },
  {
    steps: [
      {
        role: 'log',
        content: 'Processing update request...',
        nodeId: 'simple_agent.1',
        metadata: { level: 'info', nodeLabel: 'Simple Agent', duration: 450 }
      },
      {
        role: 'log',
        content: 'Applying content transformations...',
        nodeId: 'ai_content_analyzer.1',
        metadata: { level: 'info', nodeLabel: 'AI Content Analyzer', duration: 2100 }
      },
      {
        role: 'log',
        content: 'Writing results to output...',
        nodeId: 'text_output.1',
        metadata: { level: 'info', nodeLabel: 'Text Output', duration: 150 }
      },
      {
        role: 'assistant',
        content:
          "All updates have been applied successfully! Here's what was done:\n\n1. **Terminology updates**: Replaced 3 instances of outdated terms\n2. **Formatting fixes**: Standardized heading styles in 5 articles\n3. **Validation**: All changes passed the confidence threshold\n\nThe workflow completed in 2.7 seconds. You can run it again with different parameters if needed."
      }
    ]
  },
  {
    steps: [
      {
        role: 'log',
        content: 'Starting new analysis cycle...',
        nodeId: 'content_loader.1',
        metadata: { level: 'info', nodeLabel: 'Content Loader', duration: 280 }
      },
      {
        role: 'assistant',
        content:
          "I've started a fresh analysis. The Content Loader is scanning for new articles since the last run. I'll keep you posted on the results!"
      }
    ]
  }
];

let responseIndex = 0;

/** Pending response steps for polling */
const pendingSteps: Map<string, (typeof demoResponses)[0]['steps']> = new Map();

export const playgroundHandlers = [
  // List sessions
  http.get(`${API_BASE}/workflows/:workflowId/playground/sessions`, () => {
    return HttpResponse.json({
      success: true,
      data: sessions,
      message: `Found ${sessions.length} sessions`
    });
  }),

  // Create session
  http.post(
    `${API_BASE}/workflows/:workflowId/playground/sessions`,
    async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      sessionCounter++;
      const session = {
        id: `sess-${sessionCounter}`,
        workflowId: params.workflowId as string,
        name: (body.name as string) || `Session ${sessionCounter}`,
        status: 'idle',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      sessions.push(session);
      return HttpResponse.json({ success: true, data: session }, { status: 201 });
    }
  ),

  // Get session
  http.get(`${API_BASE}/playground/sessions/:sessionId`, ({ params }) => {
    const session = sessions.find((s) => s.id === params.sessionId);
    if (!session) {
      return HttpResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }
    return HttpResponse.json({ success: true, data: session });
  }),

  // Delete session
  http.delete(`${API_BASE}/playground/sessions/:sessionId`, ({ params }) => {
    sessions = sessions.filter((s) => s.id !== params.sessionId);
    messages = messages.filter((m) => m.sessionId !== params.sessionId);
    pendingSteps.delete(params.sessionId as string);
    return HttpResponse.json({ success: true });
  }),

  // Send message (execute)
  http.post(`${API_BASE}/playground/sessions/:sessionId/messages`, async ({ params, request }) => {
    const sessionId = params.sessionId as string;
    const body = (await request.json()) as { content: string };

    // Add user message
    messageCounter++;
    const userMsg = {
      id: `msg-${messageCounter}`,
      sessionId,
      role: 'user',
      content: body.content,
      timestamp: new Date().toISOString(),
      status: 'completed',
      sequenceNumber: messageCounter
    };
    messages.push(userMsg);

    // Queue response steps for polling
    const response = demoResponses[responseIndex % demoResponses.length];
    responseIndex++;
    pendingSteps.set(sessionId, [...response.steps]);

    // Update session status
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      session.status = 'running';
      session.updatedAt = new Date().toISOString();
    }

    return HttpResponse.json({ success: true, data: userMsg });
  }),

  // Get messages (polling)
  http.get(`${API_BASE}/playground/sessions/:sessionId/messages`, async ({ params }) => {
    const sessionId = params.sessionId as string;
    const session = sessions.find((s) => s.id === sessionId);
    const pending = pendingSteps.get(sessionId);

    // Drip-feed pending steps one at a time
    if (pending && pending.length > 0) {
      await delay(400);
      const step = pending.shift()!;
      messageCounter++;
      const msg = {
        id: `msg-${messageCounter}`,
        sessionId,
        role: step.role,
        content: step.content,
        timestamp: new Date().toISOString(),
        status: 'completed' as const,
        sequenceNumber: messageCounter,
        nodeId: step.nodeId ?? null,
        metadata: step.metadata
      };
      messages.push(msg);

      // If no more pending steps, mark completed
      if (pending.length === 0) {
        pendingSteps.delete(sessionId);
        if (session) {
          session.status = 'completed';
          session.updatedAt = new Date().toISOString();
        }
      }
    }

    const sessionMessages = messages.filter((m) => m.sessionId === sessionId);
    const sessionStatus = session?.status ?? 'idle';

    return HttpResponse.json({
      success: true,
      data: sessionMessages,
      hasMore: (pending?.length ?? 0) > 0,
      sessionStatus
    });
  }),

  // Stop execution
  http.post(`${API_BASE}/playground/sessions/:sessionId/stop`, ({ params }) => {
    const sessionId = params.sessionId as string;
    pendingSteps.delete(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      session.status = 'idle';
      session.updatedAt = new Date().toISOString();
    }
    return HttpResponse.json({ success: true });
  }),

  // Interrupts (empty for demo)
  http.get(`${API_BASE}/playground/sessions/:sessionId/interrupts`, () => {
    return HttpResponse.json({ success: true, data: [] });
  })
];
