/**
 * Graph Utilities Index
 * Re-exports all graph-related utilities for easy importing
 */

// Node Filters
export { 
  NodeFilter, 
  createNodeFilterConfig,
  defaultIsEventNode,
  defaultIsDoNode,
  isConditionGroup,
  isActionGroup,
  getDoBranchType,
  isElseBranch,
  isDoBranch,
  extractEventData,
  type NodePredicate,
  type NodeFilterConfig
} from './node-filters';

// Re-export predicates from both modules
export { defaultIsCondNode } from './condition-resolver';
export { defaultIsActNode } from './action-resolver';

// Traversal
export * from './traversal';

// Converters
export * from './converters';

// Condition Resolver
export { 
  ConditionResolver,
  collectConditionsForGroup,
  resolveCondition,
  findTerminalConditions,
  type ConditionResolverContext,
  type ConditionResolverOptions,
  type ConditionTransformer,
  type CollectedConditions,
  type TerminalActions
} from './condition-resolver';

// Action Resolver
export { 
  ActionResolver,
  collectActionsForGroup,
  resolveAction,
  categorizeDoNodesByBranch,
  getDoBranchType as getActionDoBranchType,
  type ActionResolverContext,
  type ActionResolverOptions,
  type ActionTransformer,
  type CollectedActions,
  type DoBranches
} from './action-resolver';

// Shared base type - export from condition resolver only
export type { GraphResolverContextBase } from './condition-resolver';
