import type { ColorMode } from '@xyflow/svelte';

/**
 * The canvas colour mode, following the `data-theme` attribute that the
 * toolbar's light/dark switch sets on <html>. Call it while a component
 * initialises (it starts an effect); read `.current` in the template.
 */
export function useColorMode(): { readonly current: ColorMode } {
  const read = (): ColorMode =>
    (document.documentElement.getAttribute('data-theme') as ColorMode) || 'light';
  let mode = $state<ColorMode>(read());

  $effect(() => {
    const observer = new MutationObserver(() => {
      mode = read();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => observer.disconnect();
  });

  return {
    get current() {
      return mode;
    }
  };
}
