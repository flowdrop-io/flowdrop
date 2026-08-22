/**
 * Port shape symbols — what shape a port carries, said separately from which
 * lane it belongs to.
 *
 * A port row shows two independent facts: its JSON-Schema **shape** (is this a
 * string, a list, an object?) and its semantic **lane** (`messages`, `url`,
 * `tool`). Colour used to carry both, so it carried neither well. The shape
 * moves to a small glyph; the lane keeps its id in a quiet outlined chip and
 * keeps the colour.
 *
 * ## Where the shape comes from
 *
 * The server's `NodePort` DTO carries no JSON Schema type today (`schema?` is
 * declared for template autocomplete and no producer populates it), so the
 * shape is derived client-side from the lane. Every lane FlowDrop ships implies
 * exactly one shape, so the map below answers the question against every
 * backend — including older fddo and third-party servers that only implement
 * the port-config endpoint.
 *
 * Two things the derivation cannot do, both known and accepted:
 * - **`integer` vs `number` collapse.** The server already maps both onto lane
 *   `number`, so nothing is lost that the client ever had.
 * - **A site-defined lane resolves to `unknown` (`?`).** A lane added through
 *   the `port_config` overlay has no shape the client can know. `?` is the
 *   honest answer.
 *
 * {@link portShape} is the seam where that improves: a later release that
 * serves a shape per lane, or populates `NodePort.schema`, changes this one
 * function and no caller.
 *
 * It takes the **checker** for exactly that reason. Colour has always asked the
 * checker, which resolves an alias to its canonical lane and sees whatever the
 * backend served; a private lookup table cannot do either, so the same port got
 * a lane colour and a shapeless `?` at the same time. Routing shape through the
 * same source makes that class of disagreement unrepresentable, and means a
 * served shape lands here without touching a call site.
 */

import type { PortCompatibilityChecker } from './connections.js';

/**
 * The closed shape vocabulary. One glyph each, and every lane resolves to
 * exactly one of these.
 *
 * `trigger` and `callable` are not JSON-Schema shapes — they are the two
 * control lanes, whose payload is a signal and a callable respectively. They
 * get their own marks because rendering either as `?` would hide the one thing
 * a reader needs to know about them.
 */
export type PortShape =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'unknown'
  | 'trigger'
  | 'callable';

/**
 * The glyph shown for each shape. Deliberately tiny and ASCII: `{}` and `[]`
 * are the notation a developer already reads as object and array, and the
 * bracket idiom extends to `()` for a callable.
 *
 * `number` is `#` and not `I`, because the lane it renders covers floats —
 * `I` would be a lie on `Temperature: 0.7`. If a future release splits
 * `integer` out, `I` joins the set and `#` keeps meaning "number".
 */
export const SHAPE_GLYPH: Record<PortShape, string> = {
  string: 'S',
  number: '#',
  boolean: 'B',
  array: '[]',
  object: '{}',
  unknown: '?',
  trigger: 'T',
  callable: '()'
};

/**
 * A human-readable name per shape, for the symbol's tooltip. The glyph is a
 * compression for the eye; this is what it decompresses to.
 */
export const SHAPE_LABEL: Record<PortShape, string> = {
  string: 'text',
  number: 'number',
  boolean: 'true/false',
  array: 'list',
  object: 'object',
  unknown: 'unknown shape',
  trigger: 'trigger signal',
  callable: 'callable'
};

/**
 * Lane id → shape, for every lane the library ships (see
 * `config/defaultPortConfig.ts`, which this table is total over — a lane added
 * there without an entry here fails `tests/unit/utils/portShape.test.ts`).
 *
 * The media lanes (`file`, `image`, `audio`, `video`) are `unknown`, not
 * `string`. Asked directly, fddo has no answer: they are served vocabulary with
 * zero declaring ports, the schema-type→lane resolver
 * (`NodeMetadataResolver::mapSchemaTypeToDataType`) can never emit them, and no
 * fddo plan schedules a shape for them. "URI string" was a plausible guess with
 * nothing behind it, and a wrong glyph is worse than an honest `?`. Phase 2's
 * server-declared shape is how a site that does use them answers this.
 *
 * The legacy spellings (`text`, `list`, `integer`, `float`, `object`,
 * `document`, `picture`, `sound`, `movie`, `branch`) are here because
 * `colors.ts` still gives them a colour. Two tables answering about the same
 * lane must answer together — `portShape.test.ts` asserts this one is total
 * over that one.
 *
 * `messages` is `array` — a list of provider-shaped chat messages. Its colour
 * still comes from its own lane, which is the whole point of separating the
 * two channels: teal chip, `[]` glyph, no contradiction.
 */
const LANE_SHAPE: Record<string, PortShape> = {
  // Text and text-shaped scalars.
  string: 'string',
  text: 'string',
  url: 'string',
  email: 'string',
  date: 'string',
  datetime: 'string',
  time: 'string',

  // Numeric — `integer` and `float` are server-side spellings the payload
  // collapses onto `number`, kept here because the fallback colour map still
  // names them.
  number: 'number',
  integer: 'number',
  float: 'number',

  boolean: 'boolean',

  // Collections.
  array: 'array',
  list: 'array',
  'string[]': 'array',
  'number[]': 'array',
  'boolean[]': 'array',
  'json[]': 'array',
  'file[]': 'array',
  'image[]': 'array',
  messages: 'array',

  // Structured.
  json: 'object',
  object: 'object',

  // Media: served vocabulary with no declared shape anywhere. See above.
  file: 'unknown',
  image: 'unknown',
  audio: 'unknown',
  video: 'unknown',
  document: 'unknown',
  picture: 'unknown',
  sound: 'unknown',
  movie: 'unknown',

  // The sink, and its retired second spelling: a port that constrains nothing
  // has no shape to show.
  mixed: 'unknown',
  any: 'unknown',

  // Control lanes. `branch` is the legacy spelling of a gateway's outgoing
  // control path — same signal, older word.
  trigger: 'trigger',
  branch: 'trigger',
  tool: 'callable'
};

/**
 * Read-only view of the lane table. Not part of the package's public exports —
 * it exists so the test suite can assert the table is total over the shipped
 * port config, which is what stops a new lane shipping without a glyph.
 */
export const LANE_SHAPES: Readonly<Record<string, PortShape>> = LANE_SHAPE;

/** The port fields shape derivation reads. */
interface ShapedPort {
  dataType?: string;
}

/**
 * The shape a lane id implies, straight from the table. `unknown` for any lane
 * not in it, including every site-defined one.
 *
 * Case-insensitive, because `getDataTypeColorToken` is: a backend that spells
 * its lane `String` gets a colour, and must not then get a shapeless `?`.
 *
 * This is the offline half. Prefer {@link portShape}, which consults the served
 * vocabulary first.
 */
export function laneShape(dataType: string | undefined): PortShape {
  if (!dataType) return 'unknown';
  return LANE_SHAPE[dataType.toLowerCase()] ?? 'unknown';
}

/**
 * The shape to draw for a port — the seam described at the top of this file.
 *
 * Resolves the lane through the checker before consulting the table, so an
 * alias (`text` declared as an alias of `string`) is shaped as the lane it
 * aliases rather than as an unknown of its own.
 */
export function portShape(checker: PortCompatibilityChecker, port: ShapedPort): PortShape {
  const canonical = port.dataType ? checker.getDataTypeConfig(port.dataType)?.id : undefined;
  return laneShape(canonical ?? port.dataType);
}

/**
 * The glyph to draw for a port — the single entry point components call.
 */
export function portGlyph(checker: PortCompatibilityChecker, port: ShapedPort): string {
  return SHAPE_GLYPH[portShape(checker, port)];
}

/**
 * A human name for a port's shape, for the symbol's tooltip.
 */
export function portShapeLabel(checker: PortCompatibilityChecker, port: ShapedPort): string {
  return SHAPE_LABEL[portShape(checker, port)];
}
