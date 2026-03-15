/**
 * Form Builder Utility
 * A modular form builder for creating form fields programmatically
 */

import { html, type TemplateResult } from 'lit';
import { FieldType, OPERATORS, ACTION_TYPES } from './enums.js';
import { LABELS } from './constants.js';
import { FieldType as FieldTypeEnum } from './enums.js';
// ======================
// Field Definitions
// ======================

export interface FieldConfig {
  name: string;
  type: FieldType;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: SelectOption[];
  defaultValue?: any;
  disabled?: boolean;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// ======================
// Form Section
// ======================

export interface FormSection {
  title: string;
  fields: FieldConfig[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// ======================
// Form Builder Class
// ======================

/**
 * Form Builder - creates form field templates programmatically
 */
export class FormBuilder {
  private sections: FormSection[] = [];

  /**
   * Add a section to the form
   */
  addSection(section: FormSection): this {
    this.sections.push(section);
    return this;
  }

  /**
   * Create a section with title and fields
   */
  section(title: string, fields: FieldConfig[], collapsible = false): this {
    this.sections.push({ title, fields, collapsible, defaultExpanded: true });
    return this;
  }

  /**
   * Build all sections as template
   */
  build(): TemplateResult {
    return html`${this.sections.map(section => this.renderSection(section))}`;
  }

  /**
   * Render a single section
   */
  private renderSection(section: FormSection): TemplateResult {
    return html`
      <div class="form-section">
        <div class="form-section-title">
          <span>${section.title}</span>
        </div>
        <div class="form-row">
          ${section.fields.map(field => this.renderField(field))}
        </div>
      </div>
    `;
  }

  /**
   * Render a single field based on its type
   */
  renderField(config: FieldConfig): TemplateResult {
    switch (config.type) {
      case FieldType.TEXT:
        return this.renderTextField(config);
      case FieldType.TEXTAREA:
        return this.renderTextareaField(config);
      case FieldType.NUMBER:
        return this.renderNumberField(config);
      case FieldType.BOOLEAN:
        return this.renderCheckboxField(config);
      case FieldType.SELECT:
        return this.renderSelectField(config);
      case FieldType.TAGS:
        return this.renderTagsField(config);
      case FieldType.JSON:
        return this.renderJsonField(config);
      default:
        return this.renderTextField(config);
    }
  }

  /**
   * Render a text input field
   */
  renderTextField(config: FieldConfig): TemplateResult {
    return html`
      <div class="form-group">
        <label class="form-label">${config.label || config.name}</label>
        <input
          type="text"
          class="form-input"
          name="${config.name}"
          placeholder="${config.placeholder || ''}"
          ?required="${config.required}"
          ?disabled="${config.disabled}"
          .value="${config.defaultValue || ''}"
        />
        ${config.helpText ? html`<span class="help-text">${config.helpText}</span>` : ''}
      </div>
    `;
  }

  /**
   * Render a textarea field
   */
  renderTextareaField(config: FieldConfig): TemplateResult {
    return html`
      <div class="form-group">
        <label class="form-label">${config.label || config.name}</label>
        <textarea
          class="form-textarea"
          name="${config.name}"
          placeholder="${config.placeholder || ''}"
          rows="${config.rows || 3}"
          ?required="${config.required}"
          ?disabled="${config.disabled}"
        >${config.defaultValue || ''}</textarea>
      </div>
    `;
  }

  /**
   * Render a number input field
   */
  renderNumberField(config: FieldConfig): TemplateResult {
    return html`
      <div class="form-group">
        <label class="form-label">${config.label || config.name}</label>
        <input
          type="number"
          class="form-input"
          name="${config.name}"
          placeholder="${config.placeholder || ''}"
          min="${config.min !== undefined ? config.min : ''}"
          max="${config.max !== undefined ? config.max : ''}"
          step="${config.step !== undefined ? config.step : 1}"
          ?required="${config.required}"
          ?disabled="${config.disabled}"
          .value="${config.defaultValue !== undefined ? config.defaultValue : ''}"
        />
      </div>
    `;
  }

  /**
   * Render a checkbox field
   */
  renderCheckboxField(config: FieldConfig): TemplateResult {
    return html`
      <div class="form-checkbox">
        <input
          type="checkbox"
          name="${config.name}"
          id="${config.name}"
          ?checked="${config.defaultValue}"
          ?disabled="${config.disabled}"
        />
        <label for="${config.name}">${config.label || config.name}</label>
      </div>
    `;
  }

  /**
   * Render a select dropdown field
   */
  renderSelectField(config: FieldConfig): TemplateResult {
    return html`
      <div class="form-group">
        <label class="form-label">${config.label || config.name}</label>
        <select
          class="form-select"
          name="${config.name}"
          ?required="${config.required}"
          ?disabled="${config.disabled}"
        >
          <option value="">Select...</option>
          ${config.options?.map(opt => html`
            <option 
              value="${opt.value}" 
              ?disabled="${opt.disabled}"
              ?selected="${opt.value === config.defaultValue}"
            >
              ${opt.label}
            </option>
          `)}
        </select>
      </div>
    `;
  }

  /**
   * Render a tags input field (basic implementation)
   */
  renderTagsField(config: FieldConfig): TemplateResult {
    const tags = config.defaultValue || [];
    return html`
      <div class="form-group">
        <label class="form-label">${config.label || config.name}</label>
        <div class="tags-input">
          ${tags.map((tag: string) => html`
            <span class="tag">
              ${tag}
              <span class="tag-remove" data-tag="${tag}">×</span>
            </span>
          `)}
          <input
            type="text"
            class="tag-input"
            placeholder="${config.placeholder || LABELS.PLACEHOLDER_TAG_INPUT}"
          />
        </div>
      </div>
    `;
  }

  /**
   * Render a JSON textarea field
   */
  renderJsonField(config: FieldConfig): TemplateResult {
    const value = config.defaultValue 
      ? JSON.stringify(config.defaultValue, null, 2) 
      : '';
    return html`
      <div class="form-group">
        <label class="form-label">${config.label || config.name}</label>
        <textarea
          class="form-textarea"
          name="${config.name}"
          placeholder="${config.placeholder || LABELS.PLACEHOLDER_PARAMS}"
          rows="${config.rows || 5}"
          ?required="${config.required}"
          ?disabled="${config.disabled}"
        >${value}</textarea>
      </div>
    `;
  }
}

// ======================
// Pre-built Field Configs
// ======================

/**
 * Basic rule fields
 */
export const BASIC_RULE_FIELDS: FieldConfig[] = [
  {
    name: 'id',
    type: FieldTypeEnum.TEXT,
    label: LABELS.LABEL_ID,
    placeholder: LABELS.PLACEHOLDER_ID,
    required: true,
  },
  {
    name: 'name',
    type: FieldTypeEnum.TEXT,
    label: LABELS.LABEL_NAME,
    placeholder: LABELS.PLACEHOLDER_NAME,
  },
  {
    name: 'description',
    type: FieldTypeEnum.TEXTAREA,
    label: LABELS.LABEL_DESCRIPTION,
    placeholder: LABELS.PLACEHOLDER_DESCRIPTION,
    rows: 2,
  },
  {
    name: 'on',
    type: FieldType.TEXT,
    label: LABELS.LABEL_EVENT,
    required: true,
  },
];

/**
 * Rule metadata fields
 */
export const RULE_METADATA_FIELDS: FieldConfig[] = [
  {
    name: 'priority',
    type: FieldType.NUMBER,
    label: LABELS.LABEL_PRIORITY,
    defaultValue: 0,
    min: -100,
    max: 100,
  },
  {
    name: 'cooldown',
    type: FieldTypeEnum.NUMBER,
    label: LABELS.LABEL_COOLDOWN,
    defaultValue: 0,
    min: 0,
    step: 100,
  },
  {
    name: 'enabled',
    type: FieldType.BOOLEAN,
    label: LABELS.LABEL_ENABLED,
    defaultValue: true,
  },
  {
    name: 'tags',
    type: FieldType.TAGS,
    label: LABELS.LABEL_TAGS,
  },
];

/**
 * Condition fields for a single condition
 */
export const CONDITION_FIELD_DEFAULTS: FieldConfig[] = [
  {
    name: 'field',
    type: FieldTypeEnum.TEXT,
    label: LABELS.LABEL_CONDITION_FIELD,
    placeholder: 'e.g., data.user.role',
  },
  {
    name: 'operator',
    type: FieldTypeEnum.SELECT,
    label: LABELS.LABEL_CONDITION_OPERATOR,
    options: OPERATORS.map(op => ({ value: op.value, label: op.label })),
    defaultValue: 'EQ',
  },
  {
    name: 'value',
    type: FieldType.TEXT,
    label: LABELS.LABEL_CONDITION_VALUE,
    placeholder: LABELS.PLACEHOLDER_VALUE,
  },
];

/**
 * Action fields for a single action
 */
export const ACTION_FIELD_DEFAULTS: FieldConfig[] = [
  {
    name: 'type',
    type: FieldTypeEnum.SELECT,
    label: LABELS.LABEL_ACTION_TYPE,
    options: ACTION_TYPES.map(act => ({ value: act.value, label: act.label })),
    required: true,
  },
  {
    name: 'params',
    type: FieldType.JSON,
    label: LABELS.LABEL_ACTION_PARAMS,
    placeholder: LABELS.PLACEHOLDER_PARAMS,
    rows: 3,
  },
  {
    name: 'delay',
    type: FieldType.NUMBER,
    label: LABELS.LABEL_ACTION_DELAY,
    defaultValue: 0,
    min: 0,
    step: 100,
  },
  {
    name: 'probability',
    type: FieldType.NUMBER,
    label: LABELS.LABEL_ACTION_PROBABILITY,
    defaultValue: 100,
    min: 0,
    max: 100,
  },
];

// ======================
// Helper Functions
// ======================

/**
 * Create a basic rule form section
 */
export function createBasicRuleSection(): FormSection {
  return {
    title: LABELS.SECTION_BASIC,
    fields: BASIC_RULE_FIELDS,
  };
}

/**
 * Create a metadata form section
 */
export function createMetadataSection(): FormSection {
  return {
    title: 'Metadata',
    fields: RULE_METADATA_FIELDS,
  };
}

/**
 * Create a conditions form section
 */
export function createConditionsSection(): FormSection {
  return {
    title: LABELS.SECTION_CONDITIONS,
    fields: [],
    collapsible: true,
  };
}

/**
 * Create an actions form section
 */
export function createActionsSection(): FormSection {
  return {
    title: LABELS.SECTION_ACTIONS,
    fields: [],
    collapsible: true,
  };
}

/**
 * Create a complete rule form builder
 */
export function createRuleFormBuilder(): FormBuilder {
  return new FormBuilder()
    .addSection(createBasicRuleSection())
    .addSection(createMetadataSection())
    .addSection(createConditionsSection())
    .addSection(createActionsSection());
}
