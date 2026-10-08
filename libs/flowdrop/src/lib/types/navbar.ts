import type { Component } from 'svelte';

/**
 * Navbar action button configuration.
 *
 * Rendered as a link by `<Navbar>` and the mount functions that wrap it.
 */
export interface NavbarAction {
  label: string;
  href: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  onclick?: (event: Event) => void;
  /** If true, opens link in new tab with `rel="noopener noreferrer"`. */
  external?: boolean;
  /**
   * Optional group label. Items sharing the same `group` cluster together
   * under a header inside the flyout dropdown. Ungrouped items render first.
   * Group order follows first occurrence in the array. Ignored when the
   * navbar is in split mode (the inline row of buttons).
   */
  group?: string;
}

/**
 * White-label branding for the navbar's start slot.
 *
 * When set, it replaces the built-in FlowDrop wordmark. Only the logo and its
 * name are brandable; the rest of the chrome is not.
 */
export interface NavbarBranding {
  /**
   * Product name shown in the chrome in place of "FlowDrop": the page `<title>`
   * (`{name} - {tagline}`), the default wordmark's accessible name and title, and
   * the default for `logoAlt`. Precedence: `logoAlt` > `name` > the
   * `navigation.appName` message.
   */
  name?: string;
  /**
   * The logo. A string is an image URL, rendered as an `<img>` scaled to fit the
   * 48 px navbar (max height 24 px, width auto, clamped to the start column).
   * A Svelte component is rendered in place and must size itself to the same box.
   */
  logo?: string | Component;
  /**
   * Accessible name for the logo (the `<img>` alt text, or the label of a
   * component logo). Defaults to `name`, then the `navigation.appName` message.
   */
  logoAlt?: string;
  /** Wraps the logo in a link to this URL. The built-in wordmark is not linked. */
  href?: string;
}
