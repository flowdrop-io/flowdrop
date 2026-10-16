/**
 * The body the editor sends when it saves a workflow, built in one place so
 * everything that must see "the workflow as it would be saved" (the save
 * itself, the Doctor's diagnose of the draft) sees exactly the same thing.
 *
 * @module utils/workflowDraft
 */

import type { Workflow } from '../types/index.js';
import { DEFAULT_WORKFLOW_FORMAT } from '../types/index.js';
import { stripExecutionInfo } from './nodeStatus.js';
import { playgroundForSave } from './playgroundChat.js';

export function buildSaveBody(current: Workflow, workflowId: string): Workflow {
  return {
    id: workflowId,
    name: current.name || 'Untitled Workflow',
    description: current.description || '',
    nodes: stripExecutionInfo(current.nodes || []),
    edges: current.edges || [],
    metadata: {
      ...current.metadata,
      schemaVersion: current.metadata?.schemaVersion || '1.0.0',
      format: current.metadata?.format || DEFAULT_WORKFLOW_FORMAT,
      createdAt: current.metadata?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Explicit key list, so every contract field must be named here:
    // omitting `interface` silently strips the declared contract on save
    // (absent means "declares no interface" to the server).
    ...(current.interface !== undefined && { interface: current.interface }),
    // Same rule for the Playground settings (the chat binding, saved with
    // the workflow). Only `chat` goes back; a workflow from a server that
    // sends no `playground` key sends none either.
    ...(current.playground !== undefined && {
      playground: playgroundForSave(current.playground)
    }),
    // The revision the editor loaded, so a server that checks it can refuse
    // a stale write (409 CONFLICT) instead of letting the last write win.
    ...(current.revision !== undefined && { revision: current.revision })
  };
}
