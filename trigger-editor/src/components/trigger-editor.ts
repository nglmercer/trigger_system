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

// Import constants for magic strings
import {
  COLORS,
  SIZES,
  TYPOGRAPHY,
  ANIMATION,
  LABELS,
  CLASS_NAMES,
  EVENTS,
  VALIDATION_MESSAGES,
} from '../constants.js';

// Import enums
import { ValidationSeverity } from '../enums.js';

// Import styles
import {
  baseComponentStyles,
  buttonStyles,
  iconButtonStyles,
  toolbarStyles,
  editorStyles,
  combineStyles,
} from '../styles.js';

// Import icons
import { iconPlus, iconFile, iconCopy, iconDownload, iconCheck, iconX, iconEye, iconEyeOff } from '../icons.js';

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
  // Combine all styles using the styles utility
  static override styles = combineStyles(
    baseComponentStyles,
    buttonStyles,
    iconButtonStyles,
    toolbarStyles,
    editorStyles,
    css`
      .btn {
        transition: all 0.15s ease;
      }

      .preview-section {
        margin-top: 16px;
        padding: 12px;
        background: #1e1e1e;
        border-radius: 6px;
        overflow-x: auto;
      }

      .preview-code {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
        color: #d4d4d4;
        white-space: pre;
        margin: 0;
      }

      .copied-toast {
        position: fixed;
        bottom: 16px;
        right: 16px;
        background: #16a34a;
        color: #ffffff;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 2000;
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `
  );

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

  @state()
  private _showCopiedToast = false;

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
    this.dispatchEvent(new CustomEvent(EVENTS.RULE_ADDED, { 
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
    this.dispatchEvent(new CustomEvent(EVENTS.RULE_UPDATED, { 
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
    this.dispatchEvent(new CustomEvent(EVENTS.RULE_DELETED, { 
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
    this.dispatchEvent(new CustomEvent(EVENTS.RULES_EXPORTED, { 
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
    this.dispatchEvent(new CustomEvent(EVENTS.RULES_EXPORTED, { 
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
      this.dispatchEvent(new CustomEvent(EVENTS.VALIDATION_ERROR, { 
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
      errors.push({ 
        field: 'id', 
        message: VALIDATION_MESSAGES.RULE_ID_REQUIRED, 
        severity: ValidationSeverity.ERROR 
      });
    }

    if (!rule.on?.trim()) {
      errors.push({ 
        field: 'on', 
        message: VALIDATION_MESSAGES.EVENT_REQUIRED, 
        severity: ValidationSeverity.ERROR 
      });
    }

    if (!rule.do) {
      errors.push({ 
        field: 'do', 
        message: VALIDATION_MESSAGES.ACTION_REQUIRED, 
        severity: ValidationSeverity.ERROR 
      });
    }

    // Check for duplicate IDs
    const duplicates = this._rules.filter(r => r.id === rule.id && r !== rule);
    if (duplicates.length > 0) {
      errors.push({ 
        field: 'id', 
        message: VALIDATION_MESSAGES.DUPLICATE_ID, 
        severity: ValidationSeverity.ERROR 
      });
    }

    // Custom validation
    if (this.config?.validateRule) {
      errors.push(...this.config.validateRule(rule));
    }

    return errors;
  }

  private _dispatchChange(): void {
    this.dispatchEvent(new CustomEvent(EVENTS.RULES_CHANGED, { 
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
      const message = e instanceof Error ? e.message : VALIDATION_MESSAGES.INVALID_CONFIG;
      errors = [{ field: 'do', message, severity: ValidationSeverity.ERROR }];
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

  private _toggleYamlPreview(): void {
    this._showYamlPreview = !this._showYamlPreview;
  }

  private async _copyYaml(): Promise<void> {
    const yaml = this.exportYaml();
    try {
      await navigator.clipboard.writeText(yaml);
      this._showCopiedToast = true;
      setTimeout(() => {
        this._showCopiedToast = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  private _handleRuleEdit(e: CustomEvent<TriggerRule>): void {
    this.openEditRuleModal(e.detail);
  }

  private _handleRuleDelete(e: CustomEvent<TriggerRule>): void {
    this.deleteRule(e.detail.id);
  }

  private _getYamlPreview(): string {
    try {
      return RuleExporter.toCleanYaml(this._rules);
    } catch {
      return '';
    }
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
      
      ${when(this._showYamlPreview, () => this._renderYamlPreview())}
      ${when(this._showModal, () => this._renderModal())}
      ${when(this._showCopiedToast, () => html`
        <div class="copied-toast">
          ${iconCheck('sm')} Copied to clipboard!
        </div>
      `)}
    `;
  }

  private _renderToolbar() {
    return html`
      <div class="toolbar" part="toolbar">
        <span class="toolbar-title">${LABELS.SECTION_BASIC} (${this._rules.length})</span>
        
        <button class="btn btn-primary" @click=${this.openNewRuleModal}>
          ${iconPlus('md')} ${LABELS.NEW_RULE}
        </button>
        
        <button class="btn btn-secondary" @click=${this._toggleYamlPreview}>
          ${this._showYamlPreview ? iconEyeOff('md') : iconEye('md')} 
          ${this._showYamlPreview ? LABELS.HIDE : LABELS.PREVIEW} YAML
        </button>
        
        <button class="btn btn-secondary" @click=${this._copyYaml}>
          ${iconCopy('md')} ${LABELS.COPY}
        </button>
        
        <button class="btn btn-secondary" @click=${this._downloadYaml}>
          ${iconDownload('md')} Download
        </button>
      </div>
    `;
  }

  private _renderYamlPreview() {
    const yaml = this._getYamlPreview();
    return html`
      <div class="preview-section">
        <pre class="preview-code">${yaml}</pre>
      </div>
    `;
  }

  private _renderModal() {
    return html`
      <editor-modal
        .open=${true}
        .modalTitle=${this._editingRule ? LABELS.EDIT_RULE_TITLE : LABELS.NEW_RULE_TITLE}
        .confirmText=${LABELS.SAVE}
        .isEdit=${!!this._editingRule}
        @modal-close=${this.closeModal}
        @modal-confirm=${this._handleSave}
      >
        <rule-form
          .formData=${this._formData}
          .validationErrors=${this._validationErrors}
          .showYamlPreview=${this._showYamlPreview}
          .availableActions=${this.config?.availableActions}
          .availableEvents=${this.config?.availableEvents}
          @form-change=${this._handleFormChange}
        ></rule-form>
      </editor-modal>
    `;
  }

  private _downloadYaml(): void {
    const yaml = this.exportYaml();
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trigger-rules.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'trigger-editor': TriggerEditor;
  }
}
