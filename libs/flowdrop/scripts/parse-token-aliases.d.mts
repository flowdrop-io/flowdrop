export function parseTokenDeclarations(css: string): {
  light: Record<string, string>;
  dark: Record<string, string>;
};
export function buildAliasMaps(sources: string[]): {
  light: Record<string, string>;
  dark: Record<string, string>;
};
