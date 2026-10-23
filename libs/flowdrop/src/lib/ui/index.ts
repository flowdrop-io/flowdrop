/**
 * FlowDrop UI Module
 *
 * The design-system components the editor is built from: the primitives, the
 * surfaces, and the text controls. They use the `--fd-*` tokens only, so a host
 * that loads the package's styles gets the editor's look in its own pages.
 *
 * @module ui
 *
 * Experimental in 2.x: names and props may still change in a minor release
 * while the design system settles. It becomes semver-stable no later than 3.0;
 * pin a minor version (`~2.16.0`) if you depend on it.
 *
 * @example
 * ```svelte
 * <script>
 *   import { Button, Card } from '@flowdrop/flowdrop/ui';
 *   import '@flowdrop/flowdrop/styles/base.css';
 * </script>
 *
 * <div class="flowdrop-scope">
 *   <Card><Button variant="primary">Save</Button></Card>
 * </div>
 * ```
 *
 * The base styles (box-sizing, type, `color-scheme`) apply only inside
 * `.flowdrop-root`, `.flowdrop-scope` or `.flowdrop-portal`, so wrap the host
 * content that uses these components in one of them.
 *
 * To give that content the editor's Graphite look, load tokens.css and add
 * `skinCss(graphiteSkin, '.flowdrop-scope')` as a stylesheet. Dark mode is
 * `data-theme="dark"` on the element the selector matches (here the
 * `.flowdrop-scope` div); for the default `:root` the host sets it on `<html>`
 * itself, which stays supported. Only the editor writing its theme to `<html>`
 * (the mirror) is deprecated, removed in 3.0. The selector is scoped so the skin
 * stays inside the wrapper; the default `:root` restyles the whole page.
 *
 * Built-in strings (labels, placeholders) are English by default and follow
 * `setMessages` from `@flowdrop/flowdrop/core` when the host calls it in an
 * ancestor component.
 */

// ============================================================================
// Primitives
// ============================================================================

export { default as Button } from '../components/primitives/Button.svelte';
export { default as Card } from '../components/primitives/Card.svelte';
export { default as Checkbox } from '../components/primitives/Checkbox.svelte';
export { default as Chip } from '../components/primitives/Chip.svelte';
export { default as Combobox } from '../components/primitives/Combobox.svelte';
export { default as Composer } from '../components/primitives/Composer.svelte';
export { default as EmptyState } from '../components/primitives/EmptyState.svelte';
export { default as Field } from '../components/primitives/Field.svelte';
export { default as IconButton } from '../components/primitives/IconButton.svelte';
export { default as Menu } from '../components/primitives/Menu.svelte';
export type {
  MenuItem,
  MenuEntry,
  MenuGroup,
  MenuSeparator
} from '../components/primitives/Menu.svelte';
export { default as Notice } from '../components/primitives/Notice.svelte';
export { default as PanelHeader } from '../components/primitives/PanelHeader.svelte';
export { default as Segmented } from '../components/primitives/Segmented.svelte';
export type { SegmentedOption } from '../components/primitives/Segmented.svelte';
export { default as Select } from '../components/primitives/Select.svelte';
export type { SelectOption } from '../utils/selectOptions.js';
export { default as StatusPill } from '../components/primitives/StatusPill.svelte';
export type { StatusPillStatus } from '../components/primitives/StatusPill.svelte';
export { default as Switch } from '../components/primitives/Switch.svelte';
export { default as Tabs, tabId, tabPanelId } from '../components/primitives/Tabs.svelte';
export type { TabItem } from '../components/primitives/Tabs.svelte';
export { default as Toolbar } from '../components/primitives/Toolbar.svelte';
export { default as ToolbarSeparator } from '../components/primitives/ToolbarSeparator.svelte';

// ============================================================================
// Surfaces
// ============================================================================

export { default as SurfaceOverlay } from '../components/surfaces/SurfaceOverlay.svelte';
export { default as TabbedSurface } from '../components/surfaces/TabbedSurface.svelte';
export type { SurfaceTab } from '../components/surfaces/TabbedSurface.svelte';

// ============================================================================
// Text controls
// ============================================================================

export { default as Input } from '../components/Input.svelte';
export { default as Textarea } from '../components/Textarea.svelte';

// ============================================================================
// Skin: the editor's look for a host's own pages
// ============================================================================

export { graphiteSkin } from '../skins/graphite.js';
export { skinCss } from '../themes/scopedSkinCss.js';
export type { FlowDropSkin } from '../types/skin.js';
