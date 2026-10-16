/**
 * Unit Tests - Node Status Utilities
 *
 * Tests for node execution status display and management functions.
 */

import { describe, it, expect } from 'vitest';
import {
  stripExecutionInfo,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  getStatusBackgroundColor,
  getStatusTextColor,
  toPillStatus,
  createDefaultExecutionInfo,
  updateExecutionStart,
  updateExecutionComplete,
  updateExecutionFailed,
  resetExecutionInfo,
  formatExecutionDuration,
  formatLastExecuted
} from '$lib/utils/nodeStatus.js';
import type { NodeExecutionStatus } from '$lib/types';

describe('Node Status Utilities', () => {
  describe('getStatusColor', () => {
    it('returns the --fd-status token for each status', () => {
      expect(getStatusColor('idle')).toBe('var(--fd-status-skipped)');
      expect(getStatusColor('pending')).toBe('var(--fd-status-waiting)');
      expect(getStatusColor('running')).toBe('var(--fd-status-running)');
      expect(getStatusColor('completed')).toBe('var(--fd-status-completed)');
      expect(getStatusColor('failed')).toBe('var(--fd-status-failed)');
      expect(getStatusColor('cancelled')).toBe('var(--fd-status-skipped)');
      expect(getStatusColor('skipped')).toBe('var(--fd-status-skipped)');
      expect(getStatusColor('paused')).toBe('var(--fd-status-waiting)');
      expect(getStatusColor('interrupted')).toBe('var(--fd-status-waiting)');
    });

    it('returns the muted token for unknown status', () => {
      expect(getStatusColor('unknown' as NodeExecutionStatus)).toBe('var(--fd-status-skipped)');
    });
  });

  describe('toPillStatus', () => {
    it('maps execution statuses onto the five pill statuses', () => {
      expect(toPillStatus('running')).toBe('running');
      expect(toPillStatus('completed')).toBe('completed');
      expect(toPillStatus('failed')).toBe('failed');
      expect(toPillStatus('skipped')).toBe('skipped');
      expect(toPillStatus('cancelled')).toBe('skipped');
      expect(toPillStatus('paused')).toBe('waiting');
      expect(toPillStatus('interrupted')).toBe('waiting');
    });

    it('draws nothing for idle and pending', () => {
      expect(toPillStatus('idle')).toBeNull();
      expect(toPillStatus('pending')).toBeNull();
    });
  });

  describe('getStatusIcon', () => {
    it('should return correct icon for each status', () => {
      expect(getStatusIcon('idle')).toBe('mdi:circle-outline');
      expect(getStatusIcon('pending')).toBe('mdi:clock-outline');
      expect(getStatusIcon('running')).toBe('mdi:loading');
      expect(getStatusIcon('completed')).toBe('mdi:check-circle');
      expect(getStatusIcon('failed')).toBe('mdi:alert-circle');
      expect(getStatusIcon('cancelled')).toBe('mdi:cancel');
      expect(getStatusIcon('skipped')).toBe('mdi:skip-next');
    });

    it('should return idle icon for unknown status', () => {
      expect(getStatusIcon('unknown' as NodeExecutionStatus)).toBe('mdi:circle-outline');
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct label for each status', () => {
      expect(getStatusLabel('idle')).toBe('Idle');
      expect(getStatusLabel('pending')).toBe('Pending');
      expect(getStatusLabel('running')).toBe('Running');
      expect(getStatusLabel('completed')).toBe('Completed');
      expect(getStatusLabel('failed')).toBe('Failed');
      expect(getStatusLabel('cancelled')).toBe('Cancelled');
      expect(getStatusLabel('skipped')).toBe('Skipped');
    });

    it('should return Idle label for unknown status', () => {
      expect(getStatusLabel('unknown' as NodeExecutionStatus)).toBe('Idle');
    });
  });

  describe('getStatusBackgroundColor', () => {
    it('returns the --fd-status -soft token for each status', () => {
      expect(getStatusBackgroundColor('idle')).toBe('var(--fd-status-skipped-soft)');
      expect(getStatusBackgroundColor('pending')).toBe('var(--fd-status-waiting-soft)');
      expect(getStatusBackgroundColor('running')).toBe('var(--fd-status-running-soft)');
      expect(getStatusBackgroundColor('completed')).toBe('var(--fd-status-completed-soft)');
      expect(getStatusBackgroundColor('failed')).toBe('var(--fd-status-failed-soft)');
    });
  });

  describe('getStatusTextColor', () => {
    it('returns the --fd-status token for each status', () => {
      expect(getStatusTextColor('running')).toBe('var(--fd-status-running)');
      expect(getStatusTextColor('failed')).toBe('var(--fd-status-failed)');
      expect(getStatusTextColor('interrupted')).toBe('var(--fd-status-waiting)');
    });
  });

  describe('createDefaultExecutionInfo', () => {
    it('should create default execution info', () => {
      const info = createDefaultExecutionInfo();

      expect(info.status).toBe('idle');
      expect(info.executionCount).toBe(0);
      expect(info.isExecuting).toBe(false);
    });
  });

  describe('updateExecutionStart', () => {
    it('should update status to running', () => {
      const info = createDefaultExecutionInfo();
      const updated = updateExecutionStart(info);

      expect(updated.status).toBe('running');
      expect(updated.isExecuting).toBe(true);
    });

    it('should preserve execution count', () => {
      const info = { ...createDefaultExecutionInfo(), executionCount: 5 };
      const updated = updateExecutionStart(info);

      expect(updated.executionCount).toBe(5);
    });
  });

  describe('updateExecutionComplete', () => {
    it('should update status to completed', () => {
      const info = updateExecutionStart(createDefaultExecutionInfo());
      const updated = updateExecutionComplete(info, 1500);

      expect(updated.status).toBe('completed');
      expect(updated.isExecuting).toBe(false);
    });

    it('should increment execution count', () => {
      const info = createDefaultExecutionInfo();
      const updated = updateExecutionComplete(info, 1000);

      expect(updated.executionCount).toBe(1);
    });

    it('should set execution duration', () => {
      const info = createDefaultExecutionInfo();
      const updated = updateExecutionComplete(info, 2500);

      expect(updated.lastExecutionDuration).toBe(2500);
    });

    it('should set last executed timestamp', () => {
      const info = createDefaultExecutionInfo();
      const updated = updateExecutionComplete(info, 1000);

      expect(updated.lastExecuted).toBeDefined();
      expect(new Date(updated.lastExecuted!).getTime()).toBeCloseTo(
        Date.now(),
        -2 // Within 100ms
      );
    });

    it('should clear previous errors', () => {
      const info = {
        ...createDefaultExecutionInfo(),
        lastError: 'Previous error'
      };
      const updated = updateExecutionComplete(info, 1000);

      expect(updated.lastError).toBeUndefined();
    });
  });

  describe('updateExecutionFailed', () => {
    it('should update status to failed', () => {
      const info = updateExecutionStart(createDefaultExecutionInfo());
      const updated = updateExecutionFailed(info, 'Test error', 1000);

      expect(updated.status).toBe('failed');
      expect(updated.isExecuting).toBe(false);
    });

    it('should increment execution count', () => {
      const info = createDefaultExecutionInfo();
      const updated = updateExecutionFailed(info, 'Error', 1000);

      expect(updated.executionCount).toBe(1);
    });

    it('should set error message', () => {
      const info = createDefaultExecutionInfo();
      const updated = updateExecutionFailed(info, 'Test error message', 1000);

      expect(updated.lastError).toBe('Test error message');
    });

    it('should set execution duration', () => {
      const info = createDefaultExecutionInfo();
      const updated = updateExecutionFailed(info, 'Error', 3000);

      expect(updated.lastExecutionDuration).toBe(3000);
    });

    it('should set last executed timestamp', () => {
      const info = createDefaultExecutionInfo();
      const updated = updateExecutionFailed(info, 'Error', 1000);

      expect(updated.lastExecuted).toBeDefined();
    });
  });

  describe('resetExecutionInfo', () => {
    it('should reset status to idle', () => {
      const info = updateExecutionStart(createDefaultExecutionInfo());
      const reset = resetExecutionInfo(info);

      expect(reset.status).toBe('idle');
      expect(reset.isExecuting).toBe(false);
    });

    it('should clear error message', () => {
      const info = {
        ...createDefaultExecutionInfo(),
        lastError: 'Some error'
      };
      const reset = resetExecutionInfo(info);

      expect(reset.lastError).toBeUndefined();
    });

    it('should preserve execution count', () => {
      const info = { ...createDefaultExecutionInfo(), executionCount: 10 };
      const reset = resetExecutionInfo(info);

      expect(reset.executionCount).toBe(10);
    });

    it('should preserve last executed timestamp', () => {
      const timestamp = '2024-01-01T00:00:00Z';
      const info = { ...createDefaultExecutionInfo(), lastExecuted: timestamp };
      const reset = resetExecutionInfo(info);

      expect(reset.lastExecuted).toBe(timestamp);
    });
  });

  describe('formatExecutionDuration', () => {
    it('should format milliseconds', () => {
      expect(formatExecutionDuration(500)).toBe('500ms');
      expect(formatExecutionDuration(999)).toBe('999ms');
    });

    it('should format seconds', () => {
      expect(formatExecutionDuration(1000)).toBe('1.0s');
      expect(formatExecutionDuration(1500)).toBe('1.5s');
      expect(formatExecutionDuration(59999)).toBe('60.0s');
    });

    it('should format minutes and seconds', () => {
      expect(formatExecutionDuration(60000)).toBe('1m 0s');
      expect(formatExecutionDuration(90000)).toBe('1m 30s');
      expect(formatExecutionDuration(125000)).toBe('2m 5s');
    });

    it('should return N/A for undefined', () => {
      expect(formatExecutionDuration(undefined)).toBe('N/A');
    });

    it('should handle zero duration', () => {
      // Zero is falsy, so it returns N/A
      expect(formatExecutionDuration(0)).toBe('N/A');
    });
  });

  describe('formatLastExecuted', () => {
    it('should return Never for undefined', () => {
      expect(formatLastExecuted(undefined)).toBe('Never');
    });

    it('should return Just now for recent execution', () => {
      const now = new Date().toISOString();
      expect(formatLastExecuted(now)).toBe('Just now');
    });

    it('should format minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatLastExecuted(fiveMinutesAgo)).toBe('5m ago');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatLastExecuted(twoHoursAgo)).toBe('2h ago');
    });

    it('should format date for old executions', () => {
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const formatted = formatLastExecuted(yesterday.toISOString());

      expect(formatted).toBe(yesterday.toLocaleDateString());
    });

    it('should handle edge case at 1 minute', () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      expect(formatLastExecuted(oneMinuteAgo)).toBe('1m ago');
    });

    it('should handle edge case at 1 hour', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      expect(formatLastExecuted(oneHourAgo)).toBe('1h ago');
    });
  });
});

describe('stripExecutionInfo', () => {
  const info = { status: 'completed', executionCount: 1, isExecuting: false } as const;

  it('removes executionInfo and keeps every other data key', () => {
    const nodes = [
      { id: 'a', data: { label: 'A', config: { x: 1 }, executionInfo: info } },
      { id: 'b', data: { label: 'B' } }
    ];
    const result = stripExecutionInfo(nodes);
    expect(result[0].data).toEqual({ label: 'A', config: { x: 1 } });
    expect('executionInfo' in result[0].data).toBe(false);
    expect(result[1]).toBe(nodes[1]);
  });

  it('does not mutate its input', () => {
    const nodes = [{ id: 'a', data: { executionInfo: info } }];
    stripExecutionInfo(nodes);
    expect(nodes[0].data.executionInfo).toBe(info);
  });

  it('returns the same array when no node carries it', () => {
    const nodes = [{ id: 'a', data: { label: 'A' } }];
    expect(stripExecutionInfo(nodes)).toBe(nodes);
  });
});
