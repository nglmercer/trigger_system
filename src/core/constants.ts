import { BuiltInAction } from "./action-registry";
import { EngineEvent, RuleEvent } from "../utils/emitter";

/**
 * Global constants for the Trigger System to avoid magic strings.
 */
export const Actions = BuiltInAction;
export const Events = EngineEvent;
export const RuleEvents = RuleEvent;

/**
 * Control flow property names
 */
export const ControlFlow = {
    IF: "if",
    THEN: "then",
    ELSE: "else",
    BREAK: "break",
    CONTINUE: "continue",
    MODE: "mode",
    ACTIONS: "actions",
    RUN: "run",
    DELAY: "delay",
    PROBABILITY: "probability",
    PARAMS: "params",
    TYPE: "type",
    ON: "on",
} as const;

export const ErrorMessages = {
    UNKNOWN_ACTION: "Unknown or generic action type",
    MISSING_ACTION_TYPE: "Action has no type and no control flow properties",
    PROBABILITY_FAILED: "probability check failed",
    BUN_REQUIRED: "Bun is required for 'execute' action",
    MISSING_KEY: "Missing key for state operation",
} as const;

export const TriggerSystem = {
    Actions,
    Events,
    RuleEvents,
    ControlFlow,
    ErrorMessages
};

export default TriggerSystem;
