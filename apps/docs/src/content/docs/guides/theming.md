---
title: Theming
description: Customize FlowDrop's look and feel with CSS custom properties.
---

FlowDrop uses a semantic-first design token system based on CSS custom properties with a `--fd-*` prefix.

## Quick Start

Override semantic tokens to customize FlowDrop:

```css
:root {
  /* Change the primary color */
  --fd-primary: #8b5cf6;
  --fd-primary-hover: #7c3aed;

  /* Adjust border radius */
  --fd-radius-md: 0.5rem;
}
```

## Token Architecture

FlowDrop's token system has three tiers:

| Tier | Prefix | Description |
|------|--------|-------------|
| **Internal Palette** | `--_*` | Raw color values — not for direct use |
| **Semantic Tokens** | `--fd-*` | The public API — what you customize |
| **Component Tokens** | (varies) | Use semantic tokens in components |

**Key principle**: Override `--fd-*` tokens. Components automatically use these tokens, so your theme cascades everywhere.

## Semantic Tokens Reference

### Surfaces

| Token | Description |
|-------|-------------|
| `--fd-background` | Main background color |
| `--fd-foreground` | Main text color |
| `--fd-muted` | Muted background (cards, inputs) |
| `--fd-muted-foreground` | Muted text |
| `--fd-card` | Card background |
| `--fd-card-foreground` | Card text color |

### Borders

| Token | Description |
|-------|-------------|
| `--fd-border` | Default border color |
| `--fd-border-muted` | Muted border |
| `--fd-border-strong` | Strong border |
| `--fd-ring` | Focus ring color |

### Primary and Accent

| Token | Description |
|-------|-------------|
| `--fd-primary` | Primary action color |
| `--fd-primary-hover` | Primary hover state |
| `--fd-primary-foreground` | Text on primary |
| `--fd-primary-muted` | Light primary background |
| `--fd-accent` | Accent color |
| `--fd-accent-hover` | Accent hover |

### Status Colors

Each status color has `-hover`, `-foreground`, and `-muted` variants:

- `--fd-success` — Green
- `--fd-warning` — Amber
- `--fd-error` — Red
- `--fd-info` — Blue

### Spacing

| Token | Value |
|-------|-------|
| `--fd-space-3xs` | 4px |
| `--fd-space-2xs` | 6px |
| `--fd-space-xs` | 8px |
| `--fd-space-sm` | 10px |
| `--fd-space-md` | 12px |
| `--fd-space-lg` | 14px |
| `--fd-space-xl` | 16px |
| `--fd-space-2xl` | 20px |
| `--fd-space-3xl` | 24px |

### Border Radius

| Token | Value |
|-------|-------|
| `--fd-radius-sm` | 4px |
| `--fd-radius-md` | 6px |
| `--fd-radius-lg` | 8px |
| `--fd-radius-xl` | 12px |
| `--fd-radius-full` | Pill shape |

### Typography

| Token | Value |
|-------|-------|
| `--fd-text-xs` | 12px |
| `--fd-text-sm` | 14px |
| `--fd-text-base` | 16px |
| `--fd-text-lg` | 18px |
| `--fd-text-xl` | 20px |

### Layout

| Token | Default |
|-------|---------|
| `--fd-sidebar-width` | 320px |
| `--fd-navbar-height` | 60px |
| `--fd-toolbar-height` | 40px |

### Node Layout

Node dimensions use a **10px grid** for alignment with the editor snap grid:

| Token | Default |
|-------|---------|
| `--fd-node-default-width` | 290px |
| `--fd-node-header-height` | 60px |
| `--fd-node-terminal-size` | 80px |
| `--fd-node-square-size` | 80px |
| `--fd-handle-size` | 20px |
| `--fd-handle-visual-size` | 12px |

## Theming Examples

### Purple Theme

```css
:root {
  --fd-primary: #8b5cf6;
  --fd-primary-hover: #7c3aed;
  --fd-primary-muted: #f5f3ff;
  --fd-accent: #8b5cf6;
  --fd-ring: #8b5cf6;
}
```

### Rounded Theme

```css
:root {
  --fd-radius-sm: 0.5rem;
  --fd-radius-md: 0.75rem;
  --fd-radius-lg: 1rem;
  --fd-radius-xl: 1.5rem;
}
```

### Compact Spacing

```css
:root {
  --fd-space-3xs: 0.125rem;
  --fd-space-xs: 0.25rem;
  --fd-space-md: 0.5rem;
  --fd-space-xl: 0.75rem;
}
```

## Dark Mode

FlowDrop supports dark mode. Enable it with:

```html
<html data-theme="dark">
```

Or via JavaScript:

```javascript
document.documentElement.setAttribute('data-theme', 'dark');
```

Or use the built-in theme toggle:

```typescript
import { toggleTheme, setTheme } from '@flowdrop/flowdrop/core';

toggleTheme();         // Cycles through light/dark/auto
setTheme('dark');      // Set explicitly
```

All semantic tokens have dark-mode equivalents that activate automatically.

## Best Practices

1. **Use semantic tokens** — Override `--fd-primary` instead of individual component colors
2. **Keep it minimal** — A few token overrides can transform the entire look
3. **Test in context** — Colors look different on light vs dark backgrounds
4. **Consider accessibility** — Ensure sufficient contrast ratios
5. **Use the cascade** — Semantic tokens update all components automatically
