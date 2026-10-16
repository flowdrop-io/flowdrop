import { describe, it, expect } from 'vitest';
import { humanizeKey } from '$lib/components/form/humanizeKey.js';

describe('humanizeKey', () => {
  it('capitalises a plain key', () => {
    expect(humanizeKey('branches')).toBe('Branches');
  });
  it('splits snake, kebab and camel case', () => {
    expect(humanizeKey('max_retries')).toBe('Max retries');
    expect(humanizeKey('api-key')).toBe('Api key');
    expect(humanizeKey('maxRetries')).toBe('Max retries');
  });
  it('returns an empty key unchanged', () => {
    expect(humanizeKey('')).toBe('');
  });
});
