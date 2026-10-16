import { describe, it, expect } from 'vitest';
import { nodeAriaLabel } from '../../../src/lib/utils/nodeAriaLabel.js';
import { defaultMessages } from '../../../src/lib/messages/defaults.js';

const graph = defaultMessages.nodes.graph;

describe('nodeAriaLabel', () => {
  it('names gateway and idea nodes by their kind', () => {
    expect(nodeAriaLabel(graph, 'gatewayNode', 'Route')).toBe('Gateway node: Route');
    expect(nodeAriaLabel(graph, 'ideaNode', 'Maybe')).toBe('Idea node: Maybe');
  });

  it('falls back to the workflow-node label for every other component', () => {
    expect(nodeAriaLabel(graph, 'workflowNode', 'Fetch')).toBe('Workflow node: Fetch');
    expect(nodeAriaLabel(graph, 'terminalNode', 'Start')).toBe('Workflow node: Start');
  });
});
