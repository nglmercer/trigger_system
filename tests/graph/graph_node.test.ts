import { describe, it, expect } from 'bun:test';
import { RuleBuilder } from '../../src/sdk/builder';
import { RuleExporter } from '../../src/sdk/exporter';
import type { SDKGraphNode, SDKGraphEdge } from '../../src/types';

const SDKGraphNodes: SDKGraphNode[] = [
  {
    "id": "ChatMessageEvent-id-",
    "type": "event",
    "data": {
      "id": "ChatMessageEvent-id",
      "name": "Imported Rule",
      "description": "",
      "event": "ChatMessageEvent",
      "priority": 0,
      "enabled": true,
      "_id": "ChatMessageEvent-id-"
    }
  },
  {
    "id": "ChatMessageEvent-id-node_0",
    "type": "condition_group",
    "data": {
      "operator": "AND",
      "_id": "ChatMessageEvent-id-node_0"
    }
  },
  {
    "id": "ChatMessageEvent-id-node_1",
    "type": "condition",
    "data": {
      "field": "${vars.clean(data.content)}",
      "operator": "NOT_CONTAINS",
      "value": [
        "emote"
      ],
      "_id": "ChatMessageEvent-id-node_1"
    }
  },
  {
    "id": "ChatMessageEvent-id-node_2",
    "type": "condition",
    "data": {
      "field": "${vars.clean(data.content)}",
      "operator": "NEQ",
      "value": "${vars.clean(vars.last())}",
      "_id": "ChatMessageEvent-id-node_2"
    }
  },
  {
    "id": "ChatMessageEvent-id-node_3",
    "type": "condition",
    "data": {
      "field": "${vars.clean(data.content).length}",
      "operator": "GT",
      "value": 3,
      "_id": "ChatMessageEvent-id-node_3"
    }
  },
  {
    "id": "ChatMessageEvent-id-node_4",
    "type": "action_group",
    "data": {
      "mode": "SEQUENCE",
      "_id": "ChatMessageEvent-id-node_4"
    }
  },
  {
    "id": "ChatMessageEvent-id-node_5",
    "type": "condition",
    "data": {
      "field": "data.content",
      "operator": "NOT_CONTAINS",
      "value": [
        "!ia",
        "!ai",
        "IA",
        "AI"
      ],
      "_id": "ChatMessageEvent-id-node_5"
    }
  },
  {
    "id": "ChatMessageEvent-id-node_6",
    "type": "do",
    "data": {
      "branchType": "do",
      "_id": "ChatMessageEvent-id-node_6"
    }
  },
  {
    "id": "ChatMessageEvent-id-node_7",
    "type": "action",
    "data": {
      "type": "TTS",
      "params": { "message": "${data.content}" },
      "_id": "ChatMessageEvent-id-node_7"
    }
  },
  {
    "id": "ChatMessageEvent-id-node_8",
    "type": "do",
    "data": {
      "branchType": "else",
      "_id": "ChatMessageEvent-id-node_8"
    }
  },
  {
    "id": "ChatMessageEvent-id-node_9",
    "type": "action",
    "data": {
      "type": "ai_respond",
      "params": { "prompt": "${data.content}", "user": "${data.sender.username}" },
      "_id": "ChatMessageEvent-id-node_9"
    }
  }
];

const SDKGraphEdges: SDKGraphEdge[] = [
  {
    "source": "ChatMessageEvent-id-",
    "target": "ChatMessageEvent-id-node_0",
    "sourceHandle": "event-output",
    "targetHandle": "input"
  },
  {
    "source": "ChatMessageEvent-id-node_0",
    "target": "ChatMessageEvent-id-node_1",
    "sourceHandle": "cond-output",
    "targetHandle": "condition-input"
  },
  {
    "source": "ChatMessageEvent-id-node_1",
    "target": "ChatMessageEvent-id-node_2",
    "sourceHandle": "output",
    "targetHandle": "condition-input"
  },
  {
    "source": "ChatMessageEvent-id-node_2",
    "target": "ChatMessageEvent-id-node_3",
    "sourceHandle": "output",
    "targetHandle": "condition-input"
  },
  {
    "source": "ChatMessageEvent-id-node_3",
    "target": "ChatMessageEvent-id-node_4",
    "sourceHandle": "output",
    "targetHandle": "input"
  },
  {
    "source": "ChatMessageEvent-id-node_4",
    "target": "ChatMessageEvent-id-node_5",
    "sourceHandle": "condition-output",
    "targetHandle": "condition-input"
  },
  {
    "source": "ChatMessageEvent-id-node_5",
    "target": "ChatMessageEvent-id-node_6",
    "sourceHandle": "output",
    "targetHandle": "do-input"
  },
  {
    "source": "ChatMessageEvent-id-node_6",
    "target": "ChatMessageEvent-id-node_7",
    "sourceHandle": "do-output",
    "targetHandle": "action-input"
  },
  {
    "source": "ChatMessageEvent-id-node_5",
    "target": "ChatMessageEvent-id-node_8",
    "sourceHandle": "output",
    "targetHandle": "do-input"
  },
  {
    "source": "ChatMessageEvent-id-node_8",
    "target": "ChatMessageEvent-id-node_9",
    "sourceHandle": "do-output",
    "targetHandle": "action-input"
  }
];

describe('Replicate issue - Rule do action is required', () => {
  it('should build the rule without errors', () => {
    try {
      const builder = RuleBuilder.fromGraph(SDKGraphNodes, SDKGraphEdges);
      const rule = builder.build();
      
      console.log('Yaml Output:');
      console.log(RuleExporter.toCleanYaml(rule));
      
      expect(rule).toBeDefined();
      expect(rule.id).toBe('ChatMessageEvent-id');
      expect(rule.on).toBe('ChatMessageEvent');
      expect(rule.do).toBeDefined();
    } catch (e: any) {
      console.error('Build Error:', e.message);
      throw e;
    }
  });
});
