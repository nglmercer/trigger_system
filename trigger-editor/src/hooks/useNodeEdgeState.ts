import { useMemo } from 'react';
import { useRFStore } from '../store/rfStore';

/**
 * Hook for managing nodes and edges state by wrapping the Zustand store.
 * Maintains compatibility with existing App.tsx logic while improving performance.
 */
export function useNodeEdgeState() {
  const nodes = useRFStore((s) => s.nodes);
  const edges = useRFStore((s) => s.edges);
  const onNodesChange = useRFStore((s) => s.onNodesChange);
  const onEdgesChange = useRFStore((s) => s.onEdgesChange);
  const onConnect = useRFStore((s) => s.onConnect);
  const onReconnect = useRFStore((s) => s.onReconnect);
  const setNodes = useRFStore((s) => s.setNodes);
  const setEdges = useRFStore((s) => s.setEdges);
  const onNodeDataChange = useRFStore((s) => s.updateNodeData);
  const onDuplicateNode = useRFStore((s) => s.duplicateNode);
  const addNodes = useRFStore((s) => s.addNodes);
  const clearAll = useRFStore((s) => s.clearAll);
  const setGraph = useRFStore((s) => s.setGraph);

  // We add onChange and onDuplicate to node data for backward compatibility with 
  // nodes that haven't been migrated to use the store directly yet.
  // Note: We use useMemo to avoid re-calculating this on every minor change.
  // However, for best performance, nodes should use useRFStore((s) => s.updateNodeData) directly.
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => {
      // Small optimization: only update if missing or changed.
      // Now using the properly typed _id field from AppNodeData.
      if (node.data._id === node.id && typeof node.data.onDuplicate === 'function' && typeof node.data.onChange === 'function') {
         return node;
      }
      return {
        ...node,
        data: {
          ...node.data,
          _id: node.id,
          onChange: (val: unknown, f: string) => onNodeDataChange(node.id, val, f),
          onDuplicate: () => onDuplicateNode(node.id),
        },
      };
    });
  }, [nodes, onNodeDataChange, onDuplicateNode]);

  return {
    nodes: nodesWithCallbacks,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onNodeDataChange,
    onConnect,
    onReconnect,
    onDuplicateNode,
    addNodes,
    clearAll,
    setGraph,
  };
}
