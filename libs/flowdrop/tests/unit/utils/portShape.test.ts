/**
 * Unit Tests - Port shape derivation
 *
 * Covers the lane → shape table (which must be TOTAL over both the shipped
 * `DEFAULT_PORT_CONFIG` and the legacy spellings `colors.ts` still colours),
 * the documented per-lane decisions, the checker-first resolution of aliases
 * and casing, and the `unknown` fallback.
 *
 * The two totality blocks are the point: a lane that has a colour and no shape
 * renders a coloured `?`, which is the disagreement this file exists to make
 * impossible. When a server starts declaring shapes, `portShape` reads them
 * from the checker it already takes and this file grows a block.
 */

import { describe, it, expect } from 'vitest';
import {
  SHAPE_GLYPH,
  SHAPE_LABEL,
  LANE_SHAPES,
  laneShape,
  portShape,
  portGlyph,
  portShapeLabel,
  type PortShape
} from '$lib/utils/portShape.js';
import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
import { LEGACY_DATA_TYPE_COLORS } from '$lib/utils/colors.js';
import { PortCompatibilityChecker } from '$lib/utils/connections.js';

/** The shipped vocabulary, as every component sees it. */
const checker = new PortCompatibilityChecker(DEFAULT_PORT_CONFIG);

const SHAPES = Object.keys(SHAPE_GLYPH) as PortShape[];

describe('LANE_SHAPES is total over the shipped port config', () => {
  const laneIds = DEFAULT_PORT_CONFIG.dataTypes.map((t) => t.id);

  it('ships a non-empty lane vocabulary (guards the loop below)', () => {
    expect(laneIds.length).toBeGreaterThan(10);
  });

  it.each(laneIds)('lane `%s` has an explicit entry in LANE_SHAPES', (id) => {
    // Explicit: the table must LIST the lane, not merely fall back to unknown.
    expect(Object.prototype.hasOwnProperty.call(LANE_SHAPES, id)).toBe(true);
  });

  it.each(laneIds)('lane `%s` resolves to a shape present in SHAPE_GLYPH', (id) => {
    const shape = laneShape(id);
    expect(SHAPE_GLYPH).toHaveProperty(shape);
    expect(SHAPE_GLYPH[shape]).toBeTruthy();
  });

  it('every LANE_SHAPES value is a known shape', () => {
    for (const [lane, shape] of Object.entries(LANE_SHAPES)) {
      expect(SHAPES, `lane ${lane}`).toContain(shape);
    }
  });
});

describe('LANE_SHAPES is total over the legacy spellings colors.ts still paints', () => {
  const legacy = Object.keys(LEGACY_DATA_TYPE_COLORS);

  it('ships a non-empty legacy list (guards the loop below)', () => {
    expect(legacy.length).toBeGreaterThan(0);
  });

  it.each(legacy)('legacy spelling `%s` has a shape, not just a colour', (lane) => {
    // A spelling with a colour and no shape draws a coloured `?` — the two
    // tables disagreeing about one lane, which is the whole failure mode.
    expect(Object.prototype.hasOwnProperty.call(LANE_SHAPES, lane)).toBe(true);
  });

  it('shapes the legacy spellings as their modern lane, not as unknown', () => {
    expect(laneShape('text')).toBe('string');
    expect(laneShape('integer')).toBe('number');
    expect(laneShape('list')).toBe('array');
    expect(laneShape('object')).toBe('object');
    expect(laneShape('branch')).toBe('trigger');
  });

  it('keeps the legacy media spellings on the media policy', () => {
    // `document`/`picture`/`sound`/`movie` are older words for `file`/`image`/
    // `audio`/`video`, which declare no shape anywhere. `?` stays correct.
    for (const lane of ['document', 'picture', 'sound', 'movie']) {
      expect(laneShape(lane), lane).toBe('unknown');
    }
  });
});

describe('the checker is consulted before the table', () => {
  it('shapes a lane spelled in another case', () => {
    // getDataTypeColorToken lowercases, so a capitalised lane colours; it must
    // not then come back shapeless.
    expect(portGlyph(checker, { dataType: 'String' })).toBe('S');
    expect(portGlyph(checker, { dataType: 'MESSAGES' })).toBe('[]');
  });

  it('shapes an alias as the lane it aliases', () => {
    const aliased = new PortCompatibilityChecker({
      ...DEFAULT_PORT_CONFIG,
      dataTypes: DEFAULT_PORT_CONFIG.dataTypes.map((dt) =>
        dt.id === 'json' ? { ...dt, aliases: ['payload'] } : dt
      )
    });

    // `payload` is in no table anywhere; the checker resolves it to `json`.
    expect(laneShape('payload')).toBe('unknown');
    expect(portGlyph(aliased, { dataType: 'payload' })).toBe('{}');
  });

  it('still answers `?` for a lane the checker has never heard of', () => {
    expect(portGlyph(checker, { dataType: 'order' })).toBe('?');
  });
});

describe('laneShape — the documented decisions', () => {
  it.each([
    ['number', '#'],
    ['integer', '#'],
    ['float', '#'],
    ['tool', '()'],
    ['trigger', 'T'],
    ['messages', '[]'],
    ['json', '{}'],
    ['object', '{}'],
    ['string[]', '[]'],
    ['array', '[]'],
    ['string', 'S'],
    ['url', 'S'],
    ['boolean', 'B'],
    ['mixed', '?'],
    ['any', '?']
  ])('lane `%s` draws `%s`', (lane, glyph) => {
    expect(portGlyph(checker, { dataType: lane })).toBe(glyph);
  });

  it('number is `#`, never `I` — the lane covers floats', () => {
    expect(laneShape('number')).toBe('number');
    expect(portGlyph(checker, { dataType: 'number' })).not.toBe('I');
  });

  it.each(['file', 'image', 'audio', 'video'])(
    'media lane `%s` is an honest `?` (fddo declares no shape)',
    (lane) => {
      expect(laneShape(lane)).toBe('unknown');
      expect(portGlyph(checker, { dataType: lane })).toBe('?');
    }
  );

  it('the media ARRAY lanes are still arrays', () => {
    expect(portGlyph(checker, { dataType: 'file[]' })).toBe('[]');
    expect(portGlyph(checker, { dataType: 'image[]' })).toBe('[]');
  });
});

describe('unknown lanes', () => {
  it('a site-defined lane resolves to unknown / `?`', () => {
    expect(laneShape('order')).toBe('unknown');
    expect(portShape(checker, { dataType: 'order' })).toBe('unknown');
    expect(portGlyph(checker, { dataType: 'order' })).toBe('?');
  });

  it('a port with no dataType resolves to unknown / `?`', () => {
    expect(laneShape(undefined)).toBe('unknown');
    expect(laneShape('')).toBe('unknown');
    expect(portShape(checker, {})).toBe('unknown');
    expect(portGlyph(checker, {})).toBe('?');
    expect(portGlyph(checker, { dataType: undefined })).toBe('?');
  });
});

describe('portShapeLabel', () => {
  it.each(SHAPES)('shape `%s` has a non-empty human label', (shape) => {
    expect(SHAPE_LABEL[shape]).toBeTruthy();
    expect(SHAPE_LABEL[shape].trim().length).toBeGreaterThan(0);
  });

  it('labels a port through its lane', () => {
    expect(portShapeLabel(checker, { dataType: 'messages' })).toBe('list');
    expect(portShapeLabel(checker, { dataType: 'tool' })).toBe('callable');
    expect(portShapeLabel(checker, { dataType: 'order' })).toBe('unknown shape');
    expect(portShapeLabel(checker, {})).toBe('unknown shape');
  });
});
