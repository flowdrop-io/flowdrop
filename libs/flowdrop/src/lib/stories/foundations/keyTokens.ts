/**
 * The handful of tokens a developer reaches for first, with what each is for.
 *
 * Only names and guidance live here, never values: the pages read values from
 * the running skin. `keyTokens.test.ts` fails when a name here stops existing
 * in tokens.css, so this list cannot quietly drift.
 */

export interface KeyToken {
  /** Custom property name, with the leading `--`. */
  name: string;
  /** What it is for, in a few words. */
  use: string;
}

export interface KeyGroup {
  title: string;
  /** One or two sentences: the idea behind the group. */
  intro: string;
  tokens: KeyToken[];
}

export const KEY_COLOURS: KeyGroup[] = [
  {
    title: 'Surfaces',
    intro:
      'Where things sit. Panels and cards are the brightest layer; the canvas sits one step darker so nodes stand out.',
    tokens: [
      { name: '--fd-background', use: 'Panels, sheets, dialogs' },
      { name: '--fd-card', use: 'Cards and node bodies' },
      { name: '--fd-canvas-bg', use: 'The canvas behind the nodes' },
      { name: '--fd-muted', use: 'Quiet fills: inputs, selected rows' },
      { name: '--fd-subtle', use: 'Hover fill on quiet items' }
    ]
  },
  {
    title: 'Text',
    intro: 'Two levels are enough for almost everything: the main text and a quieter one.',
    tokens: [
      { name: '--fd-foreground', use: 'Main text and icons' },
      { name: '--fd-muted-foreground', use: 'Secondary text, help, timestamps' }
    ]
  },
  {
    title: 'Lines',
    intro:
      'One-pixel rules separate areas. Use the stronger one only when a line must hold up on its own.',
    tokens: [
      { name: '--fd-border', use: 'Default divider and outline' },
      { name: '--fd-border-muted', use: 'Lines inside a surface' },
      { name: '--fd-border-strong', use: 'Inputs and outlines that must be seen' },
      { name: '--fd-ring', use: 'Keyboard focus ring' }
    ]
  },
  {
    title: 'Action',
    intro:
      'One primary action per view, drawn in the primary colour. The accent marks selection, focus and things that are running.',
    tokens: [
      { name: '--fd-primary', use: 'The main button of a view' },
      { name: '--fd-primary-foreground', use: 'Text on the primary colour' },
      { name: '--fd-accent', use: 'Selection, focus, links, running' },
      { name: '--fd-accent-muted', use: 'Selected background' }
    ]
  },
  {
    title: 'Feedback',
    intro:
      'For messages about what just happened. Each colour has a quiet `-muted` fill for backgrounds. Run status on nodes uses its own roles (see Run status).',
    tokens: [
      { name: '--fd-success', use: 'Saved, done' },
      { name: '--fd-warning', use: 'Needs attention' },
      { name: '--fd-error', use: 'Failed, destructive' },
      { name: '--fd-info', use: 'Neutral information' }
    ]
  }
];

export const STATUS_ROLES: KeyToken[] = [
  { name: '--fd-status-running', use: 'A node or run is working right now' },
  { name: '--fd-status-completed', use: 'Finished without problems' },
  { name: '--fd-status-waiting', use: 'Paused until a person answers' },
  { name: '--fd-status-failed', use: 'Stopped with an error' },
  { name: '--fd-status-skipped', use: 'Not run, because its branch was not taken' }
];

export type ScaleKind = 'type' | 'spacing' | 'radius' | 'shadow' | 'control';

/** The steps worth knowing, per scale. Aliases that share a value are left out. */
export const SCALES: Record<ScaleKind, KeyToken[]> = {
  type: [
    { name: '--fd-text-2xs', use: 'Counts and tiny badges' },
    { name: '--fd-text-xs', use: 'Meta: timestamps, help text, labels' },
    { name: '--fd-text-sm', use: 'Body text in panels, inputs, menus' },
    { name: '--fd-text-md', use: 'Panel and dialog titles' },
    { name: '--fd-text-xl', use: 'Page headings' },
    { name: '--fd-text-2xl', use: 'Display, empty-state headlines' }
  ],
  spacing: [
    { name: '--fd-space-3xs', use: 'Icon to label' },
    { name: '--fd-space-xs', use: 'Between controls in a row' },
    { name: '--fd-space-md', use: 'Padding inside a panel row' },
    { name: '--fd-space-xl', use: 'Padding of a panel or card' },
    { name: '--fd-space-2xl', use: 'Between groups' },
    { name: '--fd-space-3xl', use: 'Between sections' },
    { name: '--fd-space-4xl', use: 'Page gutters' },
    { name: '--fd-space-6xl', use: 'Empty-state breathing room' }
  ],
  radius: [
    { name: '--fd-radius-sm', use: 'Chips, tags, small badges' },
    { name: '--fd-control-radius', use: 'Inputs, selects, buttons' },
    { name: '--fd-radius-lg', use: 'Cards, nodes, floating controls' },
    { name: '--fd-radius-xl', use: 'Message bubbles, large sheets' },
    { name: '--fd-radius-full', use: 'Pills and round buttons' }
  ],
  shadow: [
    { name: '--fd-shadow-sm', use: 'Resting cards and inputs' },
    { name: '--fd-shadow-md', use: 'Things that float over the canvas' },
    { name: '--fd-shadow-lg', use: 'Menus and popovers' },
    { name: '--fd-shadow-xl', use: 'Dialogs' }
  ],
  control: [
    { name: '--fd-control-sm', use: 'Dense rows: toolbars, inspector actions (most used)' },
    { name: '--fd-control-md', use: 'Default buttons and inputs' },
    { name: '--fd-control-lg', use: 'Prominent actions, search fields' },
    { name: '--fd-panel-header', use: 'Height of every panel header' }
  ]
};

/** Every name used on the curated pages, for the drift test. */
export function allKeyTokenNames(): string[] {
  return [
    ...KEY_COLOURS.flatMap((g) => g.tokens.map((t) => t.name)),
    ...STATUS_ROLES.map((t) => t.name),
    ...Object.values(SCALES).flatMap((s) => s.map((t) => t.name))
  ];
}
