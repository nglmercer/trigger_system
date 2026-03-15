/**
 * Rule Form Component
 * Modal form for creating and editing trigger rules
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { when } from 'lit/directives/when.js';

import type {
  TriggerRule,
  RuleFormData,
  EditorValidationError,
  Condition,
  Action
} from '../types.js';

import { RuleBuilder } from '../builder.js';
import { RuleExporter } from '../exporter.js';

// Import constants
import {
  LABELS,
  CLASS_NAMES,
  EVENTS,
  SIZES,
  COLORS,
  TYPOGRAPHY,
} from '../constants.js';

// Import enums
import { 
  OPERATORS, 
  ACTION_TYPES,
  ValidationSeverity 
} from '../enums.js';

// Import styles
import {
  baseComponentStyles,
  buttonStyles,
  iconButtonStyles,
  formInputStyles,
  formLabelStyles,
  formSectionStyles,
  conditionListStyles,
  tagsInputStyles,
  validationErrorStyles,
  previewStyles,
  combineStyles,
} from '../styles.js';

// Import icons
import { iconPlus, iconX } from '../icons.js';

@customElement('rule-form')
export class RuleForm extends LitElement {
  // Combine styles
  static override styles = combineStyles(
    baseComponentStyles,
    buttonStyles,
    iconButtonStyles,
    formInputStyles,
    formLabelStyles,
    formSectionStyles,
    conditionListStyles,
    tagsInputStyles,
    validationErrorStyles,
    previewStyles,
    css`
      .condition-item .form-input,
      .condition-item .form-select,
      .action-item .form-input,
      .action-item .form-select {
        flex: 1;
        min-width: 100px;
      }

      .condition-value {
        flex: 2;
        min-width: 150px;
      }
    `
  );

  @property({ type: Boolean, reflect: true })
  darkmode = false;

  @property({ type: Object })
  formData: RuleFormData = this._createEmpty();

  @property({ type: Array })
  validationErrors: EditorValidationError[] = [];

  @property({ type: Boolean })
  showYamlPreview = false;

  @property({ type: String })
  availableActions = 'log,http,notify,transform,delay,set_state';

  @property({ type: String })
  availableEvents = '';

  @state()
  private _yamlContent = '';

  @state()
  public commonsFields: string[] = ['data'];
  // --- Computed Properties ---

  private get _availableEventsList(): string[] {
    if (!this.availableEvents) return [];
    return this.availableEvents.split(',').map(e => e.trim()).filter(e => e);
  }

  // Common fields for condition dropdown
  public get _commonFields(): string[] {
    return this.commonsFields;
  }
  public set _commonFields(value: string[]) {
    this.commonsFields = value;
  }
  // --- Lifecycle ---

  override willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('formData')) {
      this._updateYamlPreview();
    }
  }

  // --- Private Methods ---

  private _createEmpty(): RuleFormData {
    return {
      id: '',
      name: '',
      description: '',
      priority: 0,
      enabled: true,
      cooldown: 0,
      tags: [],
      on: '',
      if: undefined,
      do: []
    };
  }

  private _updateYamlPreview(): void {
    try {
      const rule = this._buildRule();
      this._yamlContent = RuleExporter.toCleanYaml(rule);
    } catch {
      this._yamlContent = '';
    }
  }

  private _buildRule(): TriggerRule {
    const data = this.formData;
    const builder = new RuleBuilder()
      .withId(data.id)
      .withName(data.name)
      .withDescription(data.description)
      .withPriority(data.priority)
      .withEnabled(data.enabled)
      .withCooldown(data.cooldown)
      .withTags(data.tags)
      .on(data.on);

    // Add conditions
    const conditions = this._getConditionsList();
    for (const cond of conditions) {
      builder.if(cond.field, cond.operator, cond.value);
    }

    // Add actions
    const actions = this._getActionsList();
    for (const action of actions) {
      if (action && 'type' in action && action.type) {
        builder.do(action.type, action.params as any, {
          delay: action.delay,
          probability: action.probability
        });
      }
    }

    return builder.build();
  }

  private _getConditionsList(): Condition[] {
    const ifData = this.formData.if;
    if (!ifData) return [];
    if (Array.isArray(ifData)) {
      return ifData.filter((c): c is Condition => 'field' in c);
    }
    if ('field' in ifData) {
      return [ifData];
    }
    return [];
  }

  private _getActionsList(): Action[] {
    const doData = this.formData.do;
    if (!doData || !Array.isArray(doData)) return [];
    
    // Filter out invalid actions (empty type)
    return doData.filter((a): a is Action => {
      return a !== null && 
             a !== undefined && 
             typeof a === 'object' && 
             'type' in a && 
             typeof a.type === 'string' && 
             a.type !== '';
    });
  }

  private _emitChange(): void {
    this.dispatchEvent(new CustomEvent(EVENTS.FORM_CHANGE, {
      detail: this.formData,
      bubbles: true,
      composed: true
    }));
  }

  private _emitSave(): void {
    this.dispatchEvent(new CustomEvent(EVENTS.FORM_SAVE, {
      detail: this.formData,
      bubbles: true,
      composed: true
    }));
  }

  // --- Event Handlers ---

  private _handleFieldChange(field: keyof RuleFormData, value: any): void {
    this.formData = { ...this.formData, [field]: value };
    this._emitChange();
  }

  private _addCondition(): void {
    const currentIf = this.formData.if;
    const newCondition: Condition = { field: '', operator: 'EQ' };
    
    if (!currentIf) {
      this.formData = { ...this.formData, if: newCondition };
    } else if (Array.isArray(currentIf)) {
      this.formData = { ...this.formData, if: [...currentIf, newCondition] };
    } else {
      this.formData = { ...this.formData, if: [currentIf, newCondition] };
    }
    this._emitChange();
  }

  private _removeCondition(index: number): void {
    const currentIf = this.formData.if;
    if (!currentIf) return;

    if (Array.isArray(currentIf)) {
      const newIf = [...currentIf];
      newIf.splice(index, 1);
      this.formData = {
        ...this.formData,
        if: newIf.length === 0 ? undefined : newIf
      };
    } else {
      this.formData = { ...this.formData, if: undefined };
    }
    this._emitChange();
  }

  private _updateCondition(index: number, field: keyof Condition, value: any): void {
    const currentIf = this.formData.if;
    if (!currentIf) return;

    if (Array.isArray(currentIf)) {
      const newIf = [...currentIf];
      const cond = newIf[index];
      if (cond && 'field' in cond) {
        newIf[index] = { ...(cond as Condition), [field]: value };
      }
      this.formData = { ...this.formData, if: newIf };
    }
    this._emitChange();
  }

  private _addAction(): void {
    const currentDo = this.formData.do;
    const newAction: Action = { type: '', params: {} };
    
    if (!currentDo || currentDo.length === 0) {
      this.formData = { ...this.formData, do: [newAction] };
    } else if (Array.isArray(currentDo)) {
      this.formData = { ...this.formData, do: [...currentDo, newAction] };
    } else {
      this.formData = { ...this.formData, do: [currentDo, newAction] };
    }
    this._emitChange();
  }

  private _removeAction(index: number): void {
    const currentDo = this.formData.do;
    if (!currentDo || !Array.isArray(currentDo)) return;

    const newDo = [...currentDo];
    newDo.splice(index, 1);
    this.formData = {
      ...this.formData,
      do: newDo.length === 0 ? [] : newDo
    };
    this._emitChange();
  }

  private _updateAction(index: number, field: keyof Action, value: any): void {
    const currentDo = this.formData.do;
    if (!currentDo || !Array.isArray(currentDo)) return;

    const newDo = [...currentDo];
    if (newDo[index] && 'type' in newDo[index]) {
      newDo[index] = { ...(newDo[index] as Action), [field]: value };
    }
    this.formData = { ...this.formData, do: newDo };
    this._emitChange();
  }

  private _handleTagInput(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      const tag = input.value.trim();
      if (tag && !this.formData.tags.includes(tag)) {
        this.formData = {
          ...this.formData,
          tags: [...this.formData.tags, tag]
        };
        input.value = '';
        this._emitChange();
      }
    }
  }

  private _removeTag(tag: string): void {
    this.formData = {
      ...this.formData,
      tags: this.formData.tags.filter(t => t !== tag)
    };
    this._emitChange();
  }

  private _getFieldError(field: string): string | undefined {
    return this.validationErrors.find(e => e.field === field)?.message;
  }

  // Render action params based on action type
  private _renderActionParams(action: Action, index: number): unknown {
    const type = action.type;
    const params = action.params || {};
    
    const updateParam = (key: string, value: any) => {
      this._updateAction(index, 'params', { ...params, [key]: value });
    };

    switch (type) {
      case 'log':
        return html`
          <input
            type="text"
            class="form-input"
            style="flex: 2"
            .value=${params.message || ''}
            @input=${(e: Event) => updateParam('message', (e.target as HTMLInputElement).value)}
            placeholder="Log message"
          />
        `;
      
      case 'http':
        return html`
          <div style="display: flex; gap: 8px; flex: 2;">
            <select
              class="form-select"
              style="width: 100px"
              .value=${params.method || 'GET'}
              @change=${(e: Event) => updateParam('method', (e.target as HTMLSelectElement).value)}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
            <input
              type="text"
              class="form-input"
              style="flex: 1"
              .value=${params.url || ''}
              @input=${(e: Event) => updateParam('url', (e.target as HTMLInputElement).value)}
              placeholder="URL"
            />
          </div>
        `;
      
      case 'notify':
        return html`
          <div style="display: flex; gap: 8px; flex: 2;">
            <select
              class="form-select"
              style="width: 100px"
              .value=${params.channel || 'email'}
              @change=${(e: Event) => updateParam('channel', (e.target as HTMLSelectElement).value)}
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="push">Push</option>
              <option value="webhook">Webhook</option>
            </select>
            <input
              type="text"
              class="form-input"
              style="flex: 1"
              .value=${params.message || ''}
              @input=${(e: Event) => updateParam('message', (e.target as HTMLInputElement).value)}
              placeholder="Message"
            />
          </div>
        `;
      
      case 'delay':
        return html`
          <input
            type="number"
            class="form-input"
            style="flex: 2"
            .value=${String(params.ms || 1000)}
            @input=${(e: Event) => updateParam('ms', parseInt((e.target as HTMLInputElement).value) || 0)}
            placeholder="Milliseconds"
          />
        `;
      
      case 'set_state':
        return html`
          <div style="display: flex; gap: 8px; flex: 2;">
            <input
              type="text"
              class="form-input"
              style="flex: 1"
              .value=${params.key || ''}
              @input=${(e: Event) => updateParam('key', (e.target as HTMLInputElement).value)}
              placeholder="Key"
            />
            <input
              type="text"
              class="form-input"
              style="flex: 1"
              .value=${params.value || ''}
              @input=${(e: Event) => updateParam('value', (e.target as HTMLInputElement).value)}
              placeholder="Value"
            />
          </div>
        `;
      
      case 'transform':
        return html`
          <input
            type="text"
            class="form-input"
            style="flex: 2"
            .value=${params.expression || ''}
            @input=${(e: Event) => updateParam('expression', (e.target as HTMLInputElement).value)}
            placeholder="Transform expression"
          />
        `;
      
      case 'broadcast':
      case 'emit':
        return html`
          <input
            type="text"
            class="form-input"
            style="flex: 2"
            .value=${params.event || ''}
            @input=${(e: Event) => updateParam('event', (e.target as HTMLInputElement).value)}
            placeholder="Event name"
          />
        `;
      
      case 'script':
        return html`
          <textarea
            class="form-textarea"
            style="flex: 2"
            .value=${params.code || ''}
            @input=${(e: Event) => updateParam('code', (e.target as HTMLTextAreaElement).value)}
            placeholder="// JavaScript code"
            rows="2"
          ></textarea>
        `;
      
      default:
        return html`
          <textarea
            class="form-textarea"
            style="flex: 2"
            .value=${JSON.stringify(params, null, 2)}
            @input=${(e: Event) => {
              try {
                const value = JSON.parse((e.target as HTMLTextAreaElement).value);
                this._updateAction(index, 'params', value);
              } catch {}
            }}
            placeholder='{"key": "value"}'
            rows="2"
          ></textarea>
        `;
    }
  }

  // --- Render ---

  override render() {
    return html`
      ${this._renderBasicSection()}
      ${this._renderConditionsSection()}
      ${this._renderActionsSection()}
      ${when(this.showYamlPreview, () => this._renderPreview())}
    `;
  }

  private _renderBasicSection() {
    const idError = this._getFieldError('id');
    const onError = this._getFieldError('on');
    const doError = this._getFieldError('do');

    return html`
      <div class="form-section">
        <div class="form-section-title">${LABELS.SECTION_BASIC}</div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${LABELS.LABEL_ID} *</label>
            <input
              type="text"
              class="form-input"
              .value=${this.formData.id}
              @input=${(e: Event) => this._handleFieldChange('id', (e.target as HTMLInputElement).value)}
              placeholder=${LABELS.PLACEHOLDER_ID}
            />
            ${when(idError, () => html`<div class="validation-error">${idError}</div>`)}
          </div>
          
          <div class="form-group">
            <label class="form-label">${LABELS.LABEL_NAME}</label>
            <input
              type="text"
              class="form-input"
              .value=${this.formData.name}
              @input=${(e: Event) => this._handleFieldChange('name', (e.target as HTMLInputElement).value)}
              placeholder=${LABELS.PLACEHOLDER_NAME}
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${LABELS.LABEL_EVENT} *</label>
            ${when(this._availableEventsList.length > 0, () => html`
              <select
                class="form-select"
                .value=${this.formData.on}
                @change=${(e: Event) => this._handleFieldChange('on', (e.target as HTMLSelectElement).value)}
              >
                <option value="">Select event...</option>
                ${map(this._availableEventsList, (event) => html`
                  <option value=${event}>${event}</option>
                `)}
              </select>
            `, () => html`
              <input
                type="text"
                class="form-input"
                .value=${this.formData.on}
                @input=${(e: Event) => this._handleFieldChange('on', (e.target as HTMLInputElement).value)}
                placeholder="e.g., user.login"
              />
            `)}
            ${when(onError, () => html`<div class="validation-error">${onError}</div>`)}
          </div>

          <div class="form-group">
            <label class="form-label">${LABELS.LABEL_DESCRIPTION}</label>
            <textarea
              class="form-textarea"
              .value=${this.formData.description}
              @input=${(e: Event) => this._handleFieldChange('description', (e.target as HTMLTextAreaElement).value)}
              placeholder=${LABELS.PLACEHOLDER_DESCRIPTION}
              rows="2"
            ></textarea>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${LABELS.LABEL_PRIORITY}</label>
            <input
              type="number"
              class="form-input"
              .value=${String(this.formData.priority)}
              @input=${(e: Event) => this._handleFieldChange('priority', parseInt((e.target as HTMLInputElement).value) || 0)}
            />
          </div>

          <div class="form-group">
            <label class="form-label">${LABELS.LABEL_COOLDOWN}</label>
            <input
              type="number"
              class="form-input"
              .value=${String(this.formData.cooldown)}
              @input=${(e: Event) => this._handleFieldChange('cooldown', parseInt((e.target as HTMLInputElement).value) || 0)}
            />
          </div>

          <div class="form-group">
            <div class="form-checkbox">
              <input
                type="checkbox"
                id="enabled"
                .checked=${this.formData.enabled}
                @change=${(e: Event) => this._handleFieldChange('enabled', (e.target as HTMLInputElement).checked)}
              />
              <label for="enabled">${LABELS.LABEL_ENABLED}</label>
            </div>
          </div>
        </div>
      </div>

      ${when(doError, () => html`<div class="validation-error" style="margin-bottom: 16px;">${doError}</div>`)}
    `;
  }

  private _renderConditionsSection() {
    const conditions = this._getConditionsList();

    return html`
      <div class="form-section">
        <div class="form-section-title">
          ${LABELS.SECTION_CONDITIONS}
          <button class="btn btn-sm btn-secondary" @click=${this._addCondition}>
            ${iconPlus('sm')} ${LABELS.ADD_CONDITION}
          </button>
        </div>

        ${when(conditions.length > 0, () => html`
          <div class="condition-list">
            ${map(conditions, (condition, index) => html`
              <div class="condition-item">
                <select
                  class="form-select"
                  .value=${condition.field}
                  @change=${(e: Event) => this._updateCondition(index, 'field', (e.target as HTMLSelectElement).value)}
                >
                  <option value="">Select field...</option>
                  ${map(this._commonFields, (field) => html`
                    <option value=${field}>${field}</option>
                  `)}
                </select>
                <select
                  class="form-select"
                  .value=${condition.operator || 'EQ'}
                  @change=${(e: Event) => this._updateCondition(index, 'operator', (e.target as HTMLSelectElement).value)}
                >
                  ${map(OPERATORS, (op) => html`
                    <option value=${op.value}>${op.label}</option>
                  `)}
                </select>
                <input
                  type="text"
                  class="form-input condition-value"
                  .value=${condition.value ?? ''}
                  @input=${(e: Event) => this._updateCondition(index, 'value', (e.target as HTMLInputElement).value)}
                  placeholder="Value"
                />
                <button class="icon-btn" @click=${() => this._removeCondition(index)}>
                  ${iconX('sm', 'danger')}
                </button>
              </div>
            `)}
          </div>
        `)}
      </div>
    `;
  }

  private _renderActionsSection() {
    const actions = this._getActionsList();

    return html`
      <div class="form-section">
        <div class="form-section-title">
          ${LABELS.SECTION_ACTIONS}
          <button class="btn btn-sm btn-secondary" @click=${this._addAction}>
            ${iconPlus('sm')} ${LABELS.ADD_ACTION}
          </button>
        </div>

        ${when(actions.length > 0, () => html`
          <div class="action-list">
            ${map(actions, (action, index) => html`
              <div class="action-item">
                <select
                  class="form-select"
                  .value=${action.type || ''}
                  @change=${(e: Event) => this._updateAction(index, 'type', (e.target as HTMLSelectElement).value)}
                >
                  <option value="">Select action...</option>
                  ${map(ACTION_TYPES, (act) => html`
                    <option value=${act.value}>${act.label}</option>
                  `)}
                </select>
                ${this._renderActionParams(action, index)}
                <input
                  type="number"
                  class="form-input"
                  style="width: 80px"
                  .value=${String(action.delay || 0)}
                  @input=${(e: Event) => this._updateAction(index, 'delay', parseInt((e.target as HTMLInputElement).value) || 0)}
                  placeholder="Delay"
                  title="Delay (ms)"
                />
                <button class="icon-btn" @click=${() => this._removeAction(index)}>
                  ${iconX('sm', 'danger')}
                </button>
              </div>
            `)}
          </div>
        `)}
      </div>
    `;
  }

  private _renderTagsSection() {
    return html`
      <div class="form-section">
        <div class="form-section-title">${LABELS.SECTION_TAGS}</div>
        
        <div class="tags-input">
          ${map(this.formData.tags, (tag) => html`
            <span class="tag">
              ${tag}
              <span class="tag-remove" @click=${() => this._removeTag(tag)}>×</span>
            </span>
          `)}
          <input
            type="text"
            class="tag-input"
            @keydown=${this._handleTagInput}
            placeholder=${LABELS.PLACEHOLDER_TAG_INPUT}
          />
        </div>
      </div>
    `;
  }

  private _renderPreview() {
    return html`
      <div class="form-section">
        <div class="form-section-title">${LABELS.SECTION_PREVIEW}</div>
        <div class="preview-section">
          <pre class="preview-code">${this._yamlContent}</pre>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rule-form': RuleForm;
  }
}
