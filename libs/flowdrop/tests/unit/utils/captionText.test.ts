import { describe, it, expect } from 'vitest';
import {
  collapseCaptionText,
  snapCaptionWidth,
  decideInlineCommit
} from '../../../src/lib/utils/captionText.js';

describe('collapseCaptionText', () => {
  it('collapses whitespace runs, newlines and tabs, and trims', () => {
    expect(collapseCaptionText('  a \n\n b\t\tc  ')).toBe('a b c');
    expect(collapseCaptionText('\n  \t')).toBe('');
  });
});

describe('snapCaptionWidth', () => {
  it('never goes below two grid steps (40px on a 20px grid)', () => {
    expect(snapCaptionWidth(0, 20, 500)).toBe(40);
    expect(snapCaptionWidth(21, 20, 500)).toBe(40);
    expect(snapCaptionWidth(40, 20, 500)).toBe(40);
  });

  it('rounds up in grid steps', () => {
    expect(snapCaptionWidth(41, 20, 500)).toBe(60);
    expect(snapCaptionWidth(100, 20, 500)).toBe(100);
    expect(snapCaptionWidth(100.5, 20, 500)).toBe(120);
  });

  it('caps at the maximum', () => {
    expect(snapCaptionWidth(480, 20, 500)).toBe(480);
    expect(snapCaptionWidth(501, 20, 500)).toBe(500);
    expect(snapCaptionWidth(5000, 20, 500)).toBe(500);
  });

  it('follows the grid size it is given', () => {
    expect(snapCaptionWidth(10, 25, 500)).toBe(50);
    expect(snapCaptionWidth(51, 25, 500)).toBe(75);
  });

  it('falls back to a 20px step for a non-positive grid', () => {
    expect(snapCaptionWidth(41, 0, 500)).toBe(60);
  });
});

describe('decideInlineCommit', () => {
  const outcome = (text: string | null, current: string, isNew: boolean) =>
    decideInlineCommit(text, current, isNew).outcome;

  it('new caption: empty or cancelled is removed, text is added', () => {
    expect(outcome('', '', true)).toBe('remove');
    expect(outcome('  \n ', '', true)).toBe('remove');
    expect(outcome(null, '', true)).toBe('remove');
    expect(outcome('Inputs', '', true)).toBe('add');
  });

  it('existing caption: empty, cancelled or unchanged writes nothing', () => {
    expect(outcome('', 'Inputs', false)).toBe('none');
    expect(outcome(null, 'Inputs', false)).toBe('none');
    expect(outcome('Inputs', 'Inputs', false)).toBe('none');
    expect(outcome('  Inputs ', 'Inputs', false)).toBe('none');
  });

  it('existing caption: changed text is an edit', () => {
    expect(outcome('Outputs', 'Inputs', false)).toBe('edit');
  });

  it('returns the collapsed text, and an empty label when cancelled', () => {
    expect(decideInlineCommit('  Two\n  lines\t ', 'Inputs', false).label).toBe('Two lines');
    expect(decideInlineCommit('Inputs', '', true)).toEqual({ outcome: 'add', label: 'Inputs' });
    expect(decideInlineCommit(null, 'Inputs', false)).toEqual({ outcome: 'none', label: '' });
  });
});
