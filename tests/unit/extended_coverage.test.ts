import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test';
import { TriggerEngine } from '../../src';
import { RuleEngine as LegacyRuleEngine } from '../../src';
import { RuleEngine as NewRuleEngine } from '../../src';
import type { PersistenceAdapter } from '../../src/core/persistence';
import { triggerEmitter, EngineEvent, ruleEvents } from '../../src/utils/emitter';
import { ErrorMessages } from '../../src/core/constants';
import type { TriggerContext } from '../../src/types';
import { EngineUtils } from '../../src/core/engine-utils';

describe('Extended Coverage - TriggerEngine', () => {
    it('should hit base TriggerEngine convenience methods', async () => {
        const engine = new TriggerEngine([]);
        // Hit processEventSimple (base)
        await engine.processEventSimple('e', { x: 1 });
        // Hit interpolateDeep with various types (via Utils)
        EngineUtils.interpolateDeep(['a', '${data.x}'], { data: { x: 'b' } } as any);
        EngineUtils.interpolateDeep({ key: '${vars.y}' }, { vars: { y: 'val' } } as any);
    });
    it('should emit events on updateRules including removed rules', () => {
        const engine = new TriggerEngine([{ id: 'old', on: 'e', do: [] }]);
        const removedListener = vi.fn();
        
        triggerEmitter.on(ruleEvents.RULE_REMOVED as any, removedListener);

        engine.updateRules([{ id: 'new', on: 'e', do: [] }]);

        expect(removedListener).toHaveBeenCalled();
    });

    it('should handle shorthand syntax in TriggerEngine', async () => {
        const engine = new TriggerEngine([{ id: 'r', on: 'e', do: { log: 'hello' } as any }]);
        
        // When ActionRegistry is available, it uses the real log handler which returns { message: "hello" }
        const results = await engine.processEvent({ event: 'e', data: {}, vars: {}, timestamp: Date.now(), });
        expect(results[0]!.executedActions[0]!.type).toBe('log');
        expect(results[0]!.executedActions[0]!.result).toEqual({ message: 'hello' });
    });

    it('should handle probability and delay as strings in TriggerEngine', async () => {
        vi.useFakeTimers();
        const engine = new TriggerEngine([{ 
            id: 'r', 
            on: 'e', 
            do: { 
                type: 'act', 
                //@ts-expect-error
                probability: '0.0', // Never execute
                //@ts-expect-error
                delay: '100'
            } 
        }]);
        engine.registerAction('act', () => 'ok');

        const results = await engine.processEvent({ event: 'e', data: {}, vars: {}, timestamp: Date.now(), });
        expect(results[0]!.executedActions[0]!.result).toEqual({ skipped: ErrorMessages.PROBABILITY_FAILED });
        vi.useRealTimers();
    });
});

describe('Extended Coverage - Legacy & New RuleEngine', () => {
    it('should hit legacy RuleEngine convenience methods', async () => {
        const rules = [{ id: 'leg', on: 'ev', do: [] }];
        const engine = new LegacyRuleEngine({ rules, globalSettings: { evaluateAll: true, debugMode: false } });
        
        const results = await engine.processEvent('ev', { foo: 'bar' });
        expect(results.length).toBe(1);

        engine.updateRules([]);
        expect(engine.getRules().length).toBe(0);
    });

    it('should hit RuleEngineNew overridden methods', async () => {
        const engine = new NewRuleEngine({ rules: [], globalSettings: { evaluateAll: false, debugMode: true } });
        
        // ensure evaluateAll false is respected
        const rules = [
            { id: 'r1', on: 'e', do: [] },
            { id: 'r2', on: 'e', do: [] }
        ];
        engine.rules = rules;
        
        const results = await engine.processEventSimple('e');
        expect(results.length).toBe(1); // Only first rule due to evaluateAll: false

        // Directly hit overridden protected methods for coverage balance
        const anyEngine = engine as any;
        anyEngine.shouldEvaluateAll();
        await anyEngine.executeRuleActions([], {data: {}, vars: {} });
        await anyEngine.executeSingleAction({ type: 'log' }, {data: {}, vars: {} });
    });
});
