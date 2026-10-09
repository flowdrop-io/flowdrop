/**
 * The colour-scheme choices FlowDrop offers, one list for the navbar gear menu
 * and the settings dialog.
 *
 * With a host scheme (mount option `colorScheme.host`): the host's label,
 * Light, Dark. Without: Light, Dark, System, as before the option existed.
 */
import type { ThemePreference } from '../types/settings.js';

export interface AppearanceChoice {
  value: ThemePreference;
  label: string;
}

export function appearanceChoices(
  host: { label: string } | null,
  labels: { light: string; dark: string; system: string }
): AppearanceChoice[] {
  return host
    ? [
        { value: 'host', label: host.label },
        { value: 'light', label: labels.light },
        { value: 'dark', label: labels.dark }
      ]
    : [
        { value: 'light', label: labels.light },
        { value: 'dark', label: labels.dark },
        { value: 'auto', label: labels.system }
      ];
}
