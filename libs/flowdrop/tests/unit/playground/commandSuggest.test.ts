import { describe, it, expect } from 'vitest';
import {
  suggestCommands,
  COMMAND_NAMES,
  COMMAND_DESCRIPTORS
} from '../../../src/lib/playground/commands/index.js';
import { defaultEndpointConfig } from '../../../src/lib/config/endpoints.js';
import type { EndpointConfig } from '../../../src/lib/config/endpoints.js';
import { defaultMessages } from '../../../src/lib/messages/defaults.js';

const catalog = defaultMessages.playground.commands.catalog;

const values = (input: string, config: EndpointConfig | null = defaultEndpointConfig) =>
  suggestCommands(input, config, catalog).map((s) => s.value.trim());

describe('suggestCommands', () => {
  it('offers everything available for a bare slash', () => {
    const suggested = values('/');
    expect(suggested).toContain('/help');
    expect(suggested).toContain('/run');
    expect(suggested).toContain('/pause');
  });

  it('filters by prefix', () => {
    expect(values('/re')).toEqual(['/reset', '/resume']);
  });

  it('is case-insensitive', () => {
    expect(values('/RE')).toEqual(['/reset', '/resume']);
  });

  it('narrows to one as the prefix grows', () => {
    expect(values('/res')).toEqual(['/reset', '/resume']);
    expect(values('/rese')).toEqual(['/reset']);
  });

  it('offers nothing for plain text', () => {
    expect(suggestCommands('hello', defaultEndpointConfig, catalog)).toEqual([]);
    expect(suggestCommands('', defaultEndpointConfig, catalog)).toEqual([]);
  });

  it('offers nothing for escaped input', () => {
    // `//` means the user is writing a literal slash, not invoking a command.
    expect(suggestCommands('//st', defaultEndpointConfig, catalog)).toEqual([]);
  });

  it('stops once the command name is settled', () => {
    // A space means arguments follow; this client cannot complete those.
    expect(suggestCommands('/stop ', defaultEndpointConfig, catalog)).toEqual([]);
    expect(suggestCommands('/run --topic=x', defaultEndpointConfig, catalog)).toEqual([]);
  });

  it('offers nothing for an unmatched prefix', () => {
    expect(suggestCommands('/zzz', defaultEndpointConfig, catalog)).toEqual([]);
  });

  it('tolerates leading whitespace, as sending does', () => {
    expect(values('  /re')).toEqual(['/reset', '/resume']);
  });

  // -- shape ---------------------------------------------------------------

  it('labels with usage and details with the summary', () => {
    const [suggestion] = suggestCommands('/pause', defaultEndpointConfig, catalog);
    expect(suggestion.label).toBe('/pause [reason]');
    expect(suggestion.detail).toBe('Ask the active run to pause');
  });

  it('leaves a trailing space on commands that take arguments', () => {
    // So the caret lands where the argument goes.
    const [withArgs] = suggestCommands('/pause', defaultEndpointConfig, catalog);
    expect(withArgs.value).toBe('/pause ');

    const [withoutArgs] = suggestCommands('/stop', defaultEndpointConfig, catalog);
    expect(withoutArgs.value).toBe('/stop');
  });

  // -- availability --------------------------------------------------------

  it('never offers a command the backend cannot honour', () => {
    const config = structuredClone(defaultEndpointConfig);
    delete config.endpoints.signals;
    delete config.endpoints.workflows.run;
    delete config.endpoints.playground.resetSession;

    const suggested = values('/', config);
    expect(suggested).not.toContain('/pause');
    expect(suggested).not.toContain('/resume');
    expect(suggested).not.toContain('/cancel');
    expect(suggested).not.toContain('/run');
    expect(suggested).not.toContain('/reset');
    expect(suggested).toContain('/stop');
  });

  it('offers only /help with no configuration at all', () => {
    expect(values('/', null)).toEqual(['/help']);
  });
});

// ---------------------------------------------------------------------------
// The registry/catalog seam
// ---------------------------------------------------------------------------

describe('command catalog', () => {
  // Structure lives in the registry, display text in the messages module.
  // Nothing in the type system ties the two together, so assert it here: a new
  // command without a label would otherwise render `undefined` in the palette.
  it('labels every command the registry declares', () => {
    for (const name of COMMAND_NAMES) {
      expect(catalog[name], name).toBeDefined();
      expect(catalog[name].usage, name).toMatch(new RegExp(`^/${name}\\b`));
      expect(catalog[name].summary.length, name).toBeGreaterThan(0);
    }
  });

  it('marks a command as taking arguments iff the default usage shows some', () => {
    // Keeps the two in step without letting the *code* infer one from the
    // other — the bracket sniff lives here, in a test, rather than in
    // suggest.ts where translated prose would break it.
    //
    // Scoped to `defaultMessages` on purpose: `[...]` is an English-language
    // convention, and a host's translated catalog is under no obligation to
    // keep it. Do not generalise this over an overridden catalog.
    for (const descriptor of COMMAND_DESCRIPTORS) {
      const showsArgs = catalog[descriptor.name].usage.includes('[');
      expect(descriptor.takesArgs, descriptor.name).toBe(showsArgs);
    }
  });
});
