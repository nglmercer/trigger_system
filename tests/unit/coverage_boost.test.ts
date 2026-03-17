import { describe, it, expect, vi } from 'bun:test';
import { ActionRegistry } from '../../src/core/action-registry';
import { TriggerEngine } from '../../src/core/engine';
import { ExpressionEngine } from '../../src/core/expression-engine';
import { StateManager } from '../../src/core/state-manager';
import type { TriggerContext } from '../../src/types';

describe('Coverage Boost - ActionRegistry', () => {
    const registry = ActionRegistry.getInstance();
    const context: TriggerContext = {
        event: 'test',
        data: { name: 'World' },
        vars: { val: 10 },
        timestamp: Date.now(),
        state: {} as any
    };

    it('should handle case-insensitive registry lookups', () => {
        expect(registry.get('LOG')).toBeDefined();
        expect(registry.get('log')).toBeDefined();
        expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('should expose handlers map', () => {
        expect(registry.Handlers instanceof Map).toBe(true);
    });
    it('should expose getDefinition', () => {
        const logDefinition = registry.getDefinition('LOG');
        const allDefinitions = registry.getDefinitions();
        const {params, returns, handler,description} = logDefinition || {};
        //console.log(returns?.toJSON())
        /*
        {
            optional: [
                {
                key: "content",
                value: "string",
                }, {
                key: "message",
                value: "string",
                }
            ],
            domain: "object",
        } 
        {
            required: [
                {
                key: "message",
                value: "string",
                }
            ],
            domain: "object",
        }
        function
        text
        */

        expect(description).toBeString();
        //
        expect(params?.toJSON()).toBeObject();
        expect(returns?.toJSON()).toBeObject();
        expect(handler).toBeInstanceOf(Function);
        expect(allDefinitions.LOG).toBeDefined();
    })

    it('should execute default math action', () => {
        const handler = registry.get('math')!;
        const result = handler({ type: 'math', params: { expression: 'vars.val * 2' } }, context);
        expect(result).toBe(20);
    });

    it('should execute default response action', () => {
        const handler = registry.get('response')!;
        const result = handler({ type: 'response', params: { content: 'Hello ${data.name}', statusCode: 201 } }, context);
        expect(result).toEqual({
            statusCode: 201,
            headers: { "Content-Type": "application/json" },
            body: 'Hello World'
        });
    });

    it('should execute EMIT_EVENT action', () => {
        const handler = registry.get('EMIT_EVENT')!;
        const result = handler({ type: 'EMIT_EVENT', params: { event: 'custom_event', data: { foo: 'bar' } } }, context);
        expect(result).toEqual({
            event: 'custom_event',
            payload: { foo: 'bar' }
        });
    });

    it('should execute STATE_OP action', () => {
        const handler = registry.get('STATE_OP')!;
        context.env = { x: 5 };
        const result = handler({ type: 'STATE_OP', params: { run: 'return env.x + 10' } }, context);
        expect(result).toBe(15);
    });

    it('should execute notify action', () => {
        const handler = registry.get('notify')!;
        const result = handler({ type: 'notify', params: { message: 'hi', target: 'user1' } }, context);
        expect(result).toEqual({ target: 'user1', message: 'hi' });
    });

    it('should execute execute action (mocked)', async () => {
        const handler = registry.get('execute')!;
        // Mocking Bun.spawn is tricky, let's try a simple command if possible or just mock the global Bun
        const originalSpawn = Bun.spawn;
        (Bun as any).spawn = () => ({
            stdout: new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode("output"));
                    controller.close();
                }
            }),
            stderr: new ReadableStream({
                start(controller) {
                    controller.close();
                }
            }),
            exited: Promise.resolve(0)
        });

        const result = await handler({ type: 'execute', params: { command: 'echo hello', safe: true } }, context);
        expect(result.stdout.trim()).toBe('output');
        expect(result.exitCode).toBe(0);
        
        Bun.spawn = originalSpawn;
    });

    it('should execute forward action (mocked)', async () => {
        const handler = registry.get('forward')!;
        const originalFetch = global.fetch;
        //@ts-expect-error
        global.fetch = vi.fn().mockResolvedValue({
            status: 200,
            headers: new Map([['content-type', 'text/plain']]),
            text: () => Promise.resolve('ok')
        } as any);

        const result = await handler({ type: 'forward', params: { url: 'http://example.com' } }, context);
        expect(result.status).toBe(200);
        expect(result.body).toBe('ok');
        
        global.fetch = originalFetch;
    });
});

describe('Coverage Boost - TriggerEngine', () => {
    it('should handle checkCooldown logic', async () => {
        const engine = new TriggerEngine([
            {
                id: 'cool-rule',
                on: 'test',
                cooldown: 1000,
                do: { type: 'log' }
            }
        ]);
        engine.registerAction('log', () => 'ok');

        const context: TriggerContext = { event: 'test', data: {}, vars: {}, timestamp: Date.now(), state: {} as any };
        
        const res1 = await engine.processEvent(context);
        expect(res1.length).toBe(1);

        const res2 = await engine.processEvent(context);
        expect(res2.length).toBe(0); // Cooldown active
    });

    it('should handle nested actions and action groups', async () => {
        const engine = new TriggerEngine([]);
        engine.registerAction('a1', () => 'r1');
        engine.registerAction('a2', () => 'r2');

        const context: TriggerContext = { event: 'test', data: { ok: true }, vars: {}, timestamp: Date.now(), state: {} as any };
        
        // Test executeNestedActions via conditional action
        const rule = {
            id: 'nest',
            on: 'test',
            do: [
                {
                    if: { field: 'data.ok', operator: 'EQ', value: true },
                    then: { type: 'a1' },
                    else: { type: 'a2' }
                }
            ]
        };
        engine.rules = [rule];
        
        const res = await engine.processEvent(context);
        expect(res[0]!.executedActions[0]!.type).toBe('a1');

        // Test ActionGroup
        const groupRule = {
            id: 'group',
            on: 'test',
            do: {
                mode: 'SEQUENCE',
                actions: [{ type: 'a1' }, { type: 'a2' }]
            }
        };
        engine.rules = [groupRule];
        const res2 = await engine.processEvent(context);
        expect(res2[0]!.executedActions.length).toBe(2);
    });

    it('should interpolate deep parameters', async () => {
        const engine = new TriggerEngine([]);
        let capturedParams: any;
        engine.registerAction('deep', (params) => {
            capturedParams = params;
            return 'ok';
        });

        const context: TriggerContext = { 
            event: 'test', 
            data: { user: 'bob' }, 
            vars: { city: 'NY' }, 
            timestamp: Date.now(), 
            state: {} as any 
        };

        const rule = {
            id: 'deep-rule',
            on: 'test',
            do: {
                type: 'deep',
                params: {
                    meta: {
                        info: 'User ${data.user} is in ${vars.city}',
                        list: ['${data.user}', 123]
                    }
                }
            }
        };
        engine.rules = [rule];
        await engine.processEvent(context);

        expect(capturedParams.meta.info).toBe('User bob is in NY');
        expect(capturedParams.meta.list[0]).toBe('bob');
    });
});

describe('Coverage Boost - ExpressionEngine', () => {
    const context: TriggerContext = {
        event: 'test',
        data: { val: 100 },
        vars: { score: 50 },
        timestamp: Date.now(),
        state: {} as any
    };

    it('should handle errors in evaluate', () => {
        // evaluateExpression returns the original expression string on failure
        const result = ExpressionEngine.evaluate('data.val + )(', context);
        expect(result).toBe('data.val + )(');
    });

    it('should handle errors in interpolate', () => {
        // interpolate returns the original match if internal evaluateExpression returns something
        // but wait, interpolate catch block returns 'match' (the whole ${...})
        // but evaluateExpression has its own catch returning 'expression' (the inner part)
        const result = ExpressionEngine.interpolate('Val: ${invalid code here}', context);
        expect(result).toBe('Val: invalid code here');
    });

    it('should handle simple vars access in evaluateExpression', () => {
        context.vars = { foo: 'bar' };
        expect(ExpressionEngine.evaluate('vars.foo', context)).toBe('bar');
    });

    it('should evaluate math expressions', () => {
        expect(ExpressionEngine.evaluateMath('10 + 20 * 2', context)).toBe(50);
        // evaluateMath doesn't support paths like 'vars.score' in its simple replacement regex
        // but it supports top level matches if they are in context root or if they match reserved words
        expect(ExpressionEngine.evaluateMath('Math.max(10, 20)', context)).toBe(20);
        expect(ExpressionEngine.evaluateMath('invalid + math', context)).toBeNaN();
    });

    it('should handle string variables in evaluateMath', () => {
        context.vars = { val: 10 };
        // We can test interpolation in evaluate
        expect(ExpressionEngine.evaluate('${data.val + 5}', context)).toBe(105);
    });
});

describe('Coverage Boost - State Actions', () => {
    const registry = ActionRegistry.getInstance();
    const context: TriggerContext = {
        event: 'test',
        data: {},
        vars: {},
        timestamp: Date.now(),
        state: {} as any
    };

    it('should execute STATE_SET', async () => {
        const handler = registry.get('STATE_SET')!;
        const result = await handler({ type: 'STATE_SET', params: { key: 'user_count', value: 1 } }, context);
        expect(result).toEqual({ key: 'user_count', value: 1 });
        expect(await StateManager.getInstance().get('user_count')).toBe(1);
    });

    it('should execute STATE_INCREMENT', async () => {
        const handler = registry.get('STATE_INCREMENT')!;
        const result = await handler({ type: 'STATE_INCREMENT', params: { key: 'user_count', amount: 5 } }, context);
        expect(result).toEqual({ key: 'user_count', newValue: 6 });
    });

    it('should execute STATE_GET', async () => {
        const handler = registry.get('STATE_GET')!;
        const result = await handler({ type: 'STATE_GET', params: { key: 'user_count', as: 'current_users' } }, context);
        expect(result).toEqual({ key: 'user_count', value: 6, storedAs: 'current_users' });
        expect(context.env?.current_users).toBe(6);
    });

    it('should execute STATE_DELETE', async () => {
        const handler = registry.get('STATE_DELETE')!;
        const result = await handler({ type: 'STATE_DELETE', params: { key: 'user_count' } }, context);
        expect(result).toEqual({ key: 'user_count', deleted: true });
        expect(await StateManager.getInstance().get('user_count')).toBeUndefined();
    });
});
