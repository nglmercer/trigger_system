import { useCallback } from 'react';
import type { Edge } from '@xyflow/react';
import type { AppNode } from '../types';
import { 
  exportToJson, 
  exportNodesOnly,
  downloadJson, 
  downloadYaml, 
  createImportPicker, 
  createNodesImportPicker,
  sanitizeNodesForImport,
  sanitizeEdgesForImport,
  generateShareUrl,
  getSharedDataFromUrl,
  clearShareDataFromUrl,
} from '../utils/exportImport';
import { createYamlImportPicker, parseYamlContent } from '../utils/yamlImport';
import { useTranslation } from 'react-i18next';
import { EXPORT_CLICKED } from '../components/ExchangeModals';
/**
 * Hook for import/export and sharing functionality
 */
export function useImportExport(
  nodes: AppNode[], 
  edges: Edge[], 
  getYaml: () => string,
  onNodeDataChange: (id: string, value: unknown, field: string) => void,
  setGraph: (nodes: AppNode[], edges: Edge[]) => void,
  success: (message: string, options?: { title?: string }) => void,
  addNodes?: (nodes: AppNode[]) => void
) {
  const { t } = useTranslation();

  // Export to JSON
  const handleExportJson = useCallback(() => {
    if (nodes.length === 0) return;
    const yamlValue = getYaml();
    const json = exportToJson(nodes, edges, yamlValue);
    const filename = `trigger-rule-${Date.now()}.json`;
    downloadJson(json, filename);
  }, [nodes, edges, getYaml]);

  // Export to YAML
  const handleExportYaml = useCallback(() => {
    const yamlValue = getYaml();
    if (!yamlValue) return;
    const filename = `trigger-rule-${Date.now()}.yaml`;
    downloadYaml(yamlValue, filename);
  }, [getYaml]);

  // Export selected nodes only
  const handleExportSelected = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;

    const json = exportNodesOnly(selectedNodes);
    const filename = `trigger-components-${Date.now()}.json`;
    downloadJson(json, filename);
  }, [nodes]);

  // Import from JSON
  const handleImport = useCallback(async () => {
    const data = await createImportPicker();
    if (!data) return;
    
    // Sanitize nodes to ensure they have proper onChange handlers
    const sanitizedNodes = sanitizeNodesForImport(data.nodes, onNodeDataChange);
    
    // Sanitize edges to ensure they have correct handles
    const sanitizedEdges = sanitizeEdgesForImport(data.edges || [], sanitizedNodes);
    
    setGraph(sanitizedNodes, sanitizedEdges);
  }, [onNodeDataChange, setGraph]);

  // Import from YAML
  const handleImportYaml = useCallback(async () => {
    const response = await createYamlImportPicker();
    
    // Check if import was successful
    if (!response.success) {
      console.error('YAML import error:', response.error.message);
      return;
    }
    
    const { nodes: yamlNodes, edges: yamlEdges } = response.data;
    
    // Sanitize nodes to ensure they have proper onChange handlers
    const sanitizedNodes = sanitizeNodesForImport(yamlNodes, onNodeDataChange);
    
    // Sanitize edges to ensure they have correct handles
    const sanitizedEdges = sanitizeEdgesForImport(yamlEdges || [], sanitizedNodes);
    
    setGraph(sanitizedNodes, sanitizedEdges);
    
    success(t('notifications.yamlImported'), { title: t('notifications.importComplete') });
  }, [onNodeDataChange, setGraph, success, t]);

  // Import nodes only (append to canvas)
  const handleImportNodesOnly = useCallback(async () => {
    const importedNodes = await createNodesImportPicker();
    if (!importedNodes || !addNodes) return;

    // Map IDs to avoid collisions and offset positions
    const nodeMap = new Map<string, string>();
    const sanitizedNodes = importedNodes.map(node => {
      const newId = `node_${Math.random().toString(36).substring(2, 7)}`;
      nodeMap.set(node.id, newId);
      return {
        ...node,
        id: newId,
        selected: true,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        }
      };
    });

    const finalNodes = sanitizeNodesForImport(sanitizedNodes, onNodeDataChange);
    addNodes(finalNodes);
    success(t('notifications.componentsImported'), { title: t('notifications.importComplete') });
  }, [onNodeDataChange, addNodes, success, t]);

  // Generate share URL
  const handleShare = useCallback(() => {
    if (nodes.length === 0) return;
    
    const shareUrl = generateShareUrl(nodes, edges);
    if (!shareUrl) {
      console.error('Failed to generate share URL');
      return;
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      // Show success feedback
      success(t('notifications.shareLinkCopied'), { title: t('notifications.linkShared') });
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      // Fallback: open in new tab
      window.open(shareUrl, '_blank');
    });
  }, [nodes, edges, success, t]);

  // Load shared data from URL
  const loadSharedData = useCallback((): { nodes: AppNode[]; edges: Edge[] } | null => {
    return getSharedDataFromUrl();
  }, []);

  // Clear shared data from URL
  const clearSharedData = useCallback(() => {
    clearShareDataFromUrl();
  }, []);

  // Import directly from YAML data (for host integration)
  const importYamlData = useCallback((yamlContent: string) => {
    const response = parseYamlContent(yamlContent);
    if (!response.success) {
      console.error('YAML host import error:', response.error.message);
      return;
    }

    const { nodes: yamlNodes, edges: yamlEdges } = response.data;
    const sanitizedNodes = sanitizeNodesForImport(yamlNodes, onNodeDataChange);
    const sanitizedEdges = sanitizeEdgesForImport(yamlEdges || [], sanitizedNodes);
    
    setGraph(sanitizedNodes, sanitizedEdges);
    success(t('notifications.yamlImportedFromHost'), { title: t('notifications.importComplete') });
  }, [onNodeDataChange, setGraph, success, t]);

  // Import directly from JSON data (for host integration)
  const importJsonData = useCallback((jsonData: any) => {
    if (!jsonData || !jsonData.nodes) return;
    const sanitizedNodes = sanitizeNodesForImport(jsonData.nodes, onNodeDataChange);
    const sanitizedEdges = sanitizeEdgesForImport(jsonData.edges || [], sanitizedNodes);
    
    setGraph(sanitizedNodes, sanitizedEdges);
    success(t('notifications.projectImportedFromHost'), { title: t('notifications.importComplete') });
  }, [onNodeDataChange, setGraph, success, t]);

  // Export to host
  const handleHostExport = useCallback(() => {
    const yamlValue = getYaml();
    const jsonValue = exportToJson(nodes, edges, yamlValue);
    const emitter = [window,window.parent]
    emitter.forEach(e => {
      e.postMessage({ 
        type: EXPORT_CLICKED, 
        payload: {
          yaml: yamlValue,
          json: jsonValue,
          timestamp: new Date().toISOString()
        }
      }, '*');
    })
    
    success(t('notifications.dataSentToHost'), { title: t('notifications.exportComplete') });
  }, [nodes, edges, getYaml, success, t]);

  return {
    handleExportJson,
    handleExportYaml,
    handleExportSelected,
    handleImport,
    handleImportYaml,
    handleImportNodesOnly,
    handleShare,
    loadSharedData,
    clearSharedData,
    importYamlData,
    importJsonData,
    handleHostExport
  };
}
