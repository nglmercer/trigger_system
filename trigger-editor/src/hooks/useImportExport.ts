import { useCallback } from 'react';
import type { Edge } from '@xyflow/react';
import type { AppNode } from '../types';
import { 
  exportToJson, 
  downloadJson, 
  downloadYaml, 
  createImportPicker, 
  sanitizeNodesForImport,
  generateShareUrl,
  getSharedDataFromUrl,
  clearShareDataFromUrl,
} from '../utils/exportImport';
import { createYamlImportPicker } from '../utils/yamlImport';

/**
 * Hook for import/export and sharing functionality
 */
export function useImportExport(
  nodes: AppNode[], 
  edges: Edge[], 
  getYaml: () => string,
  onNodeDataChange: (id: string, value: unknown, field: string) => void,
  setGraph: (nodes: AppNode[], edges: Edge[]) => void,
  success: (message: string, options?: { title?: string }) => void
) {
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

  // Import from JSON
  const handleImport = useCallback(async () => {
    const data = await createImportPicker();
    if (!data) return;
    
    // Sanitize nodes to ensure they have proper onChange handlers
    const sanitizedNodes = sanitizeNodesForImport(data.nodes, onNodeDataChange);
    
    setGraph(sanitizedNodes, data.edges || []);
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
    
    setGraph(sanitizedNodes, yamlEdges || []);
    
    success('YAML imported successfully!', { title: 'Import Complete' });
  }, [onNodeDataChange, setGraph, success]);

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
      success('Share link copied to clipboard!', { title: 'Link Shared' });
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      // Fallback: open in new tab
      window.open(shareUrl, '_blank');
    });
  }, [nodes, edges, success]);

  // Load shared data from URL
  const loadSharedData = useCallback((): { nodes: AppNode[]; edges: Edge[] } | null => {
    return getSharedDataFromUrl();
  }, []);

  // Clear shared data from URL
  const clearSharedData = useCallback(() => {
    clearShareDataFromUrl();
  }, []);

  return {
    handleExportJson,
    handleExportYaml,
    handleImport,
    handleImportYaml,
    handleShare,
    loadSharedData,
    clearSharedData,
  };
}
