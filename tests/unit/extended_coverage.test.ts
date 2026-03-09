import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test';
import { StateManager } from '../../src/core/state-manager';
import { TriggerEngine } from '../../src/core/trigger-engine';
import { RuleEngine as LegacyRuleEngine } from '../../src/core/rule-engine';
import { RuleEngine as NewRuleEngine } from '../../src/core/rule-engine-new';
import type { PersistenceAdapter } from '../../src/core/persistence';
import { triggerEmitter, EngineEvent, ruleEvents } from '../../src/utils/emitter';
import type { TriggerContext } from '../../src/types';

describe('Extended Coverage - StateManager', () => {
    let stateManager: StateManager;

    beforeEach(() => {
        stateManager = StateManager.getInstance();
        // Reset state for each test if possible
        (stateManager as any).state = {};
    });

    it('should allow setting a custom persistence adapter', () => {
        const mockPersistence: PersistenceAdapter = {
            saveState: vi.fn(),
            loadState: vi.fn().mockResolvedValue({}),
            deleteState: vi.fn(),
            clearState: vi.fn()
        };
        stateManager.setPersistence(mockPersistence);
        expect((stateManager as any).persistence).toBe(mockPersistence);
    });

    it('should initialize state from Map and Object', async () => {
        const mockMap = new Map([['a', 1]]);
        const mockPersistence: PersistenceAdapter = {
            saveState: vi.fn(),
            loadState: vi.fn().mockResolvedValueOnce(mockMap).mockResolvedValueOnce({ b: 2 }),
            deleteState: vi.fn(),
            clearState: vi.fn()
        };
        stateManager.setPersistence(mockPersistence);
        
        await stateManager.initialize();
        expect(stateManager.get('a')).toBe(1);

        await stateManager.initialize();
        expect(stateManager.get('b')).toBe(2);
    });

    it('should apply config with TTL and setup timers', async () => {
        vi.useFakeTimers();
        const config = {
            state: {
                temp: {
                    value: 'expired',
                    lifecycle: { ttl: '1s' }
                },
                static: 'val'
            }
        };
        await stateManager.applyConfig(config);
        expect(stateManager.get('temp')).toBe('expired');
        expect(stateManager.get('static')).toBe('val');

        vi.advanceTimersByTime(1500);
        expect(stateManager.get('temp')).toBeUndefined();
        vi.useRealTimers();
    });

    it('should handle different TTL units', async () => {
        vi.useFakeTimers();
        const config = {
            state: {
                m: { value: 1, lifecycle: { ttl: '1m' } },
                h: { value: 1, lifecycle: { ttl: '1h' } },
                d: { value: 1, lifecycle: { ttl: '1d' } }
            }
        };
        await stateManager.applyConfig(config);
        
        vi.advanceTimersByTime(60 * 1000 + 100);
        expect(stateManager.get('m')).toBeUndefined();
        
        vi.advanceTimersByTime(3600 * 1000 + 100);
        expect(stateManager.get('h')).toBeUndefined();

        vi.advanceTimersByTime(24 * 3600 * 1000 + 100);
        expect(stateManager.get('d')).toBeUndefined();
        vi.useRealTimers();
    });

    it('should provide a live proxy that persists nested changes', async () => {
        const mockPersistence: PersistenceAdapter = {
            saveState: vi.fn(),
            loadState: vi.fn().mockResolvedValue({}),
            deleteState: vi.fn(),
            clearState: vi.fn()
        };
        stateManager.setPersistence(mockPersistence);
        await stateManager.set('inventory', { items: [] });
        
        const proxy = stateManager.getLiveProxy();
        proxy.inventory.items.push('sword');
        const inventory = stateManager.get('inventory') as { items?: string[] };
        expect(inventory?.items).toContain('sword');
        expect(mockPersistence.saveState).toHaveBeenCalledWith('inventory', expect.anything());
    });

    it('should hit remaining StateManager methods', async () => {
        await stateManager.set('a', 10);
        await stateManager.decrement('a', 2);
        expect(stateManager.get('a')).toBe(8);

        expect(stateManager.getAll()).toEqual({ a: 8 });
        
        const deleted = await stateManager.delete('a');
        expect(deleted).toBe(true);
        expect(stateManager.get('a')).toBeUndefined();
        
        await stateManager.set('b', 2);
        await stateManager.clear();
        expect(stateManager.getAll()).toEqual({});
    });

    it('should hit proxy set handler', async () => {
        const mockPersistence: PersistenceAdapter = {
            saveState: vi.fn(),
            loadState: vi.fn(),
            deleteState: vi.fn(),
            clearState: vi.fn()
        };
        stateManager.setPersistence(mockPersistence);
        const proxy = stateManager.getLiveProxy();
        proxy.test = 123; // Hits set
        expect(stateManager.get('test')).toBe(123);
        expect(mockPersistence.saveState).toHaveBeenCalled();
    });
});

import { EngineUtils } from '../../src/core/engine-utils';

describe('Extended Coverage - TriggerEngine', () => {
    it('should hit base TriggerEngine convenience methods', async () => {
        const engine = new TriggerEngine([]);
        // Hit processEventSimple (base)
        await engine.processEventSimple('e', { x: 1 });
        
        // Hit getStateContext (base)
        const anyEngine = engine as any;
        anyEngine.getStateContext();

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

    it('should handle run block with error in TriggerEngine', async () => {
        const engine = new TriggerEngine([{ id: 'r', on: 'e', do: { run: 'throw new Error("fail")' } }]);
        const results = await engine.processEvent({ event: 'e', data: {}, vars: {}, timestamp: Date.now(), state: {} });
        expect(results[0]!.executedActions[0]!.error).toBe('Error: fail');
    });

    it('should handle shorthand syntax in TriggerEngine', async () => {
        const engine = new TriggerEngine([{ id: 'r', on: 'e', do: { log: 'hello' } as any }]);
        
        // When ActionRegistry is available, it uses the real log handler which returns { message: "hello" }
        const results = await engine.processEvent({ event: 'e', data: {}, vars: {}, timestamp: Date.now(), state: {} });
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

        const results = await engine.processEvent({ event: 'e', data: {}, vars: {}, timestamp: Date.now(), state: {} });
        expect(results[0]!.executedActions[0]!.result).toEqual({ skipped: "probability check failed" });
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
        anyEngine.getStateContext();
        anyEngine.shouldEvaluateAll();
        await anyEngine.executeRuleActions([], { state: {}, data: {}, vars: {} });
        await anyEngine.executeSingleAction({ type: 'log' }, { state: {}, data: {}, vars: {} });
    });
});
