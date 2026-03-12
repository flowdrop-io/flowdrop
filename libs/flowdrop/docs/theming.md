# FlowDrop Theming Guide

FlowDrop uses a semantic-first design token system that makes it easy to customize the look and feel of your workflow editor.

## Quick Start

Override the semantic tokens to customize FlowDrop:

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

```
┌─────────────────────────────────────────────────┐
│  Tier 1: Internal Palette (--_*)                │
│  Raw color values - not documented for users    │
├─────────────────────────────────────────────────┤
│  Tier 2: Semantic Tokens (--fd-*)               │
│  The public API - what you customize            │
├─────────────────────────────────────────────────┤
│  Tier 3: Component Tokens                       │
│  Use semantic tokens in components              │
└─────────────────────────────────────────────────┘
```

**Key principle**: Override `--fd-*` tokens. Components automatically use these tokens, so your theme cascades everywhere.

## Semantic Tokens Reference

### Surfaces (Backgrounds)

| Token                   | Description                           | Default   |
| ----------------------- | ------------------------------------- | --------- |
| `--fd-background`       | Main background color                 | `#ffffff` |
| `--fd-foreground`       | Main text color                       | Zinc 900  |
| `--fd-muted`            | Muted background (cards, inputs)      | Zinc 100  |
| `--fd-muted-foreground` | Muted text                            | Zinc 500  |
| `--fd-subtle`           | Subtle background (borders, dividers) | Zinc 200  |
| `--fd-card`             | Card background                       | `#ffffff` |
| `--fd-card-foreground`  | Card text color                       | Zinc 900  |

### Borders

| Token                | Description          | Default  |
| -------------------- | -------------------- | -------- |
| `--fd-border`        | Default border color | Zinc 200 |
| `--fd-border-muted`  | Muted border         | Zinc 100 |
| `--fd-border-strong` | Strong border        | Zinc 300 |
| `--fd-ring`          | Focus ring color     | Blue 500 |

### Primary (Interactive/Brand)

| Token                     | Description              | Default   |
| ------------------------- | ------------------------ | --------- |
| `--fd-primary`            | Primary action color     | Blue 500  |
| `--fd-primary-hover`      | Primary hover state      | Blue 700  |
| `--fd-primary-foreground` | Text on primary          | `#ffffff` |
| `--fd-primary-muted`      | Light primary background | Blue 50   |

### Secondary

| Token                       | Description          | Default  |
| --------------------------- | -------------------- | -------- |
| `--fd-secondary`            | Secondary background | Zinc 100 |
| `--fd-secondary-hover`      | Secondary hover      | Zinc 200 |
| `--fd-secondary-foreground` | Secondary text       | Zinc 900 |

### Accent

| Token                    | Description             | Default    |
| ------------------------ | ----------------------- | ---------- |
| `--fd-accent`            | Accent color            | Violet 500 |
| `--fd-accent-hover`      | Accent hover            | Violet 700 |
| `--fd-accent-foreground` | Text on accent          | `#ffffff`  |
| `--fd-accent-muted`      | Light accent background | Violet 50  |

### Status Colors

| Token                     | Description        | Default   |
| ------------------------- | ------------------ | --------- |
| `--fd-success`            | Success state      | Green 500 |
| `--fd-success-hover`      | Success hover      | Green 700 |
| `--fd-success-foreground` | Text on success    | `#ffffff` |
| `--fd-success-muted`      | Success background | Green 50  |
| `--fd-warning`            | Warning state      | Amber 500 |
| `--fd-warning-hover`      | Warning hover      | Amber 700 |
| `--fd-warning-foreground` | Text on warning    | Zinc 900  |
| `--fd-warning-muted`      | Warning background | Amber 50  |
| `--fd-error`              | Error state        | Red 500   |
| `--fd-error-hover`        | Error hover        | Red 700   |
| `--fd-error-foreground`   | Text on error      | `#ffffff` |
| `--fd-error-muted`        | Error background   | Red 50    |
| `--fd-info`               | Info state         | Blue 500  |
| `--fd-info-hover`         | Info hover         | Blue 700  |
| `--fd-info-foreground`    | Text on info       | `#ffffff` |
| `--fd-info-muted`         | Info background    | Blue 50   |

### Spacing

| Token            | Value      | Pixels |
| ---------------- | ---------- | ------ |
| `--fd-space-0`   | `0`        | 0px    |
| `--fd-space-3xs` | `0.25rem`  | 4px    |
| `--fd-space-2xs` | `0.375rem` | 6px    |
| `--fd-space-xs`  | `0.5rem`   | 8px    |
| `--fd-space-sm`  | `0.625rem` | 10px   |
| `--fd-space-md`  | `0.75rem`  | 12px   |
| `--fd-space-lg`  | `0.875rem` | 14px   |
| `--fd-space-xl`  | `1rem`     | 16px   |
| `--fd-space-2xl` | `1.25rem`  | 20px   |
| `--fd-space-3xl` | `1.5rem`   | 24px   |
| `--fd-space-4xl` | `2rem`     | 32px   |
| `--fd-space-5xl` | `2.5rem`   | 40px   |
| `--fd-space-6xl` | `3rem`     | 48px   |
| `--fd-space-7xl` | `4rem`     | 64px   |

### Border Radius

| Token              | Value      | Pixels     |
| ------------------ | ---------- | ---------- |
| `--fd-radius-sm`   | `0.25rem`  | 4px        |
| `--fd-radius-md`   | `0.375rem` | 6px        |
| `--fd-radius-lg`   | `0.5rem`   | 8px        |
| `--fd-radius-xl`   | `0.75rem`  | 12px       |
| `--fd-radius-2xl`  | `1rem`     | 16px       |
| `--fd-radius-full` | `9999px`   | Pill shape |

### Shadows

| Token            | Description                      |
| ---------------- | -------------------------------- |
| `--fd-shadow-sm` | Small shadow (inputs, buttons)   |
| `--fd-shadow-md` | Medium shadow (cards, dropdowns) |
| `--fd-shadow-lg` | Large shadow (modals, popovers)  |
| `--fd-shadow-xl` | Extra large shadow               |

### Typography

| Token            | Value      | Pixels |
| ---------------- | ---------- | ------ |
| `--fd-text-xs`   | `0.75rem`  | 12px   |
| `--fd-text-sm`   | `0.875rem` | 14px   |
| `--fd-text-base` | `1rem`     | 16px   |
| `--fd-text-lg`   | `1.125rem` | 18px   |
| `--fd-text-xl`   | `1.25rem`  | 20px   |
| `--fd-text-2xl`  | `1.5rem`   | 24px   |

### Transitions

| Token                    | Value        |
| ------------------------ | ------------ |
| `--fd-transition-fast`   | `150ms ease` |
| `--fd-transition-normal` | `200ms ease` |
| `--fd-transition-slow`   | `300ms ease` |

### Layout

| Token                 | Description         | Default |
| --------------------- | ------------------- | ------- |
| `--fd-sidebar-width`  | Sidebar panel width | `320px` |
| `--fd-navbar-height`  | Navbar height       | `60px`  |
| `--fd-toolbar-height` | Toolbar height      | `40px`  |

### Node Layout (10px Grid)

Node dimensions and port handle positions use a **10px grid** so nodes align with the editor snap grid (default 20px) and edges connect at predictable positions. Override these tokens to customize node size while keeping alignment:

| Token                           | Description                                | Default |
| ------------------------------- | ------------------------------------------ | ------- |
| `--fd-node-grid-step`           | Alignment unit (px)                        | `10`    |
| `--fd-node-default-width`       | Default node width                         | `290px` |
| `--fd-node-header-height`       | Header block height (list nodes)           | `60px`  |
| `--fd-node-header-title-height` | Header title line height (multiples of 10) | `40px`  |
| `--fd-node-header-desc-line`    | Description line height (multiples of 10)  | `20px`  |
| `--fd-node-header-gap`          | Gap between title and description          | `10px`  |
| `--fd-node-port-row-height`     | Per-port row height (list nodes)           | `20px`  |
| `--fd-node-terminal-size`       | Terminal node width/height                 | `80px`  |
| `--fd-node-square-size`         | Square node width/height                   | `80px`  |
| `--fd-node-simple-height`       | Simple node height                         | `80px`  |
| `--fd-node-tool-min-height`     | Tool node minimum height                   | `80px`  |

**Node icon** (squircle background behind the node type icon):

| Token                             | Description                                           | Default                     |
| --------------------------------- | ----------------------------------------------------- | --------------------------- |
| `--fd-node-icon-bg-opacity`       | Opacity of the icon background (color-mix percentage) | `15%` (light); `50%` (dark) |
| `--fd-node-icon-bg-opacity-hover` | Opacity on hover                                      | `22%` (light); `50%` (dark) |

**Handle (port) size** (all in pixels): The outer size is the connection/hit area; the visual circle is centered inside it.

| Token                     | Description                           | Default |
| ------------------------- | ------------------------------------- | ------- |
| `--fd-handle-size`        | Port connection area (width × height) | `20px`  |
| `--fd-handle-visual-size` | Visible circle diameter               | `12px`  |

Handle positions are **center-based**: `top`/`left` values (in px) define the handle center (edge connection point), with `transform: translate(-50%, -50%)` so edges connect on the grid.

### Node Colors (Workflow Editor)

| Token               | Color     |
| ------------------- | --------- |
| `--fd-node-emerald` | `#10b981` |
| `--fd-node-blue`    | `#2563eb` |
| `--fd-node-amber`   | `#f59e0b` |
| `--fd-node-orange`  | `#f97316` |
| `--fd-node-red`     | `#ef4444` |
| `--fd-node-pink`    | `#ec4899` |
| `--fd-node-indigo`  | `#6366f1` |
| `--fd-node-teal`    | `#14b8a6` |
| `--fd-node-cyan`    | `#06b6d4` |
| `--fd-node-lime`    | `#84cc16` |
| `--fd-node-slate`   | `#64748b` |
| `--fd-node-purple`  | `#9333ea` |

In **dark mode** (`data-theme="dark"`), all `--fd-node-*` colors above are overridden to lighter variants so port type labels and badges stay readable on dark node surfaces. You can override any of them again in your theme.

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

### Custom Gray Scale

```css
:root {
  /* Override internal palette for a warmer gray */
  --_gray-1: #fafaf9;
  --_gray-2: #f5f5f4;
  --_gray-3: #e7e5e4;
  --_gray-4: #d6d3d1;
  --_gray-5: #a8a29e;
  --_gray-6: #78716c;
  --_gray-7: #57534e;
  --_gray-8: #292524;
  --_gray-9: #1c1917;
}
```

## Dark Mode

The token system supports dark mode. Semantic color tokens (surfaces, primary, accent, status, node port type colors, edges, etc.) have dark-mode equivalents for accessibility. Enable dark mode with:

```html
<html data-theme="dark"></html>
```

Or via JavaScript:

```javascript
document.documentElement.setAttribute("data-theme", "dark");
```

## Best Practices

1. **Use semantic tokens** - Override `--fd-primary` instead of `--fd-node-blue`
2. **Keep it minimal** - A few token overrides can transform the entire look
3. **Test in context** - Colors look different on light vs dark backgrounds
4. **Consider accessibility** - Ensure sufficient contrast ratios
5. **Use the cascade** - Semantic tokens update all components automatically
