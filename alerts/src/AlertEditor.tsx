import { useState, useCallback, useEffect, useRef } from 'react';
import { useAlertEditor } from './hooks/useAlertEditor';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { PlaybackControls } from './components/PlaybackControls';

export default function AlertEditor() {
  const {
    elements,
    setElements,
    selectedId,
    setSelectedId,
    alertConfig,
    setAlertConfig,
    isPlaying,
    setIsPlaying,
    playbackTime,
    updateElement,
    addElement,
    deleteElement,
    moveLayer,
    audioRefs,
    videoRefs,
    canvasRef,
    sortedElements,
  } = useAlertEditor();

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const dragStateRef = useRef<{ id: string; mode: 'drag' | 'resize'; startX: number; startY: number; startPos: { x: number; y: number; width: number; height: number } } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
          deleteElement(selectedId);
        }
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, deleteElement, setSelectedId]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current || !canvasRef.current) return;
      const { id, mode, startX, startY, startPos } = dragStateRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (mode === 'drag') {
        updateElement(id, { x: startPos.x + dx, y: startPos.y + dy });
      } else if (mode === 'resize') {
        updateElement(id, { 
          width: Math.max(50, startPos.width + dx), 
          height: Math.max(40, startPos.height + dy) 
        });
      }
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasRef, updateElement]);

  const handleElementMouseDown = useCallback((e: React.MouseEvent, id: string, mode: 'drag' | 'resize') => {
    e.stopPropagation();
    const element = elements.find(el => el.id === id);
    if (!element) return;
    
    dragStateRef.current = {
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startPos: { x: element.x, y: element.y, width: element.width, height: element.height },
    };
  }, [elements]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('mediaType') as any;
    if (!type || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const id = `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newElement: any = {
      id,
      type,
      name: `New ${type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : type === 'image' ? 'Image' : 'Text'}`,
      mediaUrl: '',
      text: type === 'text' ? 'Enter text here' : '',
      volume: 1,
      loop: false,
      x: type === 'audio' ? 0 : x - 75,
      y: type === 'audio' ? 0 : y - 75,
      width: type === 'text' ? 200 : 150,
      height: type === 'text' ? 80 : 150,
      opacity: 1,
      scale: 1,
      zIndex: type === 'audio' ? 0 : Math.max(0, ...elements.map(e => e.zIndex)) + 1,
      animation: 'fade',
      animationDuration: 500,
      animationDelay: 0,
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(id);
    setRightSidebarOpen(true);
  }, [canvasRef, elements, setElements, setSelectedId]);

  const handleDragStart = useCallback((e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('mediaType', type);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, [setIsPlaying]);

  const exportJson = useCallback(() => {
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      alert: alertConfig,
      elements: elements.map(el => ({
        id: el.id,
        type: el.type,
        name: el.name,
        mediaUrl: el.mediaUrl,
        text: el.text,
        volume: el.volume,
        loop: el.loop,
        position: { x: el.x, y: el.y },
        size: { width: el.width, height: el.height },
        style: { opacity: el.opacity, scale: el.scale, zIndex: el.zIndex },
        animation: { type: el.animation, duration: el.animationDuration, delay: el.animationDelay },
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [alertConfig, elements]);

  const selectedElement = elements.find(e => e.id === selectedId) || null;

  return (
    <div className="w-screen h-screen bg-slate-900 flex">
      <Sidebar
        isOpen={leftSidebarOpen}
        elements={elements}
        sortedElements={sortedElements}
        selectedId={selectedId}
        alertName={alertConfig.name}
        alertDuration={alertConfig.duration}
        onAddElement={addElement}
        onSelectElement={(id) => { setSelectedId(id); setRightSidebarOpen(true); }}
        onMoveLayer={moveLayer}
        onDeleteElement={deleteElement}
        onAlertNameChange={(name) => setAlertConfig(prev => ({ ...prev, name }))}
        onAlertDurationChange={(duration) => setAlertConfig(prev => ({ ...prev, duration }))}
        onToggle={() => setLeftSidebarOpen(prev => !prev)}
      />

      <div className="flex-1 relative">
        <Canvas
          elements={elements}
          isPlaying={isPlaying}
          selectedId={selectedId}
          onSelectElement={(id) => { if (id !== undefined) setSelectedId(id); }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onElementMouseDown={handleElementMouseDown}
          onUpdateElement={updateElement}
          videoRefs={videoRefs}
          canvasRef={canvasRef}
        />
        
        <PlaybackControls
          isPlaying={isPlaying}
          playbackTime={playbackTime}
          duration={alertConfig.duration}
          elements={elements}
          onTogglePlay={togglePlay}
        />

        {rightSidebarOpen && selectedElement && (
          <button
            onClick={() => setRightSidebarOpen(false)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-slate-700 hover:bg-slate-600 p-2 rounded-l-lg"
          >
            <span className="text-white">▶</span>
          </button>
        )}
      </div>

      <PropertiesPanel
        isOpen={rightSidebarOpen}
        element={selectedElement}
        onClose={() => setRightSidebarOpen(false)}
        onUpdateElement={(updates) => selectedId && updateElement(selectedId, updates)}
      />
    </div>
  );
}
