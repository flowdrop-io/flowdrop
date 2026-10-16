import { describe, it, expect } from 'vitest';
import {
  MAX_VISIBLE_TOASTS,
  SUCCESS_TOAST_ID,
  planToastEviction,
  type ActiveToast
} from '$lib/services/toastQueue.js';

const t = (id: string, kind: ActiveToast['kind'], createdAt: number): ActiveToast => ({
  id,
  kind,
  createdAt
});

describe('planToastEviction', () => {
  it('shows at most three toasts', () => {
    expect(MAX_VISIBLE_TOASTS).toBe(3);
  });

  it('evicts nothing while there is room', () => {
    const active = [t('e1', 'error', 1), t('e2', 'error', 2)];
    expect(planToastEviction(active, { id: 'e3', kind: 'error' })).toEqual([]);
  });

  it('evicts the oldest when a fourth would show', () => {
    const active = [t('e1', 'error', 1), t('e2', 'error', 2), t('e3', 'warning', 3)];
    expect(planToastEviction(active, { id: 'e4', kind: 'error' })).toEqual(['e1']);
  });

  it('evicts a transient toast before an older persistent one', () => {
    const active = [t('e1', 'error', 1), t('s', 'info', 2), t('e2', 'error', 3)];
    expect(planToastEviction(active, { id: 'e3', kind: 'error' })).toEqual(['s']);
  });

  it('does not count a toast that is replaced in place', () => {
    const active = [t('e1', 'error', 1), t('e2', 'error', 2), t('e3', 'error', 3)];
    expect(planToastEviction(active, { id: 'e2', kind: 'error' })).toEqual([]);
  });

  it('a new success replaces the previous success', () => {
    const active = [t('a', 'success', 1), t('e1', 'error', 2)];
    expect(planToastEviction(active, { id: 'b', kind: 'success' })).toEqual(['a']);
  });

  it('a success with the shared id is replaced by the library, not evicted', () => {
    const active = [t(SUCCESS_TOAST_ID, 'success', 1)];
    expect(planToastEviction(active, { id: SUCCESS_TOAST_ID, kind: 'success' })).toEqual([]);
  });

  it('a replaced success frees its slot, so nothing else is evicted', () => {
    const active = [t('a', 'success', 1), t('e1', 'error', 2), t('e2', 'error', 3)];
    expect(planToastEviction(active, { id: 'b', kind: 'success' })).toEqual(['a']);
  });

  it('never leaves more than the maximum visible', () => {
    const active = Array.from({ length: 6 }, (_, i) => t(`e${i}`, 'error', i));
    const evicted = planToastEviction(active, { id: 'new', kind: 'error' });
    expect(active.length - evicted.length + 1).toBe(MAX_VISIBLE_TOASTS);
    expect(evicted).toEqual(['e0', 'e1', 'e2', 'e3']);
  });

  it('a success does not replace an error', () => {
    const active = [t('e1', 'error', 1)];
    expect(planToastEviction(active, { id: SUCCESS_TOAST_ID, kind: 'success' })).toEqual([]);
  });
});
