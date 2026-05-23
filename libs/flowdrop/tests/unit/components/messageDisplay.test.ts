/**
 * Unit tests — playground/messageDisplay helpers
 *
 * These are pure functions extracted from the layout components so the
 * boundaries (sub-second → ms, second-or-more → s; role icons; level icons;
 * role labels with userName/nodeLabel overrides) are testable in isolation.
 */

import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatTimestamp,
  getLogLevelIcon,
  getRoleIcon,
  getRoleLabel,
  type RoleLabels
} from '$lib/components/playground/messageDisplay.js';

const ROLES: RoleLabels = {
  you: 'You',
  assistant: 'Assistant',
  system: 'System',
  log: 'Log',
  message: 'Message'
};

describe('formatDuration', () => {
  it('renders sub-second durations in ms', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(1)).toBe('1ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('crosses the boundary at exactly 1000ms', () => {
    // 1000ms is the canonical edge — anything ≥1000 renders in seconds.
    expect(formatDuration(1000)).toBe('1.00s');
  });

  it('renders second-or-more durations with two decimals', () => {
    expect(formatDuration(1500)).toBe('1.50s');
    expect(formatDuration(2345)).toBe('2.35s');
    expect(formatDuration(60_000)).toBe('60.00s');
  });
});

describe('formatTimestamp', () => {
  it('produces a 24h HH:MM:SS string', () => {
    const result = formatTimestamp('2026-01-19T13:45:09Z');
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('uses 24-hour clock (no AM/PM)', () => {
    const result = formatTimestamp('2026-01-19T23:00:00Z');
    expect(result).not.toMatch(/AM|PM/i);
  });
});

describe('getLogLevelIcon', () => {
  it('maps each level to a distinct icon', () => {
    expect(getLogLevelIcon('error')).toBe('mdi:alert-circle');
    expect(getLogLevelIcon('warning')).toBe('mdi:alert');
    expect(getLogLevelIcon('debug')).toBe('mdi:bug');
    expect(getLogLevelIcon('info')).toBe('mdi:information');
  });

  it('falls back to info icon when level is undefined', () => {
    expect(getLogLevelIcon(undefined)).toBe('mdi:information');
  });
});

describe('getRoleIcon', () => {
  it('maps every role to a distinct icon', () => {
    expect(getRoleIcon('user')).toBe('mdi:account');
    expect(getRoleIcon('assistant')).toBe('mdi:robot');
    expect(getRoleIcon('system')).toBe('mdi:cog');
    expect(getRoleIcon('log')).toBe('mdi:console');
  });
});

describe('getRoleLabel', () => {
  it('returns the localised label for each role', () => {
    expect(getRoleLabel({ role: 'user' }, ROLES)).toBe('You');
    expect(getRoleLabel({ role: 'assistant' }, ROLES)).toBe('Assistant');
    expect(getRoleLabel({ role: 'system' }, ROLES)).toBe('System');
    expect(getRoleLabel({ role: 'log' }, ROLES)).toBe('Log');
  });

  it('prefers metadata.userName for user role (backend-provided display name)', () => {
    expect(getRoleLabel({ role: 'user', metadata: { userName: 'Shibin' } }, ROLES)).toBe('Shibin');
  });

  it('prefers metadata.nodeLabel for log role (human-readable node label)', () => {
    expect(getRoleLabel({ role: 'log', metadata: { nodeLabel: 'JSON Loader' } }, ROLES)).toBe(
      'JSON Loader'
    );
  });

  it('falls back to role-default when the metadata override is absent', () => {
    expect(getRoleLabel({ role: 'user', metadata: { nodeLabel: 'irrelevant' } }, ROLES)).toBe(
      'You'
    );
    expect(getRoleLabel({ role: 'log', metadata: { userName: 'irrelevant' } }, ROLES)).toBe('Log');
  });

  it('ignores metadata for assistant / system (no override path)', () => {
    expect(
      getRoleLabel(
        { role: 'assistant', metadata: { userName: 'ignored', nodeLabel: 'ignored' } },
        ROLES
      )
    ).toBe('Assistant');
    expect(
      getRoleLabel(
        { role: 'system', metadata: { userName: 'ignored', nodeLabel: 'ignored' } },
        ROLES
      )
    ).toBe('System');
  });
});
