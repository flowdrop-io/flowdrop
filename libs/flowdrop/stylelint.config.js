// Design-system guardrails only (see docs/style-guardrails.md). Formatting belongs to prettier.
// Violations are counted per file per rule by scripts/style-ratchet.mjs; nothing here should be
// loosened to make a file pass; fix the file or lower the baseline.

// A value passes when it is built only from tokens, `0` and token-based calc()/color-mix(), e.g.
// `var(--fd-radius-lg)`, `0 0 var(--fd-radius-lg) var(--fd-radius-lg)`, `0 0 0 var(--fd-ring-width) var(--fd-ring)`.
// A fallback inside a --fd- var() is tolerated. Any literal dimension (13px, 0.8125rem, 50%) fails. A bare `var(--x)` outside the --fd- namespace fails too.
const tokenOnly = [
  /^(0|var\(--fd-[\w-]+(?:,[^()]*(?:\([^()]*\))?[^()]*)?\)|calc\(.*var\(--fd-.*\)|color-mix\(.*\)|\s)+$/,
  'inherit',
  'initial',
  'unset',
  'none'
];

/** @type {import('stylelint').Config} */
export default {
  // Token definitions and skins are where literals legitimately live. src/lib/stories/ is
  // Storybook-only helper UI (the Tokens pages), not shipped in the package.
  ignoreFiles: ['src/lib/styles/tokens.css', 'src/lib/skins/**', 'src/lib/stories/**'],
  overrides: [{ files: ['**/*.svelte'], customSyntax: 'postcss-html' }],
  rules: {
    // colour
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      ['/^rgba?$/', '/^hsla?$/', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'],
      { message: 'Use a colour token (var(--fd-…)) instead of a literal colour function.' }
    ],
    // font-size, radius, shadow (the ratchet tells them apart by property)
    'declaration-property-value-allowed-list': {
      'font-size': tokenOnly,
      '/^border(-(top|bottom|start|end)-(left|right|start|end))?-radius$/': tokenOnly,
      'box-shadow': tokenOnly
    }
  }
};
