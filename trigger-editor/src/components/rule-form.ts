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
import { COMPARISON_OPERATORS } from '../types.js';

@customElement('rule-form')
export class RuleForm extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      --primary-color: #2563eb;
      --primary-hover: #1d4ed8;
      --danger-color: #dc2626;
      --success-color: #16a34a;
      --background: #ffffff;
      --surface: #f8fafc;
      --border: #e2e8f0;
      --text: #1e293b;
      --text-secondary: #64748b;
      --radius: 6px;
    }

    :host([darkmode]) {
      --background: #1e293b;
      --surface: #334155;
      --border: #475569;
      --text: #f1f5f9;
      --text-secondary: #94a3b8;
    }

    .form-section {
      margin-bottom: 20px;
    }

    .form-section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
    }

    .form-input, .form-select, .form-textarea {
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 14px;
      background: var(--background);
      color: var(--text);
    }

    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .form-textarea {
      resize: vertical;
      min-height: 60px;
    }

    .form-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-checkbox input {
      width: 16px;
      height: 16px;
    }

    .condition-list, .action-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .condition-item, .action-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      padding: 10px;
      background: var(--surface);
      border-radius: var(--radius);
      flex-wrap: wrap;
    }

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

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border: none;
      border-radius: var(--radius);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-sm {
      padding: 4px 8px;
      font-size: 12px;
    }

    .btn-secondary {
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--border);
    }

    .icon-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: var(--radius);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }

    .icon-btn:hover {
      background: var(--surface);
      color: var(--text);
    }

    .validation-error {
      color: var(--danger-color);
      font-size: 12px;
      margin-top: 4px;
    }

    .tags-input {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 6px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      min-height: 40px;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: var(--primary-color);
      color: white;
      border-radius: 3px;
      font-size: 12px;
    }

    .tag-remove {
      cursor: pointer;
      opacity: 0.7;
    }

    .tag-remove:hover {
      opacity: 1;
    }

    .tag-input {
      border: none;
      outline: none;
      flex: 1;
      min-width: 80px;
      font-size: 14px;
      background: transparent;
      color: var(--text);
    }

    .preview-section {
      margin-top: 16px;
      padding: 12px;
      background: #1e1e1e;
      border-radius: var(--radius);
      overflow-x: auto;
    }

    .preview-code {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      color: #d4d4d4;
      white-space: pre;
      margin: 0;
    }
  `;

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
    this.dispatchEvent(new CustomEvent('form-change', {
      detail: this.formData,
      bubbles: true,
      composed: true
    }));
  }

  private _emitSave(): void {
    this.dispatchEvent(new CustomEvent('form-save', {
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

  // --- Render ---

  override render() {
    return html`
      ${this._renderBasicSection()}
      ${this._renderConditionsSection()}
      ${this._renderActionsSection()}

      ${when(this.showYamlPreview, () => html`
        <div class="preview-section">
          <pre class="preview-code">${this._yamlContent}</pre>
        </div>
      `)}
    `;
  }

  private _renderBasicSection() {
    return html`
      <div class="form-section">
        <div class="form-section-title">Basic Information</div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Rule ID *</label>
            <input 
              type="text" 
              class="form-input"
              .value=${this.formData.id}
              @input=${(e: Event) => this._handleFieldChange('id', (e.target as HTMLInputElement).value)}
            />
            ${when(this._getFieldError('id'), (err: string) => html`<div class="validation-error">${err}</div>`)}
          </div>
          
          <div class="form-group">
            <label class="form-label">Name</label>
            <input 
              type="text" 
              class="form-input"
              .value=${this.formData.name}
              @input=${(e: Event) => this._handleFieldChange('name', (e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
        
        <div class="form-group" style="margin-bottom: 12px">
          <label class="form-label">Description</label>
          <textarea 
            class="form-textarea"
            .value=${this.formData.description}
            @input=${(e: Event) => this._handleFieldChange('description', (e.target as HTMLTextAreaElement).value)}
          ></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Event Trigger (on) *</label>
            <input 
              type="text" 
              class="form-input"
              placeholder="e.g., user.login, payment.received"
              .value=${this.formData.on}
              @input=${(e: Event) => this._handleFieldChange('on', (e.target as HTMLInputElement).value)}
            />
            ${when(this._getFieldError('on'), (err: string) => html`<div class="validation-error">${err}</div>`)}
          </div>
          
          <div class="form-group">
            <label class="form-label">Priority</label>
            <input 
              type="number" 
              class="form-input"
              .value=${String(this.formData.priority)}
              @input=${(e: Event) => this._handleFieldChange('priority', parseInt((e.target as HTMLInputElement).value) || 0)}
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cooldown (ms)</label>
            <input 
              type="number" 
              class="form-input"
              .value=${String(this.formData.cooldown)}
              @input=${(e: Event) => this._handleFieldChange('cooldown', parseInt((e.target as HTMLInputElement).value) || 0)}
            />
          </div>
          
          <div class="form-group">
            <label class="form-checkbox">
              <input 
                type="checkbox"
                .checked=${this.formData.enabled}
                @change=${(e: Event) => this._handleFieldChange('enabled', (e.target as HTMLInputElement).checked)}
              />
              <span>Enabled</span>
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Tags</label>
          <div class="tags-input">
            ${this.formData.tags.map(tag => html`
              <span class="tag">
                ${tag}
                <span class="tag-remove" @click=${() => this._removeTag(tag)}>×</span>
              </span>
            `)}
            <input 
              type="text" 
              class="tag-input"
              placeholder="Add tag..."
              @keydown=${this._handleTagInput}
            />
          </div>
        </div>
      </div>
    `;
  }

  private _renderConditionsSection() {
    const conditions = this._getConditionsList();

    return html`
      <div class="form-section">
        <div class="form-section-title">
          Conditions
          <button class="btn btn-sm btn-secondary" @click=${this._addCondition}>+ Add</button>
        </div>
        
        <div class="condition-list">
          ${conditions.map((cond, i) => html`
            <div class="condition-item">
              <input 
                type="text" 
                class="form-input"
                placeholder="Field (e.g., data.amount)"
                .value=${cond.field}
                @input=${(e: Event) => this._updateCondition(i, 'field', (e.target as HTMLInputElement).value)}
              />
              
              <select 
                class="form-select"
                .value=${cond.operator}
                @change=${(e: Event) => this._updateCondition(i, 'operator', (e.target as HTMLSelectElement).value)}
              >
                ${COMPARISON_OPERATORS.map(op => html`
                  <option value=${op.value}>${op.label}</option>
                `)}
              </select>
              
              <input 
                type="text" 
                class="form-input condition-value"
                placeholder="Value"
                .value=${String(cond.value ?? '')}
                @input=${(e: Event) => this._updateCondition(i, 'value', (e.target as HTMLInputElement).value)}
              />
              
              <button class="icon-btn" @click=${() => this._removeCondition(i)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private _renderActionsSection() {
    const actions = this._getActionsList();
    const actionTypes = this.availableActions.split(',').map(s => s.trim());

    return html`
      <div class="form-section">
        <div class="form-section-title">
          Actions
          <button class="btn btn-sm btn-secondary" @click=${this._addAction}>+ Add</button>
        </div>
        
        ${when(this._getFieldError('do'), (err: string) => html`<div class="validation-error">${err}</div>`)}
        
        <div class="action-list">
          ${actions.map((action, i) => html`
            <div class="action-item">
              <select 
                class="form-select"
                .value=${action.type ?? ''}
                @change=${(e: Event) => this._updateAction(i, 'type', (e.target as HTMLSelectElement).value)}
              >
                <option value="">Select action type...</option>
                ${actionTypes.map((type: string) => html`
                  <option value=${type}>${type}</option>
                `)}
              </select>
              
              <input 
                type="text" 
                class="form-input"
                placeholder="Params (JSON)"
                .value=${action.params ? JSON.stringify(action.params) : ''}
                @input=${(e: Event) => {
                  try {
                    const params = JSON.parse((e.target as HTMLInputElement).value);
                    this._updateAction(i, 'params', params);
                  } catch {}
                }}
              />
              
              <input 
                type="number" 
                class="form-input"
                style="max-width: 80px"
                placeholder="Delay"
                .value=${String(action.delay ?? '')}
                @input=${(e: Event) => this._updateAction(i, 'delay', parseInt((e.target as HTMLInputElement).value) || undefined)}
              />
              
              <input 
                type="number" 
                class="form-input"
                style="max-width: 80px"
                placeholder="%"
                min="0"
                max="100"
                .value=${String(action.probability ?? '')}
                @input=${(e: Event) => this._updateAction(i, 'probability', parseInt((e.target as HTMLInputElement).value) || undefined)}
              />
              
              <button class="icon-btn" @click=${() => this._removeAction(i)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          `)}
          
          ${when(actions.length === 0, () => html`
            <div style="color: var(--text-secondary); font-size: 14px; padding: 12px;">
              No actions defined. Add at least one action.
            </div>
          `)}
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
