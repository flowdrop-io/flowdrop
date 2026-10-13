/**
 * The two example graphs of the design page (process/plans/node-layout-primitives/design.html),
 * in the design's own geometry: cards 240 wide, first port row at 80, pitch 40.
 */
import type { LayoutCard, LayoutGraph, LayoutWire } from '../../../src/lib/layout/types.js';

const W = 240;

interface DemoNode {
  id: string;
  x: number;
  y: number;
  inputs: string[];
  outputs: string[];
  fixed?: string[];
}

export function demoCard({ id, x, y, inputs, outputs, fixed = [] }: DemoNode): LayoutCard {
  const rows = Math.max(inputs.length, outputs.length, 1);
  const handle = (dx: number) => (portId: string, i: number) => ({
    portId,
    dx,
    dy: 80 + i * 40,
    ...(fixed.includes(portId) ? { fixed: true } : {})
  });
  return {
    id,
    kind: 'card',
    x,
    y,
    width: W,
    height: 80 + (rows - 1) * 40 + 40,
    inputs: inputs.map(handle(0)),
    outputs: outputs.map(handle(W))
  };
}

export function demoWire(
  s: string,
  sp: string,
  t: string,
  tp: string,
  loopback = false
): LayoutWire {
  return {
    id: `${s}.${sp}>${t}.${tp}`,
    source: s,
    sourcePort: sp,
    target: t,
    targetPort: tp,
    loopback
  };
}

/** "tangled": crossings, an overlap, a loop. The caption sits right above compose; a note under the loop. */
export function tangled(): LayoutGraph {
  return {
    cards: [
      demoCard({ id: 'form', x: 0, y: 100, inputs: [], outputs: ['email', 'message'] }),
      demoCard({
        id: 'classify',
        x: 360,
        y: 100,
        inputs: ['text'],
        outputs: ['label', 'confidence']
      }),
      demoCard({ id: 'lookup', x: 360, y: 200, inputs: ['email'], outputs: ['contact'] }),
      demoCard({ id: 'compose', x: 720, y: 160, inputs: ['contact', 'label'], outputs: ['reply'] }),
      demoCard({
        id: 'loop',
        x: 1080,
        y: 180,
        inputs: ['items', 'loop_back'],
        outputs: ['item', 'done'],
        fixed: ['loop_back']
      }),
      demoCard({ id: 'send', x: 1440, y: 300, inputs: ['to'], outputs: ['sent'] }),
      {
        id: 'cap1',
        kind: 'caption',
        x: 720,
        y: 100,
        width: 200,
        height: 40,
        inputs: [],
        outputs: []
      },
      {
        id: 'note1',
        kind: 'note',
        x: 1080,
        y: 480,
        width: 240,
        height: 100,
        inputs: [],
        outputs: []
      }
    ],
    wires: [
      demoWire('form', 'message', 'classify', 'text'),
      demoWire('form', 'email', 'lookup', 'email'),
      demoWire('lookup', 'contact', 'compose', 'contact'),
      demoWire('classify', 'label', 'compose', 'label'),
      demoWire('compose', 'reply', 'loop', 'items'),
      demoWire('loop', 'item', 'send', 'to'),
      demoWire('send', 'sent', 'loop', 'loop_back', true)
    ]
  };
}

/** "right to left": 7 cards laid out backwards, 8 backward wires, 12 crossings. */
export function rightToLeft(): LayoutGraph {
  return {
    cards: [
      demoCard({ id: 'invoice', x: 0, y: 100, inputs: ['total', 'customer'], outputs: ['pdf'] }),
      demoCard({ id: 'notify', x: 0, y: 460, inputs: ['items'], outputs: ['ok'] }),
      demoCard({ id: 'price', x: 360, y: 160, inputs: ['order', 'customer'], outputs: ['total'] }),
      demoCard({ id: 'mail', x: 360, y: 480, inputs: ['pdf', 'missing'], outputs: ['sent'] }),
      demoCard({
        id: 'check',
        x: 720,
        y: 440,
        inputs: ['order'],
        outputs: ['available', 'missing']
      }),
      demoCard({ id: 'parse', x: 1080, y: 120, inputs: ['json'], outputs: ['order', 'customer'] }),
      demoCard({ id: 'hook', x: 1440, y: 300, inputs: [], outputs: ['payload', 'headers'] })
    ],
    wires: [
      demoWire('hook', 'payload', 'parse', 'json'),
      demoWire('parse', 'order', 'check', 'order'),
      demoWire('parse', 'order', 'price', 'order'),
      demoWire('parse', 'customer', 'price', 'customer'),
      demoWire('parse', 'customer', 'invoice', 'customer'),
      demoWire('check', 'available', 'notify', 'items'),
      demoWire('price', 'total', 'invoice', 'total'),
      demoWire('invoice', 'pdf', 'mail', 'pdf'),
      demoWire('check', 'missing', 'mail', 'missing')
    ]
  };
}
