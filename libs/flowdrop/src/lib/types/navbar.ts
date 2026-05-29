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
