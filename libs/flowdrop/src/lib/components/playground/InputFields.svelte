<!--
  InputFields

  One `Field` per property of an object schema: the controls the Playground's
  inputs card and a form interrupt share. A string, number, boolean or enum
  property renders as its native control; an array or object property renders
  as a JSON text box with example chips (the interface definition's
  `examples` and `default`), since a typed list editor does not fit a panel
  this narrow. The text is kept as typed: whoever sends the values parses it
  (`collectInterfaceInputs`).

  Values are keyed by property name, and every change reports the complete
  values.
-->

<script lang="ts">
  import Field from '../primitives/Field.svelte';
  import type { ConfigProperty, ConfigSchema } from '../../types/index.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    /** The object schema to render. */
    schema: ConfigSchema;
    /** Current values, keyed by property name. */
    values: Record<string, unknown>;
    /** Called with the complete values on every change. */
    onChange: (values: Record<string, unknown>) => void;
    /** Example values per property name, offered as chips (besides `default`). */
    examples?: Record<string, unknown[]>;
    /** Disable every control. */
    disabled?: boolean;
  }

  let { schema, values, onChange, examples = {}, disabled = false }: Props = $props();

  const labels = $derived(m().playground.inputForm);
  const MAX_EXAMPLES = 5;

  const keys = $derived(
    Object.entries(schema.properties ?? {})
      .filter(([, property]) => property.format !== 'hidden')
      .map(([key]) => key)
  );

  function isJson(property: ConfigProperty): boolean {
    return property.type === 'array' || property.type === 'object';
  }

  function isMultiline(property: ConfigProperty): boolean {
    return (
      property.type === 'string' &&
      (property.format === 'multiline' ||
        (typeof property.maxLength === 'number' && property.maxLength > 200))
    );
  }

  /** A value as the text a person would type for this property. */
  function asText(property: ConfigProperty, value: unknown): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    return isJson(property) ? JSON.stringify(value, null, 2) : String(value);
  }

  /** An example as the compact text its chip shows and fills. */
  function exampleText(property: ConfigProperty, value: unknown): string {
    return typeof value === 'string' && !isJson(property) ? value : JSON.stringify(value);
  }

  function exampleTexts(key: string, property: ConfigProperty): string[] {
    if (property.enum || property.type === 'boolean') return [];
    const fromSchema = Array.isArray(property.examples) ? (property.examples as unknown[]) : [];
    const candidates = [...(examples[key] ?? fromSchema), property.default];
    const texts = candidates
      .filter((value) => value !== undefined && value !== null && value !== '')
      .map((value) => exampleText(property, value));
    return [...new Set(texts)].slice(0, MAX_EXAMPLES);
  }

  /** The hint inside an empty control: the default, else a JSON cue. */
  function placeholder(property: ConfigProperty): string | undefined {
    if (property.default !== undefined) return asText(property, property.default);
    return undefined;
  }

  function set(key: string, value: unknown): void {
    const next = { ...values };
    if (value === undefined) delete next[key];
    else next[key] = value;
    onChange(next);
  }

  function setNumber(key: string, event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    set(
      key,
      input.value === '' || Number.isNaN(input.valueAsNumber) ? undefined : input.valueAsNumber
    );
  }

  function enumIndex(property: ConfigProperty, value: unknown): number {
    return (property.enum ?? []).findIndex((option) => option === value);
  }

  function setEnum(key: string, property: ConfigProperty, event: Event): void {
    const index = Number((event.currentTarget as HTMLSelectElement).value);
    set(key, Number.isNaN(index) ? undefined : property.enum?.[index]);
  }
</script>

<div class="input-fields">
  {#each keys as key (key)}
    {@const property = schema.properties[key]}
    {@const chips = exampleTexts(key, property)}
    <Field
      label={property.title ?? key}
      typeTag={property.type === 'string' ? undefined : property.enum ? undefined : property.type}
      help={property.description}
      required={schema.required?.includes(key)}
      examples={chips}
      onexample={(text) =>
        set(key, isJson(property) || property.type === 'string' ? text : JSON.parse(text))}
    >
      {#snippet children(ctx)}
        {#if property.enum && !property.multiple}
          <select
            id={ctx.id}
            class="input-fields__control"
            aria-describedby={ctx.describedBy}
            {disabled}
            onchange={(event) => setEnum(key, property, event)}
          >
            <option value="" selected={enumIndex(property, values[key]) < 0}></option>
            {#each property.enum as option, index (index)}
              <option value={index} selected={enumIndex(property, values[key]) === index}>
                {String(option)}
              </option>
            {/each}
          </select>
        {:else if property.type === 'boolean'}
          <input
            id={ctx.id}
            class="input-fields__check"
            type="checkbox"
            aria-describedby={ctx.describedBy}
            {disabled}
            checked={values[key] === true ||
              (values[key] === undefined && property.default === true)}
            onchange={(event) => set(key, (event.currentTarget as HTMLInputElement).checked)}
          />
        {:else if property.type === 'number' || property.type === 'integer'}
          <input
            id={ctx.id}
            class="input-fields__control"
            type="number"
            step={property.type === 'integer' ? 1 : 'any'}
            min={property.minimum}
            max={property.maximum}
            placeholder={placeholder(property)}
            aria-describedby={ctx.describedBy}
            {disabled}
            value={asText(property, values[key])}
            oninput={(event) => setNumber(key, event)}
          />
        {:else if isJson(property) || isMultiline(property)}
          <textarea
            id={ctx.id}
            class="input-fields__control input-fields__control--text"
            class:input-fields__control--json={isJson(property)}
            rows={isJson(property) ? 3 : 2}
            spellcheck="false"
            placeholder={placeholder(property) ?? (isJson(property) ? labels.jsonHint : undefined)}
            aria-describedby={ctx.describedBy}
            {disabled}
            value={asText(property, values[key])}
            oninput={(event) => set(key, (event.currentTarget as HTMLTextAreaElement).value)}
          ></textarea>
        {:else}
          <input
            id={ctx.id}
            class="input-fields__control"
            type="text"
            placeholder={placeholder(property)}
            aria-describedby={ctx.describedBy}
            {disabled}
            value={asText(property, values[key])}
            oninput={(event) => set(key, (event.currentTarget as HTMLInputElement).value)}
          />
        {/if}
      {/snippet}
    </Field>
  {/each}
</div>

<style>
  .input-fields {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-md);
    min-width: 0;
  }

  .input-fields__control {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--fd-control-md);
    padding: 0 var(--fd-space-sm);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background-color: var(--fd-background);
    color: var(--fd-foreground);
    font: inherit;
    font-size: var(--fd-text-sm);
  }

  .input-fields__control--text {
    padding: var(--fd-space-xs) var(--fd-space-sm);
    resize: vertical;
    line-height: 1.5;
  }

  .input-fields__control--json {
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
  }

  .input-fields__control::placeholder {
    color: var(--fd-muted-foreground);
  }

  .input-fields__control:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .input-fields__check {
    align-self: flex-start;
    margin: 0;
  }
</style>
