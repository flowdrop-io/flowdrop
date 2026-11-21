<!--
  @component
  The one field factory: it looks at a field's schema and draws the matching control inside a `FormFieldWrapper`.
  Not exported; `FormField` and `FormFieldLight` are its public wrappers.

  **Use it for** nothing directly. Use `FormField` or `FormFieldLight`.
  **Not for** a whole form (use `SchemaForm` or `ConfigForm`).

  The one field factory. The public components are thin wrappers around it:
  - FormFieldLight (exported as `FormField` from "@flowdrop/flowdrop/form")
    passes no editors, so CodeMirror stays out of the light entry
  - FormField (exported as `FormFieldFull` from "@flowdrop/flowdrop/form/full")
    passes the statically imported code, markdown and template editors

  Heavy editors (code, markdown, template) are not imported here; they come
  from, in order:
  - the instance's field registry — `registerCodeEditorField()` from
    "@flowdrop/flowdrop/form/code", `registerMarkdownEditorField()` from
    "@flowdrop/flowdrop/form/markdown", or any host override
  - the `editors` prop, which only the two wrappers above set
  - otherwise a plain textarea with a hint naming the registration call

  Features:
  - Automatically selects the correct field component based on schema
  - Wraps fields with FormFieldWrapper for consistent layout
  - Supports all basic field types (string, number, boolean, checkbox group, range)
  - Uses standard JSON Schema patterns (enum, oneOf) for select fields
  - schema.readOnly disables every input, built-in or registered
  
  Type Resolution Order:
  1. Check field registry for custom/heavy components (highest priority)
  2. format: 'hidden' -> skip rendering (return nothing)
  3. format: 'autocomplete' with autocomplete.url -> FormAutocomplete
  4. format: 'json' | 'code' | 'markdown' | 'template', or type: 'object' with
     no format of its own -> `editors` prop, else the textarea fallback
  5. format: 'ports' -> FormPorts
  6. enum with multiple: true -> FormCheckboxGroup
  7. enum -> FormSelect (simple values without labels)
  8. oneOf with const/title (labeled options) -> FormSelect
  9. format: 'multiline' -> FormTextarea
  10. format: 'range' (number/integer) -> FormRangeField
  11. type: 'string' -> FormTextField
  12. type: 'number' or 'integer' -> FormNumberField
  13. type: 'boolean' -> FormToggle
  14. type: 'array' -> FormArray
  15. fallback -> FormTextField
-->

<script lang="ts">
  import { editorTypeWord } from '$lib/utils/schemaType.js';
  import FormFieldWrapper from './FormFieldWrapper.svelte';
  import FormTextField from './FormTextField.svelte';
  import FormTextarea from './FormTextarea.svelte';
  import FormNumberField from './FormNumberField.svelte';
  import FormRangeField from './FormRangeField.svelte';
  import FormToggle from './FormToggle.svelte';
  import FormSelect from './FormSelect.svelte';
  import FormCheckboxGroup from './FormCheckboxGroup.svelte';
  import FormArray from './FormArray.svelte';
  import FormPorts from './FormPorts.svelte';
  import FormAutocomplete from './FormAutocomplete.svelte';
  import { schemaAdmitsNull, typeIsNullOnly } from '$lib/utils/schemaType.js';
  import { m } from '$lib/messages/index.js';
  import { humanizeKey } from './humanizeKey.js';
  import { useFormReadOnly } from './readOnly.js';
  import { getInstance } from '$lib/stores/getInstance.svelte.js';
  import { getResolvedTheme } from '$lib/stores/settingsStore.svelte.js';
  import type { FormFieldFactoryProps } from './types.js';
  import { getSchemaOptions, normalizeOptions, type FieldOption } from './types.js';
  import {
    resolveBaseFieldType,
    resolveHeavyEditorKind,
    type HeavyEditorKind
  } from './resolveFieldType.js';
  import type { FieldComponent } from '$lib/form/fieldRegistry.js';

  const fd = getInstance();

  interface Props extends FormFieldFactoryProps {
    /**
     * Heavy editors to use when the field registry has none for the schema.
     * Set only by the wrappers: `FormFieldFull` passes the statically imported
     * set; `FormFieldLight` passes none so CodeMirror stays out of its bundle.
     */
    editors?: Partial<Record<HeavyEditorKind, FieldComponent>>;
  }

  let {
    fieldKey,
    schema,
    value,
    required = false,
    animationIndex = 0,
    node,
    nodes,
    edges,
    workflowId,
    authProvider,
    editors,
    itemRef,
    onChange
  }: Props = $props();

  /**
   * Disable all inputs (no editing) when schema.readOnly is true or the form
   * around the field is read-only (for example while the editor is locked).
   */
  const formReadOnly = useFormReadOnly();
  const isReadOnly = $derived(schema.readOnly === true || formReadOnly());
  // Text, textarea and number fields take a read-only form from the form context
  // themselves (as readonly, so the value stays selectable); they are disabled
  // only by a read-only schema.

  /**
   * Computed description ID for ARIA association
   */
  const descriptionId = $derived(
    schema.description && schema.title ? `${fieldKey}-description` : undefined
  );

  /**
   * Animation delay based on index
   */
  const animationDelay = $derived(animationIndex * 30);

  /**
   * Field label - prefer title, fall back to description, then the humanised key
   */
  const fieldLabel = $derived(String(schema.title ?? schema.description ?? humanizeKey(fieldKey)));

  /**
   * The heavy editor this schema asks for, if any
   */
  const heavyEditorKind = $derived(resolveHeavyEditorKind(schema));

  /**
   * The component to render instead of a built-in field: a registry match
   * (host overrides and registered heavy editors) wins, then the heavy editor
   * handed in through `editors`
   */
  const RegisteredComponent = $derived(
    fd.fields.resolveFieldComponent(schema)?.component ??
      (heavyEditorKind ? editors?.[heavyEditorKind] : undefined)
  );

  /**
   * Determine the field type to render
   */
  const fieldType = $derived.by(() => {
    if (RegisteredComponent) {
      return 'registered';
    }

    // Hidden fields should not be rendered
    if (schema.format === 'hidden') {
      return 'hidden';
    }

    // Autocomplete for format: "autocomplete" with autocomplete.url. A
    // registered override already won above.
    if (schema.format === 'autocomplete' && schema.autocomplete?.url) {
      return 'autocomplete';
    }

    // A heavy editor nobody registered or passed in
    if (heavyEditorKind) {
      return `${heavyEditorKind}-fallback` as const;
    }

    // Injected port order + exposure widget (the `ports` reserved config prop).
    if (schema.format === 'ports') {
      return 'ports';
    }

    // Shared basic field resolution (enum/oneOf/primitive types).
    const base = resolveBaseFieldType(schema);
    if (base) {
      return base;
    }

    // Fallback to text
    return 'text';
  });

  /**
   * The "null" toggle: offered only where `null` is a valid value (the type
   * lists it or the enum does). Anywhere else saving `null` would fail validation.
   * A config that already holds `null` shows it on. The field only reports the
   * toggle: `null` when it goes on, `undefined` ("no value") when it goes off.
   * What comes back, if anything, is the form's business: it remembers the value
   * from before.
   *
   * A field whose type is only `null` has one possible value and no editor. Absent
   * is not null (a null is a choice), so it shows "Not set" until the toggle
   * stores `null`. A stored `null` the schema does not admit shows the muted "null"
   * above the editor (no toggle), so it does not look absent; editing replaces it.
   */
  const nullOnly = $derived(typeIsNullOnly(schema.type));
  const nullable = $derived(schemaAdmitsNull(schema));
  const isNull = $derived(value === null);
  function toggleNull() {
    onChange(isNull ? undefined : null);
  }

  /**
   * A field with `when_missing: skip` says what an empty value does. Not gated
   * on `required`: a connectable required parameter is not in the config
   * schema's `required` list, and the backend sends the flag only on required
   * parameters (CFG-20).
   */
  const whenMissingHint = $derived(
    schema.when_missing === 'skip' ? m().form.field.skippedWhenNotSet : undefined
  );

  /**
   * The text of the textarea that stands in for an unregistered code editor. A
   * `format: json` / `code` string is the JSON text and shows as it is; a string
   * in any other field (absent or several types) is a string value, so it is
   * JSON-quoted and a later edit does not change its type. Other fallbacks
   * (markdown, template) edit plain text.
   */
  const fallbackText = $derived.by(() => {
    if (typeof value !== 'string') return value === undefined ? '' : JSON.stringify(value, null, 2);
    if (fieldType !== 'code-editor-fallback') return value;
    return schema.format === 'json' || schema.format === 'code' ? value : JSON.stringify(value);
  });

  /**
   * The ids the input is described by: its description and the hint. The hint's
   * id is the one `FormFieldWrapper` gives it (`{id}-hint`).
   */
  const describedBy = $derived(
    [descriptionId, whenMissingHint ? `${fieldKey}-hint` : undefined]
      .filter((id) => id !== undefined)
      .join(' ') || undefined
  );

  /**
   * The enum members that are options. `null` is not one: the null toggle stores
   * it, and as an option it would be stored as the text "null".
   */
  const enumMembers = $derived((schema.enum ?? []).filter((opt) => opt !== null));

  /** The enum options as strings, for the select and checkbox components. */
  const enumOptions = $derived(enumMembers.map((opt) => String(opt)));

  /** The `oneOf` constants that are options, in the order `selectOptions` lists them. */
  const oneOfMembers = $derived(
    (schema.oneOf ?? []).filter((item) => item.const !== null).map((item) => item.const)
  );

  /**
   * The member of `members` an option stands for. Options are shown as strings;
   * the config keeps the original member, so `{ type: 'integer', enum: [1, 2] }`
   * stores `2`, not `"2"` (R6.e.2). A value that is no option (the empty option's
   * `''`) goes through unchanged.
   */
  function memberFor(members: readonly unknown[], chosen: unknown): unknown {
    const index = members.findIndex((member) => String(member) === chosen);
    return index < 0 ? chosen : members[index];
  }

  /**
   * Get select options for select-options type
   * Handles both oneOf (standard) and options (legacy) patterns
   */
  const selectOptions = $derived(getSchemaOptions(schema));

  /**
   * Get current value as the appropriate type
   */
  // An object or array value is shown as JSON, never as "[object Object]".
  const stringValue = $derived(
    typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')
  );
  const numberValue = $derived(value as number | string);
  const booleanValue = $derived(Boolean(value ?? schema.default ?? false));
  // A slider has no placeholder: an absent value shows at the default.
  const rangeValue = $derived((value ?? schema.default) as number | string);
  const arrayValue = $derived.by((): string[] => {
    if (Array.isArray(value)) {
      return value.map((v) => String(v));
    }
    return [];
  });
  const arrayItems = $derived.by((): unknown[] => {
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  });

  /**
   * Autocomplete value - string or string[] depending on `autocomplete.multiple`
   */
  const autocompleteValue = $derived.by((): string | string[] => {
    if (schema.autocomplete?.multiple) {
      if (Array.isArray(value)) {
        return value.map((v) => String(v));
      }
      return value ? [String(value)] : [];
    }
    return String(value ?? '');
  });

  /**
   * Get helpful message for missing editor registration
   */
  function getEditorHint(editorType: string): string {
    switch (editorType) {
      case 'code-editor-fallback':
        return "Code editor not registered. Register it on the instance's field registry: import { registerCodeEditorField } from '@flowdrop/flowdrop/form/code'; registerCodeEditorField(instance.fields);";
      case 'markdown-editor-fallback':
        return "Markdown editor not registered. Register it on the instance's field registry: import { registerMarkdownEditorField } from '@flowdrop/flowdrop/form/markdown'; registerMarkdownEditorField(instance.fields);";
      case 'template-editor-fallback':
        return "Template editor not registered. Register it on the instance's field registry: import { registerTemplateEditorField } from '@flowdrop/flowdrop/form/code'; registerTemplateEditorField(instance.fields);";
      default:
        return 'This field type requires additional registration.';
    }
  }

  /**
   * An array's description reads as two parts: the first sentence is a short note
   * on the label row ("Matched in order"), the rest is help under the Add button.
   */
  const isArrayField = $derived(fieldType === 'array' && !!schema.items);
  const arrayText = $derived.by((): { note?: string; help?: string } => {
    const text = isArrayField && typeof schema.description === 'string' ? schema.description : '';
    if (!text) return {};
    const cut = text.search(/[.!?](\s|$)/);
    if (cut < 0) return { note: text };
    const note = text.slice(0, cut).trim();
    const help = text.slice(cut + 1).trim();
    return { note, help: help || undefined };
  });

  /**
   * The label of a select's empty option, which an absent value shows: the
   * default ("Default (x)", x as the option's label) when the schema has one,
   * else a dash. `undefined` (no empty option) when `''` is one of the choices.
   */
  function selectEmptyLabel(options: string[] | FieldOption[]): string | undefined {
    const normalized = normalizeOptions(options);
    if (normalized.some((option) => option.value === '')) return undefined;
    if (schema.default === undefined || schema.default === null) return '—';
    const match = normalized.find((option) => option.value === String(schema.default));
    return m().form.field.defaultOption({ value: match?.label ?? String(schema.default) });
  }

  /**
   * A field's schema default as placeholder text, so an emptied field (whose
   * key is then absent and whose default applies) shows what will be used.
   */
  function defaultPlaceholder(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  }
</script>

{#if fieldType !== 'hidden'}
  <FormFieldWrapper
    aside={arrayText.note}
    id={fieldKey}
    label={fieldLabel}
    {required}
    description={isArrayField
      ? undefined
      : schema.title || fieldType === 'ports'
        ? schema.description
        : undefined}
    plain={fieldType === 'ports'}
    inline={fieldType === 'toggle'}
    {nullOnly}
    staleNull={isNull && !nullable}
    nullToggle={nullable && fieldType !== 'ports'
      ? { on: isNull, disabled: isReadOnly, onToggle: toggleNull }
      : undefined}
    hint={whenMissingHint}
    {animationDelay}
  >
    {#if fieldType === 'registered' && RegisteredComponent}
      <!-- Render registered custom component -->
      <!-- darkTheme: use schema value if explicitly set, otherwise derive from resolved theme -->
      <!-- placeholder stays undefined when unset so each editor keeps its own default -->
      <RegisteredComponent
        id={fieldKey}
        {value}
        placeholder={schema.placeholder}
        {required}
        {schema}
        ariaDescribedBy={describedBy}
        disabled={isReadOnly}
        height={schema.height as string | undefined}
        darkTheme={schema.darkTheme ?? getResolvedTheme() === 'dark'}
        autoFormat={schema.autoFormat as boolean | undefined}
        showToolbar={schema.showToolbar as boolean | undefined}
        showStatusBar={schema.showStatusBar as boolean | undefined}
        spellChecker={schema.spellChecker as boolean | undefined}
        variables={schema.variables}
        placeholderExample={schema.placeholderExample as string | undefined}
        autocomplete={schema.autocomplete}
        {node}
        {nodes}
        {edges}
        {workflowId}
        {authProvider}
        onChange={(val: unknown) => onChange(val)}
      />
    {:else if fieldType === 'autocomplete' && schema.autocomplete}
      <FormAutocomplete
        id={fieldKey}
        value={autocompleteValue}
        autocomplete={schema.autocomplete}
        placeholder={schema.placeholder ?? ''}
        {required}
        ariaDescribedBy={describedBy}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'checkbox-group'}
      <FormCheckboxGroup
        id={fieldKey}
        value={arrayValue}
        options={enumOptions}
        ariaDescribedBy={describedBy}
        disabled={isReadOnly}
        onChange={(val) => onChange(val.map((chosen) => memberFor(enumMembers, chosen)))}
      />
    {:else if fieldType === 'select-enum'}
      <FormSelect
        id={fieldKey}
        value={stringValue}
        options={enumOptions}
        emptyLabel={selectEmptyLabel(enumOptions)}
        {required}
        ariaDescribedBy={describedBy}
        disabled={isReadOnly}
        onChange={(val) => onChange(memberFor(enumMembers, val))}
      />
    {:else if fieldType === 'textarea'}
      <FormTextarea
        id={fieldKey}
        value={stringValue}
        placeholder={schema.placeholder ?? defaultPlaceholder(schema.default)}
        {required}
        ariaDescribedBy={describedBy}
        disabled={schema.readOnly === true}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'text'}
      <FormTextField
        id={fieldKey}
        value={stringValue}
        placeholder={schema.placeholder ?? defaultPlaceholder(schema.default)}
        {required}
        ariaDescribedBy={describedBy}
        disabled={schema.readOnly === true}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'number'}
      <FormNumberField
        id={fieldKey}
        value={numberValue}
        placeholder={schema.placeholder ?? defaultPlaceholder(schema.default)}
        min={schema.minimum}
        max={schema.maximum}
        step={schema.step}
        {required}
        ariaDescribedBy={describedBy}
        disabled={schema.readOnly === true}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'range'}
      <FormRangeField
        id={fieldKey}
        value={rangeValue}
        min={schema.minimum}
        max={schema.maximum}
        step={schema.step}
        {required}
        ariaDescribedBy={describedBy}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'toggle'}
      <FormToggle
        id={fieldKey}
        value={booleanValue}
        ariaDescribedBy={describedBy}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'select-options'}
      <FormSelect
        id={fieldKey}
        value={stringValue}
        options={selectOptions}
        emptyLabel={selectEmptyLabel(selectOptions)}
        {required}
        ariaDescribedBy={describedBy}
        disabled={isReadOnly}
        onChange={(val) => onChange(memberFor(oneOfMembers, val))}
      />
    {:else if fieldType === 'array' && schema.items}
      <FormArray
        id={fieldKey}
        value={arrayItems}
        itemSchema={schema.items}
        minItems={schema.minItems}
        maxItems={schema.maxItems}
        addLabel={`Add ${schema.items.title ?? 'Item'}`}
        readOnly={schema.readOnly === true}
        disabled={isReadOnly}
        {itemRef}
        help={arrayText.help}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'ports'}
      <FormPorts
        id={fieldKey}
        {value}
        ariaDescribedBy={describedBy}
        {node}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType.endsWith('-fallback')}
      <!-- Fallback for unregistered heavy editors -->
      <div class="form-field-fallback">
        <div class="form-field-fallback__message">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="form-field-fallback__icon"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clip-rule="evenodd"
            />
          </svg>
          <span>Editor component not registered</span>
        </div>
        <p class="form-field-fallback__hint">
          {getEditorHint(fieldType)}
        </p>
        <!-- Provide a basic textarea fallback for editing -->
        <FormTextarea
          id={fieldKey}
          value={fallbackText}
          placeholder={schema.placeholder ?? 'Enter value...'}
          {required}
          ariaDescribedBy={describedBy}
          disabled={isReadOnly}
          onChange={(val) => {
            // Try to parse as JSON for object types and for a field with no single type
            const kind = editorTypeWord(schema.type);
            if (kind === 'object' || kind === undefined || schema.format === 'json') {
              try {
                onChange(JSON.parse(val));
              } catch {
                onChange(val);
              }
            } else {
              onChange(val);
            }
          }}
        />
      </div>
    {:else}
      <!-- Fallback to text input -->
      <FormTextField
        id={fieldKey}
        value={stringValue}
        placeholder={schema.placeholder ?? ''}
        ariaDescribedBy={describedBy}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {/if}
  </FormFieldWrapper>
{/if}

<style>
  .form-field-fallback {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-field-fallback__message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: var(--fd-warning-muted);
    border: 1px solid var(--fd-warning);
    border-radius: var(--fd-radius-md);
    color: var(--fd-warning-hover);
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .form-field-fallback__icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: var(--fd-warning);
  }

  .form-field-fallback__hint {
    margin: 0;
    padding: 0.5rem 0.75rem;
    background-color: var(--fd-muted);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
    font-size: 0.6875rem;
    line-height: 1.5;
    color: var(--fd-muted-foreground);
    word-break: break-word;
  }
</style>
