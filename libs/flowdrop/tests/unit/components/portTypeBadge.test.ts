// @vitest-environment node
/**
 * SSR render tests for <PortTypeBadge> — the shape symbol + name + lane chip row.
 *
 * Rendered through `svelte/server`'s `render()` under the `node` environment
 * (see schemaFormSsr.test.ts for why: with a `window` present Svelte loads the
 * client branch and `render()` mismatches). PortTypeBadge takes its checker as
 * a prop rather than from context, so a real PortCompatibilityChecker over
 * DEFAULT_PORT_CONFIG is all the setup it needs.
 *
 * These assertions pin the decisions the component encodes: the lane chip shows
 * the lane's served NAME (the raw id moves to the tooltip, so ids stay machine
 * keys), the reserved error output reads red regardless of its lane colour
 * (D7), the glyph is hidden from screen readers because it restates the lane
 * beside it, and the colour leaves as a custom property so the stylesheet keeps
 * control of it.
 *
 * What these cannot prove: a rendered `--fd-port-symbol-color: var(--fd-node-x)`
 * is a string, so a token that is referenced and never DEFINED asserts exactly
 * as well as one that resolves. `messages` shipped that way once. Token
 * definitions are tokens.css's business and no SSR test reaches them.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import PortTypeBadge from '$lib/components/ports/PortTypeBadge.svelte';
import { PortCompatibilityChecker } from '$lib/utils/connections.js';
import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
import { createRawSnippet } from 'svelte';
import type { NodePort } from '$lib/types/index.js';

const checker = new PortCompatibilityChecker(DEFAULT_PORT_CONFIG);

/** What the component accepts — a branch has neither an id nor a port name. */
type PortLike = { id?: string; type?: string; dataType: string; name?: string; required?: boolean };

function html(port: PortLike, extra: Record<string, unknown> = {}): string {
  return render(PortTypeBadge, { props: { checker, port, ...extra } }).body;
}

/** Collapse whitespace so `> [] <` and `>[]<` assert the same. */
function squish(s: string): string {
  return s.replace(/\s+/g, ' ');
}

/** Whether the glyph appears as its own text node (not as part of a longer run). */
function hasGlyph(body: string, glyph: string): boolean {
  return squish(body).includes(`>${glyph}<`) || squish(body).includes(`> ${glyph} <`);
}

const messagesPort: NodePort = {
  id: 'history',
  // Deliberately NOT "Messages": lets us tell the port name apart from the
  // lane's served display name in the rendered HTML.
  name: 'Chat History',
  type: 'output',
  dataType: 'messages'
};

const errorPort: NodePort = { id: 'error', name: 'Error', type: 'output', dataType: 'json' };

describe('PortTypeBadge SSR', () => {
  it('is genuinely on the SSR path', () => {
    expect(typeof window).toBe('undefined');
  });

  describe('lane chip shows the served name, tooltip shows the id', () => {
    const body = html(messagesPort);

    it('draws the `[]` glyph for the messages lane', () => {
      expect(hasGlyph(body, '[]')).toBe(true);
    });

    it('renders the served display name `Messages`', () => {
      // DEFAULT_PORT_CONFIG names this lane "Messages".
      expect(squish(body)).toContain('>Messages<');
    });

    it('keeps the raw lane id in a title attribute, not in the chip text', () => {
      // The id is what an author types into `x-data-type` and what a refused
      // wire names, so it stays one hover away rather than on the canvas.
      expect(body).toContain('title="messages"');
      expect(squish(body)).not.toContain('>messages<');
    });

    it('renders the port name', () => {
      expect(body).toContain('fd-port-label__name');
      expect(squish(body)).toContain('>Chat History<');
    });

    it('hides the glyph from screen readers — the lane id beside it says it', () => {
      expect(body).toContain('aria-hidden="true"');
      expect(body).not.toContain('role="img"');
      // Still named for the mouse.
      expect(body).toContain('title="list"');
    });
  });

  describe('the reserved error output (D7: the error affordance beats the lane colour)', () => {
    const body = html(errorPort);

    it('tints the symbol red rather than taking its json lane colour', () => {
      // Which token each lane carries is colors' business, not this component's;
      // the red exception IS this component's, so it is the only one pinned here.
      expect(body).toContain('var(--fd-node-red)');
      expect(body).not.toContain(checker.getDataTypeConfig('json')?.color);
    });

    it('still draws the `{}` glyph of its json lane', () => {
      expect(hasGlyph(body, '{}')).toBe(true);
    });

    it('still shows its `json` lane in the chip', () => {
      expect(squish(body)).toContain('>JSON<');
      expect(body).toContain('title="json"');
    });
  });

  describe('colour reaches the chip as a custom property, not an inline rule', () => {
    // The tints and the --fd-port-skin-color fallback live in base.css, so a
    // consumer can restyle .flowdrop-port-symbol without fighting `style=`.
    it('passes the lane colour through --fd-port-symbol-color', () => {
      const laneColor = checker.getDataTypeConfig('messages')?.color;
      expect(laneColor).toBeTruthy();
      expect(html(messagesPort)).toContain(`--fd-port-symbol-color: ${laneColor}`);
    });

    it('passes the reserved error red the same way', () => {
      expect(html(errorPort)).toContain('--fd-port-symbol-color: var(--fd-node-red)');
    });

    it('sets nothing else inline', () => {
      const style = /style="([^"]*)"/.exec(html(messagesPort))?.[1] ?? '';
      expect(style).toBe(`--fd-port-symbol-color: ${checker.getDataTypeConfig('messages')?.color}`);
    });
  });

  describe('align="right" (output rows mirror the order)', () => {
    const body = html(messagesPort, { align: 'right' });

    it('applies the right-aligned modifier', () => {
      expect(body).toContain('fd-port-label--right');
    });

    it('still renders both chips and the port name', () => {
      expect(hasGlyph(body, '[]')).toBe(true); // shape symbol
      expect(squish(body)).toContain('>Messages<'); // lane chip
      expect(squish(body)).toContain('>Chat History<'); // port name
      expect(body).toContain('flowdrop-port-symbol');
      expect(body).toContain('flowdrop-badge--outline');
    });

    it('mirrors the order — lane chip, name, symbol', () => {
      // The reason this branch exists at all: on an output row the symbols
      // line up as a column beside their handles. Presence is not the claim.
      const order = squish(body);
      expect(order.indexOf('flowdrop-badge--outline')).toBeLessThan(
        order.indexOf('flowdrop-port-symbol')
      );
    });
  });

  describe('a gateway branch row (no id, no name — label and leading supplied)', () => {
    // The gateway's exact call shape. It used to compose this row by hand and
    // got the mirrored order backwards: the shape symbol led on a right-aligned
    // row, so branches read `[T] Name (Trigger)` while every output port one
    // node over read `(Trigger) Name [T]`. Delegating here is what makes that
    // unrepresentable, and these are the assertions that keep it so.
    const BRANCH_LANE = { type: 'output', dataType: 'trigger' } as const;
    const body = html(BRANCH_LANE, {
      align: 'right',
      label: 'On match',
      active: true,
      leading: createRawSnippet(() => ({ render: () => '<span class="test-marker"></span>' }))
    });

    it('renders the supplied label in place of the absent port name', () => {
      expect(squish(body)).toContain('>On match<');
    });

    it('mirrors the order — lane chip, label, symbol', () => {
      const order = squish(body);
      expect(order.indexOf('flowdrop-badge--outline')).toBeLessThan(order.indexOf('On match'));
      expect(order.indexOf('On match')).toBeLessThan(order.indexOf('flowdrop-port-symbol'));
    });

    it('keeps the leading slot outside the mirrored group, at the row edge', () => {
      // Otherwise an execution marker lands between the label and its chips.
      const order = squish(body);
      expect(order.indexOf('test-marker')).toBeLessThan(order.indexOf('flowdrop-badge--outline'));
    });

    it('draws the trigger lane it always carries', () => {
      expect(hasGlyph(body, 'T')).toBe(true);
      expect(body).toContain('title="trigger"');
    });

    it('takes no lane colour exception without an id — `error` is a port id, not a label', () => {
      const named = html({ ...BRANCH_LANE }, { label: 'error', align: 'right' });
      expect(named).not.toContain('var(--fd-node-red)');
    });
  });

  describe('active', () => {
    // A boolean and not a caller-supplied class: GatewayNode's own scoped
    // `.text--active` would never reach this component's label.
    it('marks the label when the branch was taken', () => {
      expect(html({ dataType: 'trigger' }, { label: 'On match', active: true })).toContain(
        'fd-port-label__name--active'
      );
    });

    it('leaves it unmarked by default', () => {
      expect(html({ dataType: 'trigger' }, { label: 'On match' })).not.toContain(
        'fd-port-label__name--active'
      );
    });
  });

  describe('showRequired', () => {
    const required: NodePort = {
      id: 'prompt',
      name: 'Prompt',
      type: 'input',
      dataType: 'string',
      required: true
    };
    const optional: NodePort = { ...required, required: false };

    it('renders the marker for a required port when asked', () => {
      const body = html(required, { showRequired: true });
      expect(body).toContain('fd-port-label__required');
      expect(squish(body)).toContain('>Required<');
    });

    it('renders nothing for an optional port even when asked', () => {
      expect(html(optional, { showRequired: true })).not.toContain('fd-port-label__required');
    });

    it('renders nothing for a required port when not asked (the default)', () => {
      expect(html(required)).not.toContain('fd-port-label__required');
    });

    it('honours a caller-supplied wording', () => {
      const body = html(required, { showRequired: true, requiredLabel: 'Pflicht' });
      expect(squish(body)).toContain('>Pflicht<');
    });

    it('never renders the marker on a right-aligned (output) row', () => {
      const body = html({ ...required, type: 'output' }, { showRequired: true, align: 'right' });
      expect(body).not.toContain('fd-port-label__required');
    });
  });
});
