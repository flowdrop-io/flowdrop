export function parseTokenDeclarations(css: string): {
  light: Record<string, string>;
  dark: Record<string, string>;
};
export function buildAliasMaps(sources: string[]): {
  light: Record<string, string>;
  dark: Record<string, string>;
};
export const DARK_ALIAS_BEGIN: string;
export const DARK_ALIAS_END: string;
export function stripGeneratedRegion(css: string): string;
export function renderDarkAliasBlock(sources: string[]): string;
