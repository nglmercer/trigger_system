import { useState, useCallback, useRef, useEffect } from 'react';
import { useAlertEditor, useDrag, useMessageListener, useMediaPlayback } from './hooks';
import { Canvas, LeftSidebar, RightSidebar, PlaybackControls, Icon } from './components';

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
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [showAnimations, setShowAnimations] = useState(false);

  const { dragging, resizing, handleElementMouseDown } = useDrag({
    elements,
    updateElement,
    canvasRef,
  });

  useMediaPlayback({
    isPlaying,
    elements,
    audioRefs,
    videoRefs,
  });

  useMessageListener({
    setIsPlaying,
    setPlaybackTime: () => {},
    setAlertConfig,
    setElements,
    audioRefs,
    videoRefs,
    alertConfig,
    elements,
  });

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
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          downloadJson();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, deleteElement]);

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
      name: `New ${type}`,
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
  }, []);

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
    return JSON.stringify(exportData, null, 2);
  }, [alertConfig, elements]);

  const downloadJson = useCallback(() => {
    const json = exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alerts-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [exportJson]);

  const exportToTriggerRule = useCallback(() => {
    const yamlOutput = `- id: "alert_${Date.now()}"
  on: "ALERT_TRIGGER"
  if:
    field: "alert.name"
    operator: "EQ"
    value: "${alertConfig.name}"
  do:
    type: "show_alert"
    params:
      duration: ${alertConfig.duration}
      elements:
${elements.map(el => `        - type: "${el.type}"
          name: "${el.name}"
          mediaUrl: "${el.mediaUrl}"
          text: "${el.text}"
          volume: ${el.volume}
          loop: ${el.loop}
          x: ${el.x}
          y: ${el.y}
          width: ${el.width}
          height: ${el.height}
          opacity: ${el.opacity}
          animation: "${el.animation}"
          animationDuration: ${el.animationDuration}
          animationDelay: ${el.animationDelay}`).join('\n')}`;
    
    const blob = new Blob([yamlOutput], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trigger-alert-${alertConfig.name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }, [alertConfig, elements]);

  const selectedElement = elements.find(e => e.id === selectedId) || null;

  return (
    <div className="w-screen h-screen bg-slate-900 flex">
      <LeftSidebar
        isOpen={leftSidebarOpen}
        elements={elements}
        sortedElements={sortedElements}
        selectedId={selectedId}
        alertName={alertConfig.name}
        alertDuration={alertConfig.duration}
        onAddElement={addElement}
        onDragStart={handleDragStart}
        onSelectElement={(id) => { setSelectedId(id); setRightSidebarOpen(true); }}
        onMoveLayer={moveLayer}
        onDeleteElement={deleteElement}
        onAlertNameChange={(name) => setAlertConfig(prev => ({ ...prev, name }))}
        onAlertDurationChange={(duration) => setAlertConfig(prev => ({ ...prev, duration }))}
        onDownloadJson={downloadJson}
        onExportToTrigger={exportToTriggerRule}
        onToggle={() => setLeftSidebarOpen(prev => !prev)}
      />

      <div className="flex-1 relative">
        <Canvas
          elements={elements}
          isPlaying={isPlaying}
          selectedId={selectedId}
          onSelectElement={(id) => { if (id) setSelectedId(id); }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onElementMouseDown={handleElementMouseDown}
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

        {rightSidebarOpen && (
          <button
            onClick={() => setRightSidebarOpen(false)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-slate-700 hover:bg-slate-600 p-2 rounded-l-lg"
            style={{ right: 300 }}
          >
            <span className="text-white">
              <Icon name="chevronRight" className="w-4 h-4" />
            </span>
          </button>
        )}
      </div>

      <RightSidebar
        isOpen={rightSidebarOpen}
        element={selectedElement}
        showAnimations={showAnimations}
        onClose={() => setRightSidebarOpen(false)}
        onUpdateElement={(updates) => selectedId && updateElement(selectedId, updates)}
        onToggleAnimations={() => setShowAnimations(prev => !prev)}
      />
    </div>
  );
}