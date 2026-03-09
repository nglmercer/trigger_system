import { describe, it, expect } from 'bun:test';
import { RuleEngine } from '../../src/core/rule-engine-new';
import { ActionRegistry } from '../../src/core/action-registry';

describe('Conditional action bug', () => {
    it('reproduces the error with conditional action', async () => {
        const registry = ActionRegistry.getInstance();
        registry.register('log', async (action, context) => {
            console.log("LOG ACTION EXECUTED:", action.params?.message);
            return { printed: true };
        });

        const engine = new RuleEngine({
            rules: [
                {
                    id: 'ChatMessageEvent-id',
                    on: 'ChatMessageEvent',
                    do: {
                        mode: 'SEQUENCE',
                        actions: [
                            {
                                type: 'log',
                                params: { message: 'Setting last message: ${data.content}' }
                            },
                            {
                                if: [
                                    {
                                        field: 'data.content',
                                        operator: 'NOT_CONTAINS',
                                        value: ['!ia', '!ai']
                                    }
                                ],
                                then: {
                                    type: 'log',
                                    params: { message: 'then' }
                                },
                                else: {
                                    type: 'log',
                                    params: { message: 'else' }
                                }
                            }
                        ]
                    }
                }
            ],
            globalSettings: {
                evaluateAll: true,
                debugMode: true,
                strictActions: true
            }
        });

        const results = await engine.processEventSimple('ChatMessageEvent', { content: 'holaaaaaaaaaa' });
        console.log("RESULTS", JSON.stringify(results, null, 2));
    });
});
