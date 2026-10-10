/**
 * Node card geometry: the straight-wire contract as one pure function.
 *
 * Every node position is on the 20px grid, and every handle centre is a
 * multiple of 20 from the node top, so any output can line up with any input in
 * a straight wire. The rules (Graphite G8, "Geometry contract"):
 *
 * | Part              | Value                                                       |
 * |-------------------|-------------------------------------------------------------|
 * | Width             | 280, or 320 when a row's input and output pills would collide |
 * | Header            | always 60                                                   |
 * | Exec pins         | y = 20, at x = 0 and x = width                              |
 * | Description band  | 60, reserved on EVERY node while the setting is on          |
 * | Port rows         | first row centre at 80 (140 with the band), pitch 40        |
 * | Border            | drawn inside the box, so it never adds to the height        |
 *
 * Nothing here measures the DOM. The node component renders what this function
 * says (it positions every handle from `handleY`), and the edge, alignment and
 * layout code can ask the same function where a handle will be before a node
 * is rendered. Comfortable density only (decision D2): a Compact density would
 * move different rows by different amounts and bend straight wires.
 *
 * Other node types plug in through the same input: a gateway passes its
 * branches as `outputs`, a node with no inputs passes `inputs: []`, and
 * `execPins: 'none'` keeps the completion trigger as an ordinary row for shapes
 * that have no header (Simple, Square, Terminal).
 *
 * @module utils/nodeGeometry
 */

/** The canvas grid every offset below is a multiple of. */
export const NODE_GRID = 20;
/** Header height. Fixed: a long title wraps to two lines and clamps, it never grows the header. */
export const NODE_HEADER_HEIGHT = 60;
/** The description band, reserved on every node while descriptions are shown. */
export const NODE_DESCRIPTION_BAND_HEIGHT = 60;
/** Exec pins sit on the second grid line of the header. */
export const NODE_EXEC_PIN_Y = 20;
/** Comfortable row pitch. */
export const NODE_ROW_PITCH = 40;
/** Default width. */
export const NODE_WIDTH = 280;
/** Width when a row's input and output pills would collide: one 40px step wider. */
export const NODE_WIDTH_WIDE = 320;
/** A port pill never grows past this (px); the rest is an ellipsis, the full name is in the tooltip. */
export const NODE_PILL_MAX_WIDTH = 128;
/** Horizontal padding inside a pill, both sides together (12 + 14). */
const PILL_PADDING = 26;
/** Space the "*" of a required, open input takes. */
const PILL_REQUIRED_MARK = 8;
/** Average glyph advance of a 12px / 500 label, a deliberately slightly generous estimate. */
const PILL_CHAR_WIDTH = 6.5;
/** Air kept between an input pill and an output pill on one row. */
const PILL_MIN_GAP = 32;

/** The id and data type of the completion port, which is drawn as a header pin. */
export const EXEC_PORT_ID = 'trigger';

/** What the geometry needs to know about a port. */
export interface GeometryPort {
  id: string;
  name?: string;
  dataType: string;
  required?: boolean;
}

export interface NodeGeometryInput {
  /** Exposed input ports, in render order (the completion trigger included). */
  inputs: readonly GeometryPort[];
  /** Exposed output ports, in render order (a gateway passes its branches here). */
  outputs: readonly GeometryPort[];
  /** The *Show descriptions* setting. */
  showDescriptions: boolean;
  /**
   * `'completion'` (default): the port with id and data type `trigger` becomes a
   * pin in the header, in and out. `'none'`: it stays an ordinary row.
   */
  execPins?: 'completion' | 'none';
  /** Rows are at least this many (default 1, so an empty node keeps a body). */
  minRows?: number;
  /** A shape with a fixed width opts out of the pill rule. */
  width?: number;
}

export type HandleDirection = 'input' | 'output';

export interface HandleGeometry {
  portId: string;
  direction: HandleDirection;
  /** `pin` in the header, `row` in the body. */
  kind: 'pin' | 'row';
  /** Centre, from the node's top-left corner. */
  x: number;
  y: number;
  /** Row index for `row` handles. */
  row?: number;
}

export interface RowGeometry {
  index: number;
  /** Row centre. */
  y: number;
  input: GeometryPort | null;
  output: GeometryPort | null;
}

export interface NodeGeometry {
  width: number;
  height: number;
  headerHeight: number;
  /** 0, or 60 while descriptions are shown. */
  descriptionBand: number;
  /** Top of the port rows (header + band). */
  bodyTop: number;
  rowPitch: number;
  rowCount: number;
  rows: RowGeometry[];
  /** The header pins, when the completion ports exist. */
  execInput: HandleGeometry | null;
  execOutput: HandleGeometry | null;
  /** Every handle, pins first. */
  handles: HandleGeometry[];
  /** True when a row's pills would have collided at 280. */
  wide: boolean;
}

/** True for the completion port: id and data type `trigger`. */
export function isCompletionPort(port: { id: string; dataType: string }): boolean {
  return port.id === EXEC_PORT_ID && port.dataType === 'trigger';
}

/**
 * The width a pill is given (px): its label plus padding, capped at 128.
 * An estimate on purpose, so the same name always lays out the same wherever it
 * is measured (no font, no DOM).
 */
export function estimatePillWidth(port: GeometryPort, showRequiredMark = false): number {
  const text = port.name ?? port.id;
  const mark = showRequiredMark && port.required ? PILL_REQUIRED_MARK : 0;
  return Math.min(
    NODE_PILL_MAX_WIDTH,
    Math.ceil(PILL_PADDING + mark + text.length * PILL_CHAR_WIDTH)
  );
}

/**
 * Compute a node card's geometry.
 *
 * @param input - Exposed ports, in order, and the descriptions setting
 */
export function computeNodeGeometry(input: NodeGeometryInput): NodeGeometry {
  const pins = (input.execPins ?? 'completion') === 'completion';
  const execIn = pins ? (input.inputs.find(isCompletionPort) ?? null) : null;
  const execOut = pins ? (input.outputs.find(isCompletionPort) ?? null) : null;
  const inputs = input.inputs.filter((port) => port !== execIn);
  const outputs = input.outputs.filter((port) => port !== execOut);

  const rowCount = Math.max(inputs.length, outputs.length, input.minRows ?? 1);
  const descriptionBand = input.showDescriptions ? NODE_DESCRIPTION_BAND_HEIGHT : 0;
  const bodyTop = NODE_HEADER_HEIGHT + descriptionBand;

  // Widen to one 40px step when any row's two pills would meet.
  let wide = false;
  for (let i = 0; i < Math.min(inputs.length, outputs.length); i++) {
    if (
      estimatePillWidth(inputs[i], true) + estimatePillWidth(outputs[i]) + PILL_MIN_GAP >
      NODE_WIDTH
    ) {
      wide = true;
      break;
    }
  }
  const width = input.width ?? (wide ? NODE_WIDTH_WIDE : NODE_WIDTH);

  const rows: RowGeometry[] = [];
  const handles: HandleGeometry[] = [];

  if (execIn) {
    handles.push({
      portId: execIn.id,
      direction: 'input',
      kind: 'pin',
      x: 0,
      y: NODE_EXEC_PIN_Y
    });
  }
  if (execOut) {
    handles.push({
      portId: execOut.id,
      direction: 'output',
      kind: 'pin',
      x: width,
      y: NODE_EXEC_PIN_Y
    });
  }

  for (let i = 0; i < rowCount; i++) {
    const y = bodyTop + NODE_GRID + i * NODE_ROW_PITCH;
    const rowInput = inputs[i] ?? null;
    const rowOutput = outputs[i] ?? null;
    rows.push({ index: i, y, input: rowInput, output: rowOutput });
    if (rowInput) {
      handles.push({ portId: rowInput.id, direction: 'input', kind: 'row', x: 0, y, row: i });
    }
    if (rowOutput) {
      handles.push({
        portId: rowOutput.id,
        direction: 'output',
        kind: 'row',
        x: width,
        y,
        row: i
      });
    }
  }

  return {
    width,
    height: bodyTop + rowCount * NODE_ROW_PITCH,
    headerHeight: NODE_HEADER_HEIGHT,
    descriptionBand,
    bodyTop,
    rowPitch: NODE_ROW_PITCH,
    rowCount,
    rows,
    execInput: handles.find((h) => h.kind === 'pin' && h.direction === 'input') ?? null,
    execOutput: handles.find((h) => h.kind === 'pin' && h.direction === 'output') ?? null,
    handles,
    wide
  };
}

/** Where a port's handle centre is, from the node's top-left, or undefined for an unknown port. */
export function handleCenter(
  geometry: NodeGeometry,
  direction: HandleDirection,
  portId: string
): { x: number; y: number } | undefined {
  const handle = geometry.handles.find((h) => h.direction === direction && h.portId === portId);
  return handle ? { x: handle.x, y: handle.y } : undefined;
}
