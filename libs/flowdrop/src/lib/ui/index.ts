/**
 * FlowDrop UI Module
 *
 * The design-system components the editor is built from: the primitives, the
 * surfaces, and the text controls. They use the `--fd-*` tokens only, so a host
 * that loads the package's styles gets the editor's look in its own pages.
 *
 * @module ui
 *
 * This entry is semver-stable: a breaking change to a component's props is a
 * major release.
 *
 * @example
 * ```svelte
 * <script>
 *   import { Button, Card } from '@flowdrop/flowdrop/ui';
 *   import '@flowdrop/flowdrop/styles/base.css';
 * </script>
 *
 * <Card><Button variant="primary">Save</Button></Card>
 * ```
 *
 * To give the host's own pages the editor's Graphite look, load tokens.css and
 * add `skinCss(graphiteSkin)` as a stylesheet; dark mode follows
 * `data-theme="dark"` on `<html>`.
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
export { default as Notice } from '../components/primitives/Notice.svelte';
export { default as PanelHeader } from '../components/primitives/PanelHeader.svelte';
export { default as Segmented } from '../components/primitives/Segmented.svelte';
export { default as Select } from '../components/primitives/Select.svelte';
export { default as StatusPill } from '../components/primitives/StatusPill.svelte';
export { default as Switch } from '../components/primitives/Switch.svelte';
export { default as Tabs } from '../components/primitives/Tabs.svelte';
export { default as Toolbar } from '../components/primitives/Toolbar.svelte';
export { default as ToolbarSeparator } from '../components/primitives/ToolbarSeparator.svelte';

// ============================================================================
// Surfaces
// ============================================================================

export { default as SurfaceOverlay } from '../components/surfaces/SurfaceOverlay.svelte';
export { default as TabbedSurface } from '../components/surfaces/TabbedSurface.svelte';

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
