/**
 * MSW handlers for Chat API endpoints
 *
 * Implements mock handlers for the LLM chat feature including
 * sending messages, retrieving history, and clearing history.
 */

import { http, HttpResponse } from 'msw';
import { getHistory, addMessage, clearHistory, generateMockResponse } from '../data/chat.js';

/** Base API path for flowdrop endpoints */
const API_BASE = '/api/flowdrop';

/**
 * POST /api/flowdrop/workflows/:id/chat/messages
 * Send a chat message and receive a mock LLM response
 */
export const sendMessageHandler = http.post(
  `${API_BASE}/workflows/:id/chat/messages`,
  async ({ params, request }) => {
    const { id } = params;
    const workflowId = Array.isArray(id) ? id[0] : id;

    let body: {
      message?: string;
      workflowState?: unknown;
      history?: unknown[];
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return HttpResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    if (!body.message || typeof body.message !== 'string') {
      return HttpResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    // Store the user message
    addMessage(workflowId, 'user', body.message);

    // Generate mock LLM response
    const { content, conversationId } = generateMockResponse(body.message, workflowId);

    // Store the assistant response
    addMessage(workflowId, 'assistant', content);

    return HttpResponse.json({ content, conversationId });
  }
);

/**
 * GET /api/flowdrop/workflows/:id/chat/messages
 * Get conversation history for a workflow
 */
export const getHistoryHandler = http.get(
  `${API_BASE}/workflows/:id/chat/messages`,
  ({ params }) => {
    const { id } = params;
    const workflowId = Array.isArray(id) ? id[0] : id;

    const history = getHistory(workflowId);

    return HttpResponse.json(history);
  }
);

/**
 * DELETE /api/flowdrop/workflows/:id/chat/messages
 * Clear conversation history for a workflow
 */
export const clearHistoryHandler = http.delete(
  `${API_BASE}/workflows/:id/chat/messages`,
  ({ params }) => {
    const { id } = params;
    const workflowId = Array.isArray(id) ? id[0] : id;

    clearHistory(workflowId);

    return HttpResponse.json({
      success: true,
      message: 'History cleared'
    });
  }
);

/**
 * Export all chat handlers
 */
export const chatHandlers = [sendMessageHandler, getHistoryHandler, clearHistoryHandler];

/**
 * Create a stateful handler that returns `responses` in sequence.
 * Designed for testing the auto-retry flow: provide the initial response
 * (with commands that will fail) followed by a corrected response.
 *
 * Usage in tests:
 * ```ts
 * server.use(createRetryScenarioHandler([
 *   // First call — commands that executeBatch will fail on
 *   "I'll add that.\n```flowdrop\nadd bad_type\n```",
 *   // Retry call — corrected commands after the error report
 *   "Let me fix that.\n```flowdrop\nadd http_node\n```",
 * ]));
 * ```
 *
 * Once all responses are consumed the last one repeats.
 */
export function createRetryScenarioHandler(responses: string[]) {
  if (responses.length === 0) throw new Error('responses must not be empty');
  let callIndex = 0;
  return http.post(`${API_BASE}/workflows/:id/chat/messages`, async () => {
    const content = responses[Math.min(callIndex++, responses.length - 1)];
    return HttpResponse.json({ content, conversationId: 'test-retry-conv' });
  });
}
