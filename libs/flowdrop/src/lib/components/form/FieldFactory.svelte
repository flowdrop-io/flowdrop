<!--
  FieldFactory Component (internal — not exported)
  Factory component that renders the appropriate field based on schema type.

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
  import { getInstance } from '$lib/stores/getInstance.svelte.js';
  import { getResolvedTheme } from '$lib/stores/settingsStore.svelte.js';
  import type { FormFieldFactoryProps } from './types.js';
  import { getSchemaOptions } from './types.js';
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
    onChange
  }: Props = $props();

  /**
   * When schema.readOnly is true, disable all inputs (no editing).
   */
  const isReadOnly = $derived(schema.readOnly === true);

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
   * Field label - prefer title, fall back to description, then key
   */
  const fieldLabel = $derived(String(schema.title ?? schema.description ?? fieldKey));

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
   * Get enum options as string array for select/checkbox components
   */
  const enumOptions = $derived.by((): string[] => {
    if (!schema.enum) return [];
    return schema.enum.map((opt) => String(opt));
  });

  /**
   * Get select options for select-options type
   * Handles both oneOf (standard) and options (legacy) patterns
   */
  const selectOptions = $derived(getSchemaOptions(schema));

  /**
   * Get current value as the appropriate type
   */
  const stringValue = $derived(String(value ?? ''));
  const numberValue = $derived(value as number | string);
  const booleanValue = $derived(Boolean(value ?? schema.default ?? false));
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
</script>

{#if fieldType !== 'hidden'}
  <FormFieldWrapper
    id={fieldKey}
    label={fieldLabel}
    {required}
    description={schema.title ? schema.description : undefined}
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
        ariaDescribedBy={descriptionId}
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
        ariaDescribedBy={descriptionId}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'checkbox-group'}
      <FormCheckboxGroup
        id={fieldKey}
        value={arrayValue}
        options={enumOptions}
        ariaDescribedBy={descriptionId}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'select-enum'}
      <FormSelect
        id={fieldKey}
        value={stringValue}
        options={enumOptions}
        {required}
        ariaDescribedBy={descriptionId}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'textarea'}
      <FormTextarea
        id={fieldKey}
        value={stringValue}
        placeholder={schema.placeholder ?? ''}
        {required}
        ariaDescribedBy={descriptionId}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'text'}
      <FormTextField
        id={fieldKey}
        value={stringValue}
        placeholder={schema.placeholder ?? ''}
        {required}
        ariaDescribedBy={descriptionId}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'number'}
      <FormNumberField
        id={fieldKey}
        value={numberValue}
        placeholder={schema.placeholder ?? ''}
        min={schema.minimum}
        max={schema.maximum}
        step={schema.step}
        {required}
        ariaDescribedBy={descriptionId}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'range'}
      <FormRangeField
        id={fieldKey}
        value={numberValue}
        min={schema.minimum}
        max={schema.maximum}
        step={schema.step}
        {required}
        ariaDescribedBy={descriptionId}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'toggle'}
      <FormToggle
        id={fieldKey}
        value={booleanValue}
        ariaDescribedBy={descriptionId}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'select-options'}
      <FormSelect
        id={fieldKey}
        value={stringValue}
        options={selectOptions}
        {required}
        ariaDescribedBy={descriptionId}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'array' && schema.items}
      <FormArray
        id={fieldKey}
        value={arrayItems}
        itemSchema={schema.items}
        minItems={schema.minItems}
        maxItems={schema.maxItems}
        addLabel={`Add ${schema.items.title ?? 'Item'}`}
        disabled={isReadOnly}
        onChange={(val) => onChange(val)}
      />
    {:else if fieldType === 'ports'}
      <FormPorts
        id={fieldKey}
        {value}
        ariaDescribedBy={descriptionId}
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
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          placeholder={schema.placeholder ?? 'Enter value...'}
          {required}
          ariaDescribedBy={descriptionId}
          disabled={isReadOnly}
          onChange={(val) => {
            // Try to parse as JSON for object types
            if (schema.type === 'object' || schema.format === 'json') {
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
        ariaDescribedBy={descriptionId}
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
