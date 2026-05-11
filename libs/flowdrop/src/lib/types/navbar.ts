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
}
