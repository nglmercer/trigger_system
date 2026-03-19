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

// Node predicates from node-filters (centralized)
export { defaultIsCondNode, defaultIsActNode } from './node-filters';

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
  type ActionResolverContext,
  type ActionResolverOptions,
  type ActionTransformer,
  type CollectedActions,
  type DoBranches
} from './action-resolver';

// Shared base type - export from condition resolver only
export type { GraphResolverContextBase } from './condition-resolver';
