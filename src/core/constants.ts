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

export const TriggerSystem = {
    Actions,
    Events,
    RuleEvents,
    ControlFlow
};

export default TriggerSystem;
