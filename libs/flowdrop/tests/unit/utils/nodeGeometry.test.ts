import { describe, it, expect } from 'vitest';
import {
  computeNodeGeometry,
  computeShapeGeometry,
  shapePortY,
  estimatePillWidth,
  handleCenter,
  isCompletionPort,
  NODE_DESCRIPTION_BAND_HEIGHT,
  NODE_EXEC_PIN_Y,
  NODE_HEADER_HEIGHT,
  NODE_PILL_MAX_WIDTH,
  NODE_ROW_PITCH,
  NODE_WIDTH,
  NODE_WIDTH_WIDE,
  type GeometryPort,
  type NodeGeometryInput
} from '../../../src/lib/utils/nodeGeometry.js';

const port = (id: string, dataType = 'string', name = id): GeometryPort => ({
  id,
  dataType,
  name
});
const trigger = port('trigger', 'trigger', 'Trigger');

/** The shapes the card has to serve: every one runs through the same contract. */
const CASES: Record<string, Pick<NodeGeometryInput, 'inputs' | 'outputs'>> = {
  'workflow node (trigger in and out, 1 in, 4 out)': {
    inputs: [port('in'), trigger],
    outputs: [port('a'), port('b'), port('c'), port('d'), trigger]
  },
  'no inputs (a trigger node)': { inputs: [], outputs: [port('data'), trigger] },
  'more outputs than inputs': {
    inputs: [port('in')],
    outputs: [port('a'), port('b'), port('c'), port('d'), port('e'), port('f')]
  },
  'more inputs than outputs': {
    inputs: [port('a'), port('b'), port('c'), trigger],
    outputs: [port('out')]
  },
  'gateway: branches as output rows': {
    inputs: [port('value'), trigger],
    outputs: ['true', 'false', 'default'].map((id) => port(id, 'trigger'))
  },
  'no ports at all': { inputs: [], outputs: [] },
  'exec pins only': { inputs: [trigger], outputs: [trigger] }
};

describe('computeNodeGeometry: the straight-wire contract', () => {
  for (const [label, ports] of Object.entries(CASES)) {
    for (const showDescriptions of [false, true]) {
      describe(`${label}, descriptions ${showDescriptions ? 'on' : 'off'}`, () => {
        const g = computeNodeGeometry({ ...ports, showDescriptions });

        it('is a multiple of 20 wide and tall, and the width is 280 or 320', () => {
          expect(g.width % 20).toBe(0);
          expect([NODE_WIDTH, NODE_WIDTH_WIDE]).toContain(g.width);
          expect(g.height % 20).toBe(0);
        });

        it('has every handle centre a multiple of 20 from the node top', () => {
          for (const h of g.handles) expect(h.y % 20).toBe(0);
        });

        it('has a 60px header, with the exec pins at y = 20 on the card edges', () => {
          expect(g.headerHeight).toBe(60);
          for (const h of g.handles.filter((x) => x.kind === 'pin')) {
            expect(h.y).toBe(20);
            expect(h.x).toBe(h.direction === 'input' ? 0 : g.width);
          }
        });

        it('starts the first row at y = 80 (140 with the band), at a pitch of 40', () => {
          const first = showDescriptions ? 140 : 80;
          g.rows.forEach((row, i) => expect(row.y).toBe(first + i * 40));
          expect(g.height).toBe(first - 20 + g.rowCount * 40);
        });

        it('puts row handles on the card edges, on the row centre', () => {
          for (const h of g.handles.filter((x) => x.kind === 'row')) {
            expect(h.x).toBe(h.direction === 'input' ? 0 : g.width);
            expect(h.y).toBe(g.rows[h.row!].y);
          }
        });
      });
    }
  }

  it('reserves the 60px description band on every node while the setting is on, and only then', () => {
    for (const ports of Object.values(CASES)) {
      const off = computeNodeGeometry({ ...ports, showDescriptions: false });
      const on = computeNodeGeometry({ ...ports, showDescriptions: true });
      expect(off.descriptionBand).toBe(0);
      expect(on.descriptionBand).toBe(NODE_DESCRIPTION_BAND_HEIGHT);
      expect(on.height - off.height).toBe(60);
      // every port moves by the same amount, so wires stay straight
      for (const h of off.handles.filter((x) => x.kind === 'row')) {
        const moved = on.handles.find((x) => x.portId === h.portId && x.direction === h.direction)!;
        expect(moved.y - h.y).toBe(60);
      }
      // pins do not move
      for (const h of on.handles.filter((x) => x.kind === 'pin')) expect(h.y).toBe(20);
    }
  });

  it('draws the completion trigger as a pin, not a row, and keeps branch triggers as rows', () => {
    const g = computeNodeGeometry({
      ...CASES['gateway: branches as output rows'],
      showDescriptions: false
    });
    expect(g.execInput?.portId).toBe('trigger');
    expect(g.execOutput).toBeNull();
    expect(g.rows.map((r) => r.output?.id)).toEqual(['true', 'false', 'default']);
    expect(g.rows[0].input?.id).toBe('value');
  });

  it('keeps the trigger as a row for shapes without a header', () => {
    const g = computeNodeGeometry({
      inputs: [trigger],
      outputs: [trigger],
      showDescriptions: false,
      execPins: 'none'
    });
    expect(g.execInput).toBeNull();
    expect(g.rowCount).toBe(1);
    expect(g.rows[0].input?.id).toBe('trigger');
  });

  it('shares rows: inputs left, outputs right, rows = max(in, out)', () => {
    const g = computeNodeGeometry({
      inputs: [port('a'), port('b')],
      outputs: [port('x'), port('y'), port('z')],
      showDescriptions: false
    });
    expect(g.rowCount).toBe(3);
    expect(g.rows[1]).toMatchObject({ input: { id: 'b' }, output: { id: 'y' } });
    expect(g.rows[2].input).toBeNull();
    expect(g.height).toBe(60 + 3 * 40);
  });

  it('keeps one row for a node with no ports, so the body is never empty', () => {
    const g = computeNodeGeometry({ inputs: [], outputs: [], showDescriptions: false });
    expect(g.rowCount).toBe(1);
    expect(g.height).toBe(100);
  });

  it("widens to 320 when a row's two pills would collide, and not before", () => {
    const long = 'a_rather_long_port_name_that_fills_the_pill';
    expect(estimatePillWidth(port(long))).toBe(NODE_PILL_MAX_WIDTH);
    const colliding = computeNodeGeometry({
      inputs: [port(long)],
      outputs: [port(long)],
      showDescriptions: false
    });
    expect(colliding.width).toBe(320);
    expect(colliding.wide).toBe(true);
    // output on a different row than the long input: no collision
    const apart = computeNodeGeometry({
      inputs: [port(long), port('b')],
      outputs: [port('x'), port(long)],
      showDescriptions: false
    });
    expect(apart.width).toBe(280);
    expect(handleCenter(colliding, 'output', long)).toEqual({ x: 320, y: 80 });
  });

  it('never lets a pill outgrow 128px', () => {
    expect(estimatePillWidth(port('x'.repeat(200)))).toBe(128);
    expect(estimatePillWidth(port('ab'), false)).toBeLessThan(128);
  });

  it('answers handleCenter for known ports and undefined for unknown ones', () => {
    const g = computeNodeGeometry({
      ...CASES['workflow node (trigger in and out, 1 in, 4 out)'],
      showDescriptions: false
    });
    expect(handleCenter(g, 'input', 'trigger')).toEqual({ x: 0, y: NODE_EXEC_PIN_Y });
    expect(handleCenter(g, 'output', 'trigger')).toEqual({ x: g.width, y: NODE_EXEC_PIN_Y });
    expect(handleCenter(g, 'input', 'in')).toEqual({ x: 0, y: 80 });
    expect(handleCenter(g, 'output', 'd')).toEqual({ x: g.width, y: 80 + 3 * NODE_ROW_PITCH });
    expect(handleCenter(g, 'input', 'nope')).toBeUndefined();
    expect(NODE_HEADER_HEIGHT).toBe(60);
  });

  it('recognises only the completion port as a pin', () => {
    expect(isCompletionPort(trigger)).toBe(true);
    expect(isCompletionPort(port('trigger', 'string'))).toBe(false);
    expect(isCompletionPort(port('true', 'trigger'))).toBe(false);
  });
});

describe('every node type meets the invariant', () => {
  const branches = (names: string[]) => names.map((n) => port(n, 'trigger', n || '?'));
  const TYPES: Record<string, NodeGeometryInput> = {
    'switch, 5 branches': {
      inputs: [port('value'), trigger],
      outputs: branches(['a', 'b', 'c', 'd', 'default']),
      execPins: 'input',
      showDescriptions: false
    },
    'if/else': {
      inputs: [port('data'), trigger],
      outputs: branches(['True', 'False']),
      execPins: 'input',
      showDescriptions: false
    },
    'boolean gateway, no inputs besides the trigger': {
      inputs: [trigger],
      outputs: branches(['True', 'False']),
      execPins: 'input',
      showDescriptions: true
    },
    'gateway with two unnamed branches (B1)': {
      inputs: [trigger],
      outputs: branches(['', '']),
      execPins: 'input',
      showDescriptions: false
    },
    'gateway with no branches': {
      inputs: [trigger],
      outputs: [],
      execPins: 'input',
      showDescriptions: false
    },
    'tool (one tool port each side, no pins)': {
      inputs: [port('tool', 'tool', 'Tool')],
      outputs: [port('tool', 'tool', 'Tool')],
      execPins: 'none',
      showDescriptions: true
    },
    'tool repurposed with a trigger port stays a row': {
      inputs: [trigger],
      outputs: [trigger],
      execPins: 'none',
      showDescriptions: false
    }
  };

  for (const [label, input] of Object.entries(TYPES)) {
    it(`${label}: box and handles on the 20px grid`, () => {
      const g = computeNodeGeometry(input);
      expect(g.width % 20).toBe(0);
      expect(g.height % 20).toBe(0);
      expect(g.headerHeight).toBe(60);
      for (const h of g.handles) expect(h.y % 20, `${h.portId} y=${h.y}`).toBe(0);
      g.rows.forEach((row, i) => expect(row.y).toBe(g.bodyTop + 20 + i * 40));
    });
  }

  it('lays a switch out as rows: one branch per row, the trigger a pin', () => {
    const g = computeNodeGeometry(TYPES['switch, 5 branches']);
    expect(g.rows.map((r) => r.output?.id)).toEqual(['a', 'b', 'c', 'd', 'default']);
    expect(g.rows.map((r) => r.y)).toEqual([80, 120, 160, 200, 240]);
    expect(g.execInput?.y).toBe(20);
    expect(g.execOutput).toBeNull();
    expect(g.height).toBe(60 + 5 * 40);
  });

  it('gives two same-named branches two rows (B1: no duplicate-key crash downstream)', () => {
    const g = computeNodeGeometry(TYPES['gateway with two unnamed branches (B1)']);
    expect(g.rows).toHaveLength(2);
    expect(g.rows.map((r) => r.y)).toEqual([80, 120]);
    expect(g.rows.every((r) => r.output !== null)).toBe(true);
  });

  it("keeps a branch named 'trigger' a row when only the input is a pin", () => {
    const g = computeNodeGeometry({
      inputs: [trigger],
      outputs: [port('trigger', 'trigger', 'trigger')],
      execPins: 'input',
      showDescriptions: false
    });
    expect(g.execInput?.y).toBe(20);
    expect(g.execOutput).toBeNull();
    expect(g.rows[0].output?.id).toBe('trigger');
  });

  it('hands the port back on every handle, so a card can draw it', () => {
    const g = computeNodeGeometry(TYPES['if/else']);
    for (const h of g.handles) expect(h.port.id).toBe(h.portId);
  });
});

describe('computeShapeGeometry: Simple, Square and Terminal', () => {
  const ports = (n: number) => Array.from({ length: n }, (_, i) => port(`p${i}`));

  for (const [ins, outs] of [
    [0, 0],
    [1, 1],
    [0, 1],
    [1, 0],
    [2, 1],
    [3, 3],
    [1, 5]
  ]) {
    for (const width of [undefined, 80]) {
      it(`${ins} in, ${outs} out, width ${width ?? 'default'}: box and handle centres on the grid`, () => {
        const g = computeShapeGeometry({ inputs: ports(ins), outputs: ports(outs), width });
        expect(g.width % 20).toBe(0);
        expect(g.height % 40).toBe(0);
        expect(g.height).toBeGreaterThanOrEqual(80);
        expect(g.handles).toHaveLength(ins + outs);
        for (const h of g.handles) {
          expect(h.y % 20, `${h.portId} y=${h.y}`).toBe(0);
          expect(h.y).toBeLessThan(g.height);
          expect(h.x).toBe(h.direction === 'input' ? 0 : g.width);
        }
      });
    }
  }

  it('puts a lone port at 40 and several from 20 at a pitch of 40', () => {
    expect(shapePortY(0, 1)).toBe(40);
    expect([0, 1, 2].map((i) => shapePortY(i, 3))).toEqual([20, 60, 100]);
    const g = computeShapeGeometry({ inputs: ports(1), outputs: ports(3) });
    expect(g.height).toBe(120);
    expect(handleCenter(g, 'input', 'p0')?.y).toBe(40);
    expect(handleCenter(g, 'output', 'p2')?.y).toBe(100);
  });
});
