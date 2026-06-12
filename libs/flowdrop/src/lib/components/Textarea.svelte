<!--
  Textarea — typed wrapper over the shared `.flowdrop-input` system (base.css),
  with the `.flowdrop-input--textarea` modifier (min-height + vertical resize).

  Shares the exact field look of Input/Select so multiline fields render
  identically. All styling lives in base.css. Native attributes (value,
  placeholder, rows, disabled, id, aria-*, oninput…) forward to <textarea>.

  Internal for now; see Button.svelte / Input.svelte for the pattern.
-->

<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  interface Props extends HTMLTextareaAttributes {
    /** Size — `md` is the base; `sm`/`lg` add a modifier */
    size?: 'sm' | 'md' | 'lg';
    /** Renders the error-border state */
    invalid?: boolean;
    /** Extra classes appended to the textarea */
    class?: string;
  }

  let { size = 'md', invalid = false, class: className = '', ...rest }: Props = $props();

  const textareaClass = $derived(
    [
      'flowdrop-input',
      'flowdrop-input--textarea',
      size === 'md' ? '' : `flowdrop-input--${size}`,
      invalid ? 'flowdrop-input--invalid' : '',
      className
    ]
      .filter(Boolean)
      .join(' ')
  );
</script>

<textarea class={textareaClass} {...rest}></textarea>
