/**
 * Trigger Editor Constants
 * Centralized constants to avoid magic strings throughout the codebase
 */

// ======================
// CSS Custom Properties
// ======================

export const CSS_VARS = {
  // Colors
  PRIMARY_COLOR: '--primary-color',
  PRIMARY_HOVER: '--primary-hover',
  DANGER_COLOR: '--danger-color',
  SUCCESS_COLOR: '--success-color',
  WARNING_COLOR: '--warning-color',
  
  // Backgrounds & Surfaces
  BACKGROUND: '--background',
  SURFACE: '--surface',
  BORDER: '--border',
  
  // Text
  TEXT: '--text',
  TEXT_SECONDARY: '--text-secondary',
  
  // Dimensions
  RADIUS: '--radius',
  RADIUS_SM: '--radius-sm',
  RADIUS_LG: '--radius-lg',
} as const;

// ======================
// Color Values
// ======================

export const COLORS = {
  // Primary
  PRIMARY: '#2563eb',
  PRIMARY_HOVER: '#1d4ed8',
  PRIMARY_LIGHT: '#3b82f6',
  
  // Danger
  DANGER: '#dc2626',
  DANGER_LIGHT: '#ef4444',
  
  // Success
  SUCCESS: '#16a34a',
  SUCCESS_LIGHT: '#22c55e',
  
  // Warning
  WARNING: '#d97706',
  WARNING_LIGHT: '#f59e0b',
  
  // Neutral
  WHITE: '#ffffff',
  BLACK: '#000000',
  
  // Light theme
  TEXT_LIGHT: '#1e293b',
  TEXT_SECONDARY_LIGHT: '#64748b',
  BORDER_LIGHT: '#e2e8f0',
  SURFACE_LIGHT: '#f8fafc',
  BACKGROUND_LIGHT: '#ffffff',
  
  // Dark theme
  TEXT_DARK: '#f1f5f9',
  TEXT_SECONDARY_DARK: '#94a3b8',
  BORDER_DARK: '#475569',
  SURFACE_DARK: '#334155',
  BACKGROUND_DARK: '#1e293b',
  
  // Code/Preview
  CODE_BG: '#1e1e1e',
  CODE_TEXT: '#d4d4d4',
  
  // Overlay
  OVERLAY_BG: 'rgba(0, 0, 0, 0.5)',
} as const;

// ======================
// Size Values
// ======================

export const SIZES = {
  // Spacing
  SPACING_XS: '4px',
  SPACING_SM: '8px',
  SPACING_MD: '12px',
  SPACING_LG: '16px',
  SPACING_XL: '20px',
  SPACING_2XL: '24px',
  
  // Border Radius
  RADIUS_SM: '3px',
  RADIUS: '6px',
  RADIUS_LG: '8px',
  RADIUS_XL: '12px',
  RADIUS_FULL: '9999px',
  
  // Font Sizes
  FONT_SIZE_XS: '11px',
  FONT_SIZE_SM: '12px',
  FONT_SIZE: '14px',
  FONT_SIZE_LG: '16px',
  FONT_SIZE_XL: '18px',
  
  // Icon Sizes
  ICON_SM: '14px',
  ICON: '16px',
  ICON_LG: '20px',
  ICON_XL: '24px',
  
  // Component Sizes
  BUTTON_HEIGHT_SM: '28px',
  BUTTON_HEIGHT: '36px',
  INPUT_HEIGHT: '36px',
  
  // Modal
  MODAL_MAX_WIDTH: '700px',
  MODAL_MAX_HEIGHT: '90vh',
  
  // List
  LIST_MAX_HEIGHT: '400px',
} as const;

// ======================
// Default Action Types
// ======================

export const DEFAULT_ACTIONS = [
  'log',
  'http',
  'notify',
  'transform',
  'delay',
  'set_state',
] as const;

// ======================
// Default Validation Messages
// ======================

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  RULE_ID_REQUIRED: 'Rule ID is required',
  EVENT_REQUIRED: 'Event trigger is required',
  ACTION_REQUIRED: 'At least one action is required',
  DUPLICATE_ID: 'Rule ID already exists',
  INVALID_CONFIG: 'Invalid rule configuration',
} as const;

// ======================
// Button Text Labels
// ======================

export const LABELS = {
  // Buttons
  SAVE: 'Save',
  CANCEL: 'Cancel',
  DELETE: 'Delete',
  EDIT: 'Edit',
  ADD: 'Add',
  CLOSE: 'Close',
  COPY: 'Copy',
  PREVIEW: 'Preview',
  HIDE: 'Hide',
  
  // Actions
  NEW_RULE: 'New Rule',
  ADD_CONDITION: 'Add Condition',
  ADD_ACTION: 'Add Action',
  REMOVE_CONDITION: 'Remove',
  REMOVE_ACTION: 'Remove',
  
  // Modal Titles
  NEW_RULE_TITLE: 'New Rule',
  EDIT_RULE_TITLE: 'Edit Rule',
  
  // Tooltips
  TOOLTIP_EDIT: 'Edit',
  TOOLTIP_DELETE: 'Delete',
  TOOLTIP_COPY: 'Copy to clipboard',
  
  // Empty States
  NO_RULES: 'No rules defined yet',
  
  // Sections
  SECTION_BASIC: 'Basic Info',
  SECTION_CONDITIONS: 'Conditions',
  SECTION_ACTIONS: 'Actions',
  SECTION_PREVIEW: 'Preview',
  SECTION_TAGS: 'Tags',
  
  // Form Labels
  LABEL_ID: 'Rule ID',
  LABEL_NAME: 'Name',
  LABEL_DESCRIPTION: 'Description',
  LABEL_PRIORITY: 'Priority',
  LABEL_ENABLED: 'Enabled',
  LABEL_COOLDOWN: 'Cooldown (ms)',
  LABEL_TAGS: 'Tags',
  LABEL_EVENT: 'On Event',
  LABEL_CONDITION_FIELD: 'Field',
  LABEL_CONDITION_OPERATOR: 'Operator',
  LABEL_CONDITION_VALUE: 'Value',
  LABEL_ACTION_TYPE: 'Action Type',
  LABEL_ACTION_PARAMS: 'Parameters',
  LABEL_ACTION_DELAY: 'Delay (ms)',
  LABEL_ACTION_PROBABILITY: 'Probability',
  
  // Placeholders
  PLACEHOLDER_ID: 'e.g., my-rule-id',
  PLACEHOLDER_NAME: 'e.g., Log User Login',
  PLACEHOLDER_DESCRIPTION: 'Describe what this rule does...',
  PLACEHOLDER_TAG_INPUT: 'Type and press Enter',
  PLACEHOLDER_VALUE: 'Enter value',
  PLACEHOLDER_PARAMS: '{"key": "value"}',
} as const;

// ======================
// CSS Class Names
// ======================

export const CLASS_NAMES = {
  // Layout
  EDITOR: 'editor',
  TOOLBAR: 'toolbar',
  MODAL_OVERLAY: 'modal-overlay',
  MODAL: 'modal',
  MODAL_HEADER: 'modal-header',
  MODAL_TITLE: 'modal-title',
  MODAL_BODY: 'modal-body',
  MODAL_FOOTER: 'modal-footer',
  
  // Form Sections
  FORM_SECTION: 'form-section',
  FORM_SECTION_TITLE: 'form-section-title',
  FORM_ROW: 'form-row',
  FORM_GROUP: 'form-group',
  FORM_LABEL: 'form-label',
  FORM_INPUT: 'form-input',
  FORM_SELECT: 'form-select',
  FORM_TEXTAREA: 'form-textarea',
  FORM_CHECKBOX: 'form-checkbox',
  
  // Lists
  CONDITION_LIST: 'condition-list',
  ACTION_LIST: 'action-list',
  CONDITION_ITEM: 'condition-item',
  ACTION_ITEM: 'action-item',
  RULE_LIST: 'rule-list',
  RULE_ITEM: 'rule-item',
  
  // Rule Item
  RULE_INFO: 'rule-info',
  RULE_ID: 'rule-id',
  RULE_META: 'rule-meta',
  RULE_EVENT: 'rule-event',
  RULE_ENABLED: 'rule-enabled',
  RULE_DISABLED: 'rule-disabled',
  RULE_ACTIONS: 'rule-actions',
  
  // Buttons
  BTN: 'btn',
  BTN_PRIMARY: 'btn-primary',
  BTN_SECONDARY: 'btn-secondary',
  BTN_SM: 'btn-sm',
  BTN_DANGER: 'btn-danger',
  ICON_BTN: 'icon-btn',
  
  // Tags
  TAGS_INPUT: 'tags-input',
  TAG: 'tag',
  TAG_REMOVE: 'tag-remove',
  TAG_INPUT: 'tag-input',
  
  // Utilities
  VALIDATION_ERROR: 'validation-error',
  EMPTY_STATE: 'empty-state',
  PREVIEW_SECTION: 'preview-section',
  PREVIEW_CODE: 'preview-code',
  
  // Title
  TOOLBAR_TITLE: 'toolbar-title',
  
  // Condition Value
  CONDITION_VALUE: 'condition-value',
} as const;

// ======================
// Event Names
// ======================

export const EVENTS = {
  // Modal Events
  MODAL_CLOSE: 'modal-close',
  MODAL_CONFIRM: 'modal-confirm',
  
  // Form Events
  FORM_CHANGE: 'form-change',
  FORM_SAVE: 'form-save',
  
  // Rule Events
  RULE_EDIT: 'rule-edit',
  RULE_DELETE: 'rule-delete',
  
  // Editor Events
  RULE_ADDED: 'rule-added',
  RULE_UPDATED: 'rule-updated',
  RULE_DELETED: 'rule-deleted',
  RULES_EXPORTED: 'rules-exported',
  RULES_CHANGED: 'rules-changed',
  VALIDATION_ERROR: 'validation-error',
} as const;

// ======================
// Animation Durations
// ======================

export const ANIMATION = {
  DURATION_FAST: '0.1s',
  DURATION: '0.15s',
  DURATION_SLOW: '0.3s',
  EASE: 'ease',
  EASE_IN_OUT: 'ease-in-out',
} as const;

// ======================
// Z-Index Scale
// ======================

export const Z_INDEX = {
  MODAL: 1000,
  DROPDOWN: 100,
  TOOLTIP: 50,
  STICKY: 10,
} as const;

// ======================
// Typography
// ======================

export const TYPOGRAPHY = {
  FONT_FAMILY: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  FONT_FAMILY_MONO: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
  FONT_WEIGHT_NORMAL: 400,
  FONT_WEIGHT_MEDIUM: 500,
  FONT_WEIGHT_SEMIBOLD: 600,
  FONT_WEIGHT_BOLD: 700,
  LINE_HEIGHT: 1.5,
  LINE_HEIGHT_TIGHT: 1.25,
} as const;

// ======================
// Shadows
// ======================

export const SHADOWS = {
  SM: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  MD: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  LG: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  XL: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;
