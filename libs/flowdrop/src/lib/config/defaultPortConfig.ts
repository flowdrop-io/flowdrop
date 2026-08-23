/**
 * Default port configuration for FlowDrop.
 *
 * The fallback the editor uses before (or instead of) the backend's
 * `getPortConfiguration()` payload. It is a HAND MIRROR of that payload, and
 * every id and rule missing from it is a lane the editor treats as unknown —
 * compatible with nothing, not even another port of its own lane. It was
 * missing three (`any`, `mixed`, `messages`), which is why a `messages` port
 * on library defaults would not connect to anything at all.
 *
 * Generating this from the backend's single declaration site is the
 * workflow-contract axis's job; until then, a lane added on the Drupal side
 * must be added here in the same change.
 */

import type { PortConfig } from '../types/index.js';

/**
 * Every lane a sink rule fans out over: all of them but `tool`.
 *
 * A capability wire into a sink says nothing and a sink value is not a
 * callable, so `tool` stays self-compatible only.
 */
const SINK_LANES = [
  'trigger',
  'mixed',
  'string',
  'number',
  'boolean',
  'array',
  'string[]',
  'number[]',
  'boolean[]',
  'json[]',
  'file[]',
  'image[]',
  'json',
  'messages',
  'file',
  'image',
  'audio',
  'video',
  'url',
  'email',
  'date',
  'datetime',
  'time'
] as const;

export const DEFAULT_PORT_CONFIG: PortConfig = {
  version: '1.0.0',
  // The sink, not `string`: a port with no declared lane constrains nothing.
  defaultDataType: 'mixed',

  dataTypes: [
    // Control flow types.
    //
    // Ink, not a hue: the handle must read as the same thing as the trigger
    // WIRE, which is `--fd-edge-trigger` — ink that flips with the theme. It
    // sat on purple, sharing that hue with `boolean`, and matched neither the
    // wire nor the served payload's cyan.
    {
      id: 'trigger',
      name: 'Trigger',
      description: 'Control flow of the workflow',
      color: 'var(--fd-node-ink)',
      category: 'basic',
      enabled: true
    },
    // The sink: what a port declares when its schema declares no shape.
    // Wire anything in, wire it anywhere. `any` was its second spelling and
    // is retired.
    //
    // Slate, not a lane hue: a port that constrains nothing has nothing to
    // claim, and slate is already what an unrecognised lane falls back to. It
    // sat on teal, which put the sink in the media family beside `video`.
    {
      id: 'mixed',
      name: 'Mixed',
      description: 'A value of any type',
      color: 'var(--fd-node-slate)',
      category: 'basic',
      enabled: true
    },
    // Text and basic types
    {
      id: 'string',
      name: 'String',
      description: 'Text data',
      color: 'var(--fd-node-emerald)',
      category: 'basic',
      enabled: true
    },

    // Numeric types
    {
      id: 'number',
      name: 'Number',
      description: 'Numeric data',
      color: 'var(--fd-node-blue)',
      category: 'numeric',
      enabled: true
    },

    // Boolean types
    {
      id: 'boolean',
      name: 'Boolean',
      description: 'True/false values',
      color: 'var(--fd-node-purple)',
      category: 'logical',
      enabled: true
    },

    // Collection types.
    //
    // Violet: the untyped array is the one array with no element hue to
    // inherit. It had amber until `tool` took that to match its wire.
    {
      id: 'array',
      name: 'Array',
      description: 'Ordered list of items',
      color: 'var(--fd-node-violet)',
      category: 'collection',
      enabled: true
    },

    // Typed arrays
    {
      id: 'string[]',
      name: 'String Array',
      description: 'Array of strings',
      color: 'var(--fd-node-emerald)',
      category: 'collection',
      enabled: true
    },
    {
      id: 'number[]',
      name: 'Number Array',
      description: 'Array of numbers',
      color: 'var(--fd-node-blue)',
      category: 'collection',
      enabled: true
    },
    {
      id: 'boolean[]',
      name: 'Boolean Array',
      description: 'Array of true/false values',
      color: 'var(--fd-node-purple)',
      category: 'collection',
      enabled: true
    },
    {
      id: 'json[]',
      name: 'JSON Array',
      description: 'Array of JSON objects',
      color: 'var(--fd-node-orange)',
      category: 'collection',
      enabled: true
    },
    {
      id: 'file[]',
      name: 'File Array',
      description: 'Array of files',
      color: 'var(--fd-node-teal)',
      category: 'collection',
      enabled: true
    },
    {
      id: 'image[]',
      name: 'Image Array',
      description: 'Array of images',
      color: 'var(--fd-node-pink)',
      category: 'collection',
      enabled: true
    },

    // Complex types
    {
      id: 'json',
      name: 'JSON',
      description: 'JSON structured data',
      color: 'var(--fd-node-orange)',
      category: 'complex',
      enabled: true
    },

    // File types.
    //
    // Teal, vacated by `video`. Red is reserved for `error` alone — a failed
    // run and a PDF are not the same kind of thing and must not share a hue.
    {
      id: 'file',
      name: 'File',
      description: 'File data',
      color: 'var(--fd-node-teal)',
      category: 'file',
      enabled: true
    },

    // Media types
    {
      id: 'image',
      name: 'Image',
      description: 'Image data',
      color: 'var(--fd-node-pink)',
      category: 'media',
      enabled: true
    },
    {
      id: 'audio',
      name: 'Audio',
      description: 'Audio data',
      color: 'var(--fd-node-indigo)',
      category: 'media',
      enabled: true
    },
    // Fuchsia, freed by `messages`. Landing beside `image`'s pink is wanted:
    // the two are both visual media, so the near-adjacency reads as a family
    // rather than as a collision.
    {
      id: 'video',
      name: 'Video',
      description: 'Video data',
      color: 'var(--fd-node-fuchsia)',
      category: 'media',
      enabled: true
    },

    // Tool type
    {
      id: 'tool',
      name: 'Tool',
      description: 'Tool interface for agent connections',
      color: 'var(--fd-node-amber)',
      category: 'special',
      enabled: true
    },

    // Special types
    {
      id: 'url',
      name: 'URL',
      description: 'Web address',
      color: 'var(--fd-node-cyan)',
      category: 'special',
      enabled: true
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Email address',
      color: 'var(--fd-node-cyan)',
      category: 'special',
      enabled: true
    },
    {
      id: 'date',
      name: 'Date',
      description: 'Date value',
      color: 'var(--fd-node-lime)',
      category: 'temporal',
      enabled: true
    },
    {
      id: 'datetime',
      name: 'DateTime',
      description: 'Date and time value',
      color: 'var(--fd-node-lime)',
      category: 'temporal',
      enabled: true
    },
    {
      id: 'time',
      name: 'Time',
      description: 'Time value',
      color: 'var(--fd-node-lime)',
      category: 'temporal',
      enabled: true
    },

    // A list of provider-shaped chat messages. JSON-Schema `array`
    // underneath, but not an arbitrary array — which is the whole reason it
    // is its own lane.
    //
    // Orange, with `json` and `json[]`: a complex lane wears the hue of the
    // shape it is made of, and a message list is an array of objects. It sat
    // alone on fuchsia, which said nothing about what it carries.
    {
      id: 'messages',
      name: 'Messages',
      description: 'A conversation: a list of provider-shaped chat messages',
      color: 'var(--fd-node-orange)',
      category: 'complex',
      enabled: true
    }
  ],

  compatibilityRules: [
    // buildCompatibilityMap() seeds exact-match only, so a lane accepts
    // another lane ONLY through a rule here. Same-type connections need no
    // rule; everything below is a deliberate widening.
    //
    // The sink both ways. `mixed` is worn by outputs as well as inputs, so
    // the incoming direction alone would leave those outputs wireable into
    // nothing. Aliases would not have done it either — they copy the
    // outgoing set only.
    ...SINK_LANES.flatMap((id) => [
      { from: id, to: 'mixed' },
      { from: 'mixed', to: id }
    ]),
    // The control sink. What a loopback or trigger input accepts; this is
    // the rule set `any` used to carry.
    ...SINK_LANES.map((id) => ({ from: id, to: 'trigger' })),
    // `messages` flows one way into `array` and `json`: existing consumers
    // typed one of those must keep accepting a message list without being
    // rewired. The reverse is deliberately absent — an `array`/`json` port
    // carries no guarantee of provider-message shape, and accepting one into
    // a `messages` input is exactly the silent mistyping the lane exists to
    // catch.
    { from: 'messages', to: 'array' },
    { from: 'messages', to: 'json' }
  ]
};
