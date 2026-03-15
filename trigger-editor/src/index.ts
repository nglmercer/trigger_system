/**
 * Trigger Editor
 * A browser-based visual editor for Trigger System rules
 * 
 * @packageDocumentation
 */

// Re-export types (includes COMPARISON_OPERATORS, EXECUTION_MODES)
export * from './types.js';

// Re-export builder utilities
export * from './builder.js';

// Re-export exporter utilities
export * from './exporter.js';

// Re-export constants (avoid magic strings)
export * from './constants.js';

// Re-export enums (type-safe values) - need to alias to avoid conflict with types
export {
  ComparisonOperatorEnum,
  type OperatorOption,
  OPERATORS,
  ExecutionModeEnum,
  type ExecutionModeOption,
  EXECUTION_MODES as EXECUTION_MODE_OPTIONS,
  ActionTypeEnum,
  type ActionTypeOption,
  ACTION_TYPES,
  ValidationSeverity,
  ExportFormat,
  EditorMode,
  Theme,
  FieldType,
  ItemState,
  OperatorCategory,
  OPERATOR_CATEGORIES,
  getOperatorByValue,
  getActionTypeByValue,
  getExecutionModeByValue,
  operatorRequiresValue,
  getOperatorsByCategory,
} from './enums.js';

// Re-export styles (CSS utilities)
export * from './styles.js';

// Re-export icons
export * from './icons.js';

// Re-export form builder
export * from './form-builder.js';

// Re-export components
export * from './components/index.js';
