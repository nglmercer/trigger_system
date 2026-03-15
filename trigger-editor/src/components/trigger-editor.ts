/**
 * Trigger Editor - Main Component
 * A browser-based visual editor for Trigger System rules
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';

import type {
  TriggerRule,
  EditorConfig,
  EditorValidationError,
  RuleFormData,
  Action
} from '../types.js';

import { RuleBuilder } from '../builder.js';
import { RuleExporter } from '../exporter.js';

// Import sub-components
import './rule-list.js';
import './rule-form.js';
import './editor-modal.js';

import type { RuleList } from './rule-list.js';
import type { RuleForm } from './rule-form.js';

/**
 * Trigger Editor Web Component
 * 
 * A visual editor for creating and managing Trigger System rules.
 * Uses modular sub-components for better maintainability.
 * 
 * @fires rule-added - When a new rule is added
 * @fires rule-updated - When a rule is updated
 * @fires rule-deleted - When a rule is deleted
 * @fires rules-exported - When rules are exported
 * @fires rules-changed - When rules collection changes
 * @fires validation-error - When validation fails
 * 
 * @csspart editor - Main editor container
 * @csspart toolbar - Toolbar section
 * @csspart rule-list - List of rules
 * @csspart modal - Modal container
 */
@customElement('trigger-editor')
export class TriggerEditor extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      --primary-color: #2563eb;
      --primary-hover: #1d4ed8;
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

    .editor {
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .toolbar {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      align-items: center;
      flex-wrap: wrap;
    }

    .toolbar-title {
      font-weight: 600;
      color: var(--text);
      margin-right: auto;
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
      transition: all 0.15s ease;
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-hover);
    }

    .btn-secondary {
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--border);
    }
  `;

  // --- Properties ---

  @property({ type: Object })
  config?: EditorConfig;

  @property({ type: Boolean, reflect: true })
  darkmode = false;

  // --- State ---

  @state()
  private _rules: TriggerRule[] = [];

  @state()
  private _showModal = false;

  @state()
  private _editingRule: TriggerRule | null = null;

  @state()
  private _formData: RuleFormData = this._createEmptyFormData();

  @state()
  private _validationErrors: EditorValidationError[] = [];

  @state()
  private _showYamlPreview = false;

  // --- Query ---

  @query('rule-list')
  private _ruleList!: RuleList;

  @query('rule-form')
  private _ruleForm!: RuleForm;

  // --- Lifecycle ---

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadInitialRules();
  }

  // --- Public Methods ---

  /**
   * Get all rules
   */
  getRules(): TriggerRule[] {
    return [...this._rules];
  }

  /**
   * Set rules programmatically
   */
  setRules(rules: TriggerRule[]): void {
    this._rules = [...rules];
    this._dispatchChange();
  }

  /**
   * Add a new rule
   */
  addRule(rule: TriggerRule): void {
    this._rules = [...this._rules, rule];
    this.dispatchEvent(new CustomEvent('rule-added', { 
      detail: rule,
      bubbles: true,
      composed: true
    }));
    this._dispatchChange();
  }

  /**
   * Update an existing rule
   */
  updateRule(oldId: string, newRule: TriggerRule): void {
    const oldRule = this._rules.find(r => r.id === oldId);
    if (!oldRule) return;

    this._rules = this._rules.map(r => r.id === oldId ? newRule : r);
    this.dispatchEvent(new CustomEvent('rule-updated', { 
      detail: { old: oldRule, new: newRule },
      bubbles: true,
      composed: true
    }));
    this._dispatchChange();
  }

  /**
   * Delete a rule by ID
   */
  deleteRule(id: string): void {
    const rule = this._rules.find(r => r.id === id);
    if (!rule) return;

    this._rules = this._rules.filter(r => r.id !== id);
    this.dispatchEvent(new CustomEvent('rule-deleted', { 
      detail: rule,
      bubbles: true,
      composed: true
    }));
    this._dispatchChange();
  }

  /**
   * Open the editor modal to create a new rule
   */
  openNewRuleModal(): void {
    this._editingRule = null;
    this._formData = this._createEmptyFormData();
    this._validationErrors = [];
    this._showModal = true;
  }

  /**
   * Open the editor modal to edit an existing rule
   */
  openEditRuleModal(rule: TriggerRule): void {
    this._editingRule = rule;
    this._formData = this._ruleToFormData(rule);
    this._validationErrors = [];
    this._showModal = true;
  }

  /**
   * Close the modal
   */
  closeModal(): void {
    this._showModal = false;
    this._editingRule = null;
  }

  /**
   * Export rules as YAML
   */
  exportYaml(): string {
    const yaml = RuleExporter.toCleanYaml(this._rules);
    this.dispatchEvent(new CustomEvent('rules-exported', { 
      detail: { rules: this._rules, format: 'yaml' },
      bubbles: true,
      composed: true
    }));
    return yaml;
  }

  /**
   * Export rules as JSON
   */
  exportJson(): string {
    const json = RuleExporter.toCleanJson(this._rules);
    this.dispatchEvent(new CustomEvent('rules-exported', { 
      detail: { rules: this._rules, format: 'json' },
      bubbles: true,
      composed: true
    }));
    return json;
  }

  /**
   * Validate all rules
   */
  validateRules(): EditorValidationError[] {
    const allErrors: EditorValidationError[] = [];
    for (const rule of this._rules) {
      const errors = this._validateRule(rule);
      allErrors.push(...errors);
    }
    if (allErrors.length > 0) {
      this.dispatchEvent(new CustomEvent('validation-error', { 
        detail: allErrors,
        bubbles: true,
        composed: true
      }));
    }
    return allErrors;
  }

  // --- Private Methods ---

  private _createEmptyFormData(): RuleFormData {
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

  private _loadInitialRules(): void {
    if (this.config?.initialRules) {
      this._rules = [...this.config.initialRules];
    }
    this.darkmode = this.config?.darkMode ?? false;
    this._showYamlPreview = this.config?.showYamlPreview ?? false;
  }

  private _ruleToFormData(rule: TriggerRule): RuleFormData {
    return {
      id: rule.id,
      name: rule.name || '',
      description: rule.description || '',
      priority: rule.priority || 0,
      enabled: rule.enabled ?? true,
      cooldown: rule.cooldown || 0,
      tags: rule.tags || [],
      on: rule.on || '',
      if: rule.if,
      do: Array.isArray(rule.do) ? rule.do : [rule.do].filter(Boolean)
    };
  }

  private _validateRule(rule: TriggerRule): EditorValidationError[] {
    const errors: EditorValidationError[] = [];

    if (!rule.id?.trim()) {
      errors.push({ field: 'id', message: 'Rule ID is required', severity: 'error' });
    }

    if (!rule.on?.trim()) {
      errors.push({ field: 'on', message: 'Event trigger is required', severity: 'error' });
    }

    if (!rule.do) {
      errors.push({ field: 'do', message: 'At least one action is required', severity: 'error' });
    }

    // Check for duplicate IDs
    const duplicates = this._rules.filter(r => r.id === rule.id && r !== rule);
    if (duplicates.length > 0) {
      errors.push({ field: 'id', message: 'Rule ID already exists', severity: 'error' });
    }

    // Custom validation
    if (this.config?.validateRule) {
      errors.push(...this.config.validateRule(rule));
    }

    return errors;
  }

  private _dispatchChange(): void {
    this.dispatchEvent(new CustomEvent('rules-changed', { 
      detail: this._rules,
      bubbles: true,
      composed: true
    }));
    this.config?.onChange?.(this._rules);
  }

  private _handleFormChange(e: CustomEvent<RuleFormData>): void {
    this._formData = e.detail;
  }

  private _handleSave(): void {
    let rule: TriggerRule | undefined;
    let errors: EditorValidationError[] = [];
    
    try {
      rule = this._formDataToRule();
      errors = this._validateRule(rule);
    } catch (e) {
      // Catch builder validation errors (like "Rule 'do' action is required")
      const message = e instanceof Error ? e.message : 'Invalid rule configuration';
      errors = [{ field: 'do', message, severity: 'error' }];
    }
    
    this._validationErrors = errors;

    if (errors.length > 0 || !rule) {
      return;
    }

    if (this._editingRule) {
      this.updateRule(this._editingRule.id, rule);
    } else {
      this.addRule(rule);
    }

    this.closeModal();
  }

  private _formDataToRule(): TriggerRule {
    const data = this._formData;
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
    if (data.if) {
      if (Array.isArray(data.if)) {
        for (const cond of data.if) {
          if ('field' in cond) {
            builder.if(cond.field, cond.operator, cond.value);
          }
        }
      } else if ('field' in data.if) {
        builder.if(data.if.field, data.if.operator, data.if.value);
      }
    }

    // Add actions - filter out invalid actions (empty type)
    const actions = data.do;
    const validActions: Action[] = [];
    if (Array.isArray(actions)) {
      for (const action of actions) {
        if (action && 'type' in action && typeof action.type === 'string' && action.type.trim() !== '') {
          validActions.push(action);
          builder.do(action.type, action.params as any, { 
            delay: action.delay, 
            probability: action.probability 
          });
        }
      }
    }

    // If no valid actions, the builder.build() will throw "Rule 'do' action is required"
    // which will be caught by the try-catch in _handleSave
    return builder.build();
  }

  // --- Render ---

  override render() {
    return html`
      <div class="editor" part="editor">
        ${this._renderToolbar()}
        <rule-list
          part="rule-list"
          .rules=${this._rules}
          ?darkmode=${this.darkmode}
          @rule-edit=${this._handleRuleEdit}
          @rule-delete=${this._handleRuleDelete}
        ></rule-list>
      </div>
      
      ${when(this._showModal, () => this._renderModal())}
    `;
  }

  private _renderToolbar() {
    return html`
      <div class="toolbar" part="toolbar">
        <span class="toolbar-title">Trigger Rules (${this._rules.length})</span>
        
        <button class="btn btn-primary" @click=${this.openNewRuleModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Rule
        </button>
        
        <button class="btn btn-secondary" @click=${this._toggleYamlPreview}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          ${this._showYamlPreview ? 'Hide' : 'Preview'} YAML
        </button>
        
        <button class="btn btn-secondary" @click=${this._copyYaml}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy YAML
        </button>
      </div>
    `;
  }

  private _renderModal() {
    return html`
      <editor-modal
        part="modal"
        .open=${true}
        .isEdit=${!!this._editingRule}
        ?darkmode=${this.darkmode}
        @modal-close=${this.closeModal}
        @modal-confirm=${this._handleSave}
      >
        <rule-form
          part="form"
          .formData=${this._formData}
          .validationErrors=${this._validationErrors}
          .showYamlPreview=${this._showYamlPreview}
          .availableActions=${this.config?.availableActions ?? 'log,http,notify,transform,delay,set_state'}
          .availableEvents=${this.config?.availableEvents ?? ''}
          @form-change=${this._handleFormChange}
        ></rule-form>
      </editor-modal>
    `;
  }

  // --- Event Handlers ---

  private _handleRuleEdit(e: CustomEvent<TriggerRule>): void {
    this.openEditRuleModal(e.detail);
  }

  private _handleRuleDelete(e: CustomEvent<TriggerRule>): void {
    this.deleteRule(e.detail.id);
  }

  private _toggleYamlPreview(): void {
    this._showYamlPreview = !this._showYamlPreview;
  }

  private _copyYaml(): void {
    const yaml = this.exportYaml();
    navigator.clipboard.writeText(yaml);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'trigger-editor': TriggerEditor;
  }
}
