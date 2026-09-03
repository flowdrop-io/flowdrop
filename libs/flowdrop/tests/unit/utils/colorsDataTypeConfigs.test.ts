import { describe, it, expect } from 'vitest';
import { getDataTypeColorFromConfigs } from '$lib/utils/colors.js';
import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
import type { PortDataTypeConfig } from '$lib/types/index.js';

const configs: PortDataTypeConfig[] = [
  { id: 'string', name: 'String', color: 'var(--fd-node-emerald)' },
  { id: 'messages', name: 'Messages', color: '#123456', aliases: ['chat'] }
];

describe('getDataTypeColorFromConfigs', () => {
  it('uses the configured colour for the id, case-insensitively', () => {
    expect(getDataTypeColorFromConfigs(configs, 'string')).toBe('var(--fd-node-emerald)');
    expect(getDataTypeColorFromConfigs(configs, 'String')).toBe('var(--fd-node-emerald)');
  });

  it('honours aliases', () => {
    expect(getDataTypeColorFromConfigs(configs, 'chat')).toBe('#123456');
  });

  it('colours a typed array like its element type', () => {
    expect(getDataTypeColorFromConfigs(configs, 'string[]')).toBe('var(--fd-node-emerald)');
    expect(getDataTypeColorFromConfigs(configs, 'messages[]')).toBe('#123456');
  });

  it('falls back to the built-in palette when the host config is silent', () => {
    const number = DEFAULT_PORT_CONFIG.dataTypes.find((dt) => dt.id === 'number')!;
    expect(getDataTypeColorFromConfigs([], 'number')).toBe(number.color);
  });

  it('is slate for a data type nobody knows', () => {
    expect(getDataTypeColorFromConfigs(configs, 'customer-order')).toBe('var(--fd-node-slate)');
  });
});
