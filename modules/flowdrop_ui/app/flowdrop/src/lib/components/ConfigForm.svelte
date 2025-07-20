<!--
  ConfigForm Component
  Generates configuration forms from JSON Schema and manages user values
  Separates schema (form structure) from values (user input)
-->

<script lang="ts">
  import type { ConfigSchema, ConfigProperty, ConfigValues } from "../types/index.js";
  import { createEventDispatcher } from "svelte";

  interface Props {
    schema: ConfigSchema;
    values: ConfigValues;
    disabled?: boolean;
  }

  let props: Props = $props();
  let dispatch = createEventDispatcher<{
    change: { values: ConfigValues };
    validate: { isValid: boolean; errors: string[] };
  }>();

  // Local copy of values for editing
  let localValues = $state<ConfigValues>({ ...props.values });

  // Validation errors
  let validationErrors = $state<Record<string, string>>({});

  // Update local values when props change
  $effect(() => {
    localValues = { ...props.values };
  });

  // Debug logging
  $effect(() => {
    console.log('🔧 ConfigForm Debug:', {
      schema: props.schema,
      schemaProperties: props.schema?.properties,
      values: props.values,
      disabled: props.disabled,
      hasSchema: !!props.schema,
      hasProperties: !!props.schema?.properties,
      propertiesKeys: props.schema?.properties ? Object.keys(props.schema.properties) : []
    });
  });

  /**
   * Validate a single field against its schema
   */
  function validateField(fieldName: string, value: unknown, property: ConfigProperty): string | null {
    // Check if schema exists
    if (!props.schema) {
      return null;
    }
    
    // Required field validation
    if (props.schema.required?.includes(fieldName) && (value === null || value === undefined || value === "")) {
      return `${property.title || fieldName} is required`;
    }

    // Type validation
    if (value !== null && value !== undefined) {
      switch (property.type) {
        case "string":
          if (typeof value !== "string") {
            return `${property.title || fieldName} must be a string`;
          }
          if (property.minLength && value.length < property.minLength) {
            return `${property.title || fieldName} must be at least ${property.minLength} characters`;
          }
          if (property.maxLength && value.length > property.maxLength) {
            return `${property.title || fieldName} must be at most ${property.maxLength} characters`;
          }
          if (property.pattern && !new RegExp(property.pattern).test(value)) {
            return `${property.title || fieldName} format is invalid`;
          }
          break;

        case "number":
          if (typeof value !== "number") {
            return `${property.title || fieldName} must be a number`;
          }
          if (property.minimum !== undefined && value < property.minimum) {
            return `${property.title || fieldName} must be at least ${property.minimum}`;
          }
          if (property.maximum !== undefined && value > property.maximum) {
            return `${property.title || fieldName} must be at most ${property.maximum}`;
          }
          break;

        case "boolean":
          if (typeof value !== "boolean") {
            return `${property.title || fieldName} must be a boolean`;
          }
          break;

        case "array":
          if (!Array.isArray(value)) {
            return `${property.title || fieldName} must be an array`;
          }
          break;
      }
    }

    return null;
  }

  /**
   * Validate all fields
   */
  function validateForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const newValidationErrors: Record<string, string> = {};

    // Check if schema and properties exist
    if (!props.schema || !props.schema.properties || typeof props.schema.properties !== 'object') {
      console.warn('ConfigForm: Invalid schema or properties:', { schema: props.schema, properties: props.schema?.properties });
      return { isValid: true, errors: [] };
    }

    Object.entries(props.schema.properties).forEach(([fieldName, property]) => {
      const value = localValues[fieldName];
      const error = validateField(fieldName, value, property);
      
      if (error) {
        errors.push(error);
        newValidationErrors[fieldName] = error;
      }
    });

    validationErrors = newValidationErrors;
    
    const isValid = errors.length === 0;
    dispatch("validate", { isValid, errors });
    
    return { isValid, errors };
  }

  /**
   * Handle field value change
   */
  function handleFieldChange(fieldName: string, value: unknown): void {
    localValues[fieldName] = value;
    
    // Validate the changed field
    if (props.schema && props.schema.properties && props.schema.properties[fieldName]) {
      const property = props.schema.properties[fieldName];
      const error = validateField(fieldName, value, property);
      
      if (error) {
        validationErrors[fieldName] = error;
      } else {
        delete validationErrors[fieldName];
      }
    }
    
    // Emit change event
    dispatch("change", { values: { ...localValues } });
    
    // Validate entire form
    validateForm();
  }

  /**
   * Get default value for a field
   */
  function getDefaultValue(property: ConfigProperty): unknown {
    if (property.default !== undefined) {
      return property.default;
    }
    
    switch (property.type) {
      case "string":
        return "";
      case "number":
        return 0;
      case "boolean":
        return false;
      case "array":
        return [];
      case "object":
        return {};
      default:
        return null;
    }
  }

  /**
   * Render a form field based on its schema
   */
  function renderField(fieldName: string, property: ConfigProperty): string {
    const value = localValues[fieldName] ?? getDefaultValue(property);
    const error = validationErrors[fieldName];
    const isRequired = props.schema.required?.includes(fieldName) || false;

    switch (property.type) {
      case "string":
        if (property.enum) {
          return renderSelectField(fieldName, property, value, error, isRequired);
        } else if (property.format === "multiline" || property.maxLength > 100) {
          return renderTextareaField(fieldName, property, value, error, isRequired);
        } else {
          return renderInputField(fieldName, property, value, error, isRequired);
        }

      case "number":
        return renderNumberField(fieldName, property, value, error, isRequired);

      case "boolean":
        return renderCheckboxField(fieldName, property, value, error, isRequired);

      case "array":
        return renderArrayField(fieldName, property, value, error, isRequired);

      case "object":
        return renderObjectField(fieldName, property, value, error, isRequired);

      default:
        return renderInputField(fieldName, property, value, error, isRequired);
    }
  }

  function renderInputField(fieldName: string, property: ConfigProperty, value: unknown, error: string | undefined, isRequired: boolean): string {
    return `
      <div class="flowdrop-form-field">
        <label class="flowdrop-form-label" for="${fieldName}">
          ${property.title || fieldName}
          ${isRequired ? '<span class="flowdrop-form-required">*</span>' : ''}
        </label>
        <input
          id="${fieldName}"
          type="text"
          class="flowdrop-form-input ${error ? 'flowdrop-form-input--error' : ''}"
          value="${value || ''}"
          placeholder="${property.description || ''}"
          disabled="${props.disabled || false}"
          onchange="handleFieldChange('${fieldName}', this.value)"
        />
        ${error ? `<div class="flowdrop-form-error">${error}</div>` : ''}
        ${property.description ? `<div class="flowdrop-form-help">${property.description}</div>` : ''}
      </div>
    `;
  }

  function renderTextareaField(fieldName: string, property: ConfigProperty, value: unknown, error: string | undefined, isRequired: boolean): string {
    return `
      <div class="flowdrop-form-field">
        <label class="flowdrop-form-label" for="${fieldName}">
          ${property.title || fieldName}
          ${isRequired ? '<span class="flowdrop-form-required">*</span>' : ''}
        </label>
        <textarea
          id="${fieldName}"
          class="flowdrop-form-textarea ${error ? 'flowdrop-form-textarea--error' : ''}"
          placeholder="${property.description || ''}"
          rows="4"
          disabled="${props.disabled || false}"
          onchange="handleFieldChange('${fieldName}', this.value)"
        >${value || ''}</textarea>
        ${error ? `<div class="flowdrop-form-error">${error}</div>` : ''}
        ${property.description ? `<div class="flowdrop-form-help">${property.description}</div>` : ''}
      </div>
    `;
  }

  function renderNumberField(fieldName: string, property: ConfigProperty, value: unknown, error: string | undefined, isRequired: boolean): string {
    return `
      <div class="flowdrop-form-field">
        <label class="flowdrop-form-label" for="${fieldName}">
          ${property.title || fieldName}
          ${isRequired ? '<span class="flowdrop-form-required">*</span>' : ''}
        </label>
        <input
          id="${fieldName}"
          type="number"
          class="flowdrop-form-input ${error ? 'flowdrop-form-input--error' : ''}"
          value="${value || ''}"
          min="${property.minimum || ''}"
          max="${property.maximum || ''}"
          step="any"
          disabled="${props.disabled || false}"
          onchange="handleFieldChange('${fieldName}', parseFloat(this.value))"
        />
        ${error ? `<div class="flowdrop-form-error">${error}</div>` : ''}
        ${property.description ? `<div class="flowdrop-form-help">${property.description}</div>` : ''}
      </div>
    `;
  }

  function renderCheckboxField(fieldName: string, property: ConfigProperty, value: unknown, error: string | undefined, isRequired: boolean): string {
    return `
      <div class="flowdrop-form-field">
        <label class="flowdrop-form-checkbox">
          <input
            id="${fieldName}"
            type="checkbox"
            class="flowdrop-form-checkbox__input"
            checked="${value || false}"
            disabled="${props.disabled || false}"
            onchange="handleFieldChange('${fieldName}', this.checked)"
          />
          <span class="flowdrop-form-checkbox__label">
            ${property.title || fieldName}
            ${isRequired ? '<span class="flowdrop-form-required">*</span>' : ''}
          </span>
        </label>
        ${error ? `<div class="flowdrop-form-error">${error}</div>` : ''}
        ${property.description ? `<div class="flowdrop-form-help">${property.description}</div>` : ''}
      </div>
    `;
  }

  function renderSelectField(fieldName: string, property: ConfigProperty, value: unknown, error: string | undefined, isRequired: boolean): string {
    const options = property.enum?.map((option, index) => 
      `<option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>`
    ).join('') || '';

    return `
      <div class="flowdrop-form-field">
        <label class="flowdrop-form-label" for="${fieldName}">
          ${property.title || fieldName}
          ${isRequired ? '<span class="flowdrop-form-required">*</span>' : ''}
        </label>
        <select
          id="${fieldName}"
          class="flowdrop-form-select ${error ? 'flowdrop-form-select--error' : ''}"
          disabled="${props.disabled || false}"
          onchange="handleFieldChange('${fieldName}', this.value)"
        >
          ${options}
        </select>
        ${error ? `<div class="flowdrop-form-error">${error}</div>` : ''}
        ${property.description ? `<div class="flowdrop-form-help">${property.description}</div>` : ''}
      </div>
    `;
  }

  function renderArrayField(fieldName: string, property: ConfigProperty, value: unknown, error: string | undefined, isRequired: boolean): string {
    return `
      <div class="flowdrop-form-field">
        <label class="flowdrop-form-label" for="${fieldName}">
          ${property.title || fieldName}
          ${isRequired ? '<span class="flowdrop-form-required">*</span>' : ''}
        </label>
        <textarea
          id="${fieldName}"
          class="flowdrop-form-textarea ${error ? 'flowdrop-form-textarea--error' : ''}"
          placeholder="Enter values separated by commas"
          rows="3"
          disabled="${props.disabled || false}"
          onchange="handleFieldChange('${fieldName}', this.value.split(',').map(v => v.trim()).filter(v => v))"
        >${Array.isArray(value) ? value.join(', ') : ''}</textarea>
        ${error ? `<div class="flowdrop-form-error">${error}</div>` : ''}
        ${property.description ? `<div class="flowdrop-form-help">${property.description}</div>` : ''}
      </div>
    `;
  }

  function renderObjectField(fieldName: string, property: ConfigProperty, value: unknown, error: string | undefined, isRequired: boolean): string {
    return `
      <div class="flowdrop-form-field">
        <label class="flowdrop-form-label" for="${fieldName}">
          ${property.title || fieldName}
          ${isRequired ? '<span class="flowdrop-form-required">*</span>' : ''}
        </label>
        <textarea
          id="${fieldName}"
          class="flowdrop-form-textarea ${error ? 'flowdrop-form-textarea--error' : ''}"
          placeholder="Enter JSON object"
          rows="4"
          disabled="${props.disabled || false}"
          onchange="handleFieldChange('${fieldName}', JSON.parse(this.value))"
        >${typeof value === 'object' ? JSON.stringify(value, null, 2) : ''}</textarea>
        ${error ? `<div class="flowdrop-form-error">${error}</div>` : ''}
        ${property.description ? `<div class="flowdrop-form-help">${property.description}</div>` : ''}
      </div>
    `;
  }

  // Initialize form with default values
  $effect(() => {
    if (props.schema) {
      Object.entries(props.schema.properties).forEach(([fieldName, property]) => {
        if (localValues[fieldName] === undefined) {
          localValues[fieldName] = getDefaultValue(property);
        }
      });
      
      // Validate on initialization
      validateForm();
    }
  });
</script>

  <div class="flowdrop-config-form">
    {#if props.schema && props.schema.properties && typeof props.schema.properties === 'object'}
      <form class="flowdrop-form" onsubmit={(e) => e.preventDefault()}>
      {#each Object.entries(props.schema.properties) as [fieldName, property]}
        <div class="flowdrop-form-field">
          <label class="flowdrop-form-label" for={fieldName}>
            {property.title || fieldName}
            {#if props.schema.required?.includes(fieldName)}
              <span class="flowdrop-form-required">*</span>
            {/if}
          </label>

          {#if property.type === "string"}
            {#if property.enum}
              <!-- Select field for enum -->
              <select
                id={fieldName}
                class="flowdrop-form-select {validationErrors[fieldName] ? 'flowdrop-form-select--error' : ''}"
                disabled={props.disabled || false}
                onchange={(e) => handleFieldChange(fieldName, (e.target as HTMLSelectElement).value)}
              >
                {#each property.enum as option}
                  <option value={option} selected={localValues[fieldName] === option}>
                    {option}
                  </option>
                {/each}
              </select>
            {:else if property.format === "multiline" || (property.maxLength && property.maxLength > 100)}
              <!-- Textarea for multiline or long text -->
              <textarea
                id={fieldName}
                class="flowdrop-form-textarea {validationErrors[fieldName] ? 'flowdrop-form-textarea--error' : ''}"
                placeholder={property.description || ""}
                rows="4"
                disabled={props.disabled || false}
                onchange={(e) => handleFieldChange(fieldName, (e.target as HTMLTextAreaElement).value)}
              >{localValues[fieldName] || ""}</textarea>
            {:else}
              <!-- Regular text input -->
              <input
                id={fieldName}
                type="text"
                class="flowdrop-form-input {validationErrors[fieldName] ? 'flowdrop-form-input--error' : ''}"
                value={localValues[fieldName] || ""}
                placeholder={property.description || ""}
                disabled={props.disabled || false}
                onchange={(e) => handleFieldChange(fieldName, (e.target as HTMLInputElement).value)}
              />
            {/if}
          {:else if property.type === "number"}
            <!-- Number input -->
            <input
              id={fieldName}
              type="number"
              class="flowdrop-form-input {validationErrors[fieldName] ? 'flowdrop-form-input--error' : ''}"
              value={localValues[fieldName] || ""}
              min={property.minimum}
              max={property.maximum}
              step="any"
              disabled={props.disabled || false}
              onchange={(e) => handleFieldChange(fieldName, parseFloat((e.target as HTMLInputElement).value))}
            />
          {:else if property.type === "boolean"}
            <!-- Checkbox -->
            <label class="flowdrop-form-checkbox">
              <input
                id={fieldName}
                type="checkbox"
                class="flowdrop-form-checkbox__input"
                checked={Boolean(localValues[fieldName])}
                disabled={props.disabled || false}
                onchange={(e) => handleFieldChange(fieldName, (e.target as HTMLInputElement).checked)}
              />
              <span class="flowdrop-form-checkbox__label">
                {property.description || ""}
              </span>
            </label>
          {:else if property.type === "array"}
            <!-- Array input (comma-separated) -->
            <textarea
              id={fieldName}
              class="flowdrop-form-textarea {validationErrors[fieldName] ? 'flowdrop-form-textarea--error' : ''}"
              placeholder="Enter values separated by commas"
              rows="3"
              disabled={props.disabled || false}
              onchange={(e) => handleFieldChange(fieldName, (e.target as HTMLTextAreaElement).value.split(",").map(v => v.trim()).filter(v => v))}
            >{Array.isArray(localValues[fieldName]) ? localValues[fieldName].join(", ") : ""}</textarea>
          {:else if property.type === "object"}
            <!-- JSON object input -->
            <textarea
              id={fieldName}
              class="flowdrop-form-textarea {validationErrors[fieldName] ? 'flowdrop-form-textarea--error' : ''}"
              placeholder="Enter JSON object"
              rows="4"
              disabled={props.disabled || false}
              onchange={(e) => {
                try {
                  handleFieldChange(fieldName, JSON.parse((e.target as HTMLTextAreaElement).value));
                } catch (err) {
                  // Handle JSON parse error
                }
              }}
            >{typeof localValues[fieldName] === "object" ? JSON.stringify(localValues[fieldName], null, 2) : ""}</textarea>
          {:else}
            <!-- Default text input -->
            <input
              id={fieldName}
              type="text"
              class="flowdrop-form-input {validationErrors[fieldName] ? 'flowdrop-form-input--error' : ''}"
              value={localValues[fieldName] || ""}
              placeholder={property.description || ""}
              disabled={props.disabled || false}
              onchange={(e) => handleFieldChange(fieldName, (e.target as HTMLInputElement).value)}
            />
          {/if}

          {#if validationErrors[fieldName]}
            <div class="flowdrop-form-error">{validationErrors[fieldName]}</div>
          {/if}

          {#if property.description}
            <div class="flowdrop-form-help">{property.description}</div>
          {/if}
        </div>
      {/each}
    </form>
  {:else}
    <div class="flowdrop-form-empty">
      <p class="flowdrop-text--sm flowdrop-text--gray">No configuration schema available for this node.</p>
    </div>
  {/if}
</div>

<style>
  .flowdrop-config-form {
    padding: 1rem;
  }

  .flowdrop-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .flowdrop-form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .flowdrop-form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .flowdrop-form-required {
    color: #dc2626;
    font-weight: 700;
  }

  .flowdrop-form-input,
  .flowdrop-form-textarea,
  .flowdrop-form-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background-color: #ffffff;
    transition: all 0.2s ease-in-out;
  }

  .flowdrop-form-input:focus,
  .flowdrop-form-textarea:focus,
  .flowdrop-form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .flowdrop-form-input--error,
  .flowdrop-form-textarea--error,
  .flowdrop-form-select--error {
    border-color: #dc2626;
  }

  .flowdrop-form-input--error:focus,
  .flowdrop-form-textarea--error:focus,
  .flowdrop-form-select--error:focus {
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  }

  .flowdrop-form-textarea {
    resize: vertical;
    min-height: 4rem;
  }

  .flowdrop-form-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .flowdrop-form-checkbox__input {
    width: 1rem;
    height: 1rem;
    accent-color: #3b82f6;
  }

  .flowdrop-form-checkbox__label {
    font-size: 0.875rem;
    color: #374151;
  }

  .flowdrop-form-error {
    font-size: 0.75rem;
    color: #dc2626;
    margin-top: 0.25rem;
  }

  .flowdrop-form-help {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .flowdrop-form-empty {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .flowdrop-form-input:disabled,
  .flowdrop-form-textarea:disabled,
  .flowdrop-form-select:disabled {
    background-color: #f9fafb;
    color: #9ca3af;
    cursor: not-allowed;
  }
</style> 