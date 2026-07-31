import { describe, it, expect } from 'vitest';
import { resolveRunAction } from '../../../src/lib/playground/runAction.js';
import { defaultEndpointConfig } from '../../../src/lib/config/endpoints.js';
import { workflowLaunchService } from '../../../src/lib/services/workflowLaunchService.js';

describe('resolveRunAction', () => {
  it('launches when launching is possible and no message is configured', () => {
    // The default case, and the whole point of the change: Run must not post
    // "Run workflow" as though a user typed it.
    expect(resolveRunAction({ canLaunch: true, defaultMessage: 'Run workflow' })).toEqual({
      kind: 'launch'
    });
  });

  it('honours an explicitly configured message over launching', () => {
    expect(
      resolveRunAction({
        canLaunch: true,
        predefinedMessage: 'Summarise the inbox',
        defaultMessage: 'Run workflow'
      })
    ).toEqual({ kind: 'message', content: 'Summarise the inbox' });
  });

  it('treats an explicit empty string as a configured message, not an absent one', () => {
    // Presence is the signal. A host that sets '' has chosen to open with an
    // empty turn; silently launching instead would ignore that.
    expect(
      resolveRunAction({ canLaunch: true, predefinedMessage: '', defaultMessage: 'Run workflow' })
    ).toEqual({ kind: 'message', content: '' });
  });

  it('falls back to a message when launching is impossible', () => {
    // Against a backend with no launch verb a message is the only way to start
    // a run, so the fabricated turn is the lesser evil.
    expect(resolveRunAction({ canLaunch: false, defaultMessage: 'Run workflow' })).toEqual({
      kind: 'message',
      content: 'Run workflow'
    });
  });

  it('prefers the configured message over the default when falling back', () => {
    expect(
      resolveRunAction({
        canLaunch: false,
        predefinedMessage: 'Go',
        defaultMessage: 'Run workflow'
      })
    ).toEqual({ kind: 'message', content: 'Go' });
  });
});

describe('workflowLaunchService.isSupported', () => {
  it('is true when a launch endpoint is configured', () => {
    expect(workflowLaunchService.isSupported(defaultEndpointConfig)).toBe(true);
  });

  it('is false when the backend has no launch verb', () => {
    const config = structuredClone(defaultEndpointConfig);
    delete config.endpoints.workflows.run;
    expect(workflowLaunchService.isSupported(config)).toBe(false);
  });

  it('is false with no configuration at all', () => {
    expect(workflowLaunchService.isSupported(null)).toBe(false);
  });
});
