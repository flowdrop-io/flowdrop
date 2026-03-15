---
title: CSS Design Tokens
description: Complete reference for all --fd-* CSS custom properties used to theme FlowDrop.
---

FlowDrop uses CSS custom properties with a `--fd-*` prefix as its theming API. Override these tokens to customize the editor's appearance.

## How Theming Works

FlowDrop's token system has three tiers:

| Tier                           | Purpose                 | You customize? |
| ------------------------------ | ----------------------- | -------------- |
| **Internal Palette** (`--_*`)  | Raw color values        | No             |
| **Semantic Tokens** (`--fd-*`) | Public theming API      | **Yes**        |
| **Component styles**           | Consume semantic tokens | No             |

Override `--fd-*` tokens and all components update automatically.

```css
/* Example: Apply a purple theme */
:root {
  --fd-primary: #8b5cf6;
  --fd-primary-hover: #7c3aed;
  --fd-primary-muted: #f5f3ff;
  --fd-accent: #8b5cf6;
  --fd-ring: #8b5cf6;
}
```

## Surfaces

| Token                   | Description                      |
| ----------------------- | -------------------------------- |
| `--fd-background`       | Main background color            |
| `--fd-foreground`       | Main text color                  |
| `--fd-muted`            | Muted background (cards, inputs) |
| `--fd-muted-foreground` | Muted text color                 |
| `--fd-card`             | Card background                  |
| `--fd-card-foreground`  | Card text color                  |

## Borders

| Token                | Description          |
| -------------------- | -------------------- |
| `--fd-border`        | Default border color |
| `--fd-border-muted`  | Subtle border        |
| `--fd-border-strong` | Emphasized border    |
| `--fd-ring`          | Focus ring color     |

## Primary & Accent

| Token                     | Description                           |
| ------------------------- | ------------------------------------- |
| `--fd-primary`            | Primary action color (buttons, links) |
| `--fd-primary-hover`      | Primary hover state                   |
| `--fd-primary-foreground` | Text on primary background            |
| `--fd-primary-muted`      | Light primary background              |
| `--fd-accent`             | Accent color                          |
| `--fd-accent-hover`       | Accent hover state                    |

## Status Colors

Each status color has four variants:

| Base Token     | `-hover`             | `-foreground`             | `-muted`             |
| -------------- | -------------------- | ------------------------- | -------------------- |
| `--fd-success` | `--fd-success-hover` | `--fd-success-foreground` | `--fd-success-muted` |
| `--fd-warning` | `--fd-warning-hover` | `--fd-warning-foreground` | `--fd-warning-muted` |
| `--fd-error`   | `--fd-error-hover`   | `--fd-error-foreground`   | `--fd-error-muted`   |
| `--fd-info`    | `--fd-info-hover`    | `--fd-info-foreground`    | `--fd-info-muted`    |

## Spacing

| Token            | Default |
| ---------------- | ------- |
| `--fd-space-3xs` | 4px     |
| `--fd-space-2xs` | 6px     |
| `--fd-space-xs`  | 8px     |
| `--fd-space-sm`  | 10px    |
| `--fd-space-md`  | 12px    |
| `--fd-space-lg`  | 14px    |
| `--fd-space-xl`  | 16px    |
| `--fd-space-2xl` | 20px    |
| `--fd-space-3xl` | 24px    |

## Border Radius

| Token              | Default             |
| ------------------ | ------------------- |
| `--fd-radius-sm`   | 4px                 |
| `--fd-radius-md`   | 6px                 |
| `--fd-radius-lg`   | 8px                 |
| `--fd-radius-xl`   | 12px                |
| `--fd-radius-full` | 9999px (pill shape) |

## Typography

| Token            | Default |
| ---------------- | ------- |
| `--fd-text-xs`   | 12px    |
| `--fd-text-sm`   | 14px    |
| `--fd-text-base` | 16px    |
| `--fd-text-lg`   | 18px    |
| `--fd-text-xl`   | 20px    |

## Layout

| Token                 | Default | Description           |
| --------------------- | ------- | --------------------- |
| `--fd-sidebar-width`  | 320px   | Node sidebar width    |
| `--fd-navbar-height`  | 60px    | Top navbar height     |
| `--fd-toolbar-height` | 40px    | Canvas toolbar height |

## Node Dimensions

Node dimensions use a **10px grid** to align with the editor's snap grid:

| Token                     | Default | Description                    |
| ------------------------- | ------- | ------------------------------ |
| `--fd-node-default-width` | 290px   | Standard node width            |
| `--fd-node-header-height` | 60px    | Node header area               |
| `--fd-node-terminal-size` | 80px    | Terminal node size (start/end) |
| `--fd-node-square-size`   | 80px    | Square node size (gateway)     |
| `--fd-handle-size`        | 20px    | Port handle hit area           |
| `--fd-handle-visual-size` | 12px    | Port handle visible size       |

## Accent HSL Knobs

For fine-grained accent control, FlowDrop exposes HSL components:

| Token                    | Default   | Description           |
| ------------------------ | --------- | --------------------- |
| `--fd-accent-hue`        | 17        | Accent hue (0–360)    |
| `--fd-accent-saturation` | 100%      | Accent saturation     |
| `--fd-accent-lightness`  | 34%       | Accent lightness      |
| `--fd-accent-low`        | (derived) | Low-intensity accent  |
| `--fd-accent-high`       | (derived) | High-intensity accent |
| `--fd-gray-hue`          | 210       | Base hue for grays    |

Quick accent experiments:

```css
:root {
  --fd-accent-hue: 174; /* Teal */
  --fd-accent-hue: 260; /* Purple */
  --fd-accent-hue: 340; /* Pink */
  --fd-accent-hue: 220; /* Blue */
  --fd-accent-hue: 150; /* Green */
}
```

## Dark Mode

FlowDrop auto-switches tokens based on `data-theme`:

```html
<html data-theme="dark"></html>
```

Or programmatically:

```typescript
import { setTheme, toggleTheme } from '@flowdrop/flowdrop/settings';

setTheme('dark');
toggleTheme();
```

All semantic tokens have dark-mode equivalents that activate automatically. The accent HSL knobs adjust luminance in dark mode — `--fd-accent-low` becomes darker and `--fd-accent-high` becomes lighter.

## Next Steps

- [Theming Guide](/guides/theming/) — practical theming patterns
- [Store API: settingsStore](/reference/stores/#settingsstore) — programmatic theme control
