import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICONS } from './icons';

type MediaType = 'video' | 'audio' | 'image' | 'text';
type Transition = 'fade' | 'slide' | 'scale' | 'none';

interface CanvasElement {
  id: string;
  type: MediaType;
  name: string;
  mediaUrl: string;
  text: string;
  volume: number;
  loop: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  scale: number;
  zIndex: number;
}

interface AlertConfig {
  name: string;
  duration: number;
  transition: Transition;
}

const DEFAULT_ALERT: AlertConfig = {
  name: 'New Alert',
  duration: 5000,
  transition: 'fade',
};

const MEDIA_LABELS: Record<MediaType, string> = {
  video: 'Video',
  audio: 'Audio',
  image: 'Image',
  text: 'Text',
};

const DRAGGABLE_ITEMS: { type: MediaType; iconName: keyof typeof ICONS; label: string }[] = [
  { type: 'video', iconName: 'video', label: 'Video' },
  { type: 'audio', iconName: 'audio', label: 'Audio' },
  { type: 'image', iconName: 'image', label: 'Image' },
  { type: 'text', iconName: 'text', label: 'Text' },
];

function generateId() {
  return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function Icon({ name, className = '' }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <span 
      className={`inline-flex items-center justify-center ${className}`}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

export default function AlertEditor() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(DEFAULT_ALERT);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const playbackRef = useRef<number | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const selectedElement = elements.find(e => e.id === selectedId);
  const maxZIndex = Math.max(0, ...elements.map(e => e.zIndex));

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const addElement = useCallback((type: MediaType) => {
    const id = generateId();
    const newZ = type === 'audio' ? 0 : maxZIndex + 1;
    const newElement: CanvasElement = {
      id,
      type,
      name: `New ${MEDIA_LABELS[type]}`,
      mediaUrl: '',
      text: type === 'text' ? 'Enter text here' : '',
      volume: 1,
      loop: false,
      x: type === 'audio' ? 0 : 100 + Math.random() * 100,
      y: type === 'audio' ? 0 : 100 + Math.random() * 100,
      width: type === 'text' ? 200 : 150,
      height: type === 'text' ? 80 : 150,
      opacity: 1,
      scale: 1,
      zIndex: newZ,
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(id);
    setRightSidebarOpen(true);
  }, [maxZIndex]);

  const deleteElement = useCallback((id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const moveLayer = useCallback((id: string, direction: 'up' | 'down') => {
    setElements(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex(e => e.id === id);
      if (idx === -1) return prev;
      
      const newSorted = [...sorted];
      const swapIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (swapIdx < 0 || swapIdx >= newSorted.length) return prev;
      
      const temp = newSorted[idx].zIndex;
      newSorted[idx].zIndex = newSorted[swapIdx].zIndex;
      newSorted[swapIdx].zIndex = temp;
      
      return newSorted;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('mediaType') as MediaType;
    if (!type || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const id = generateId();
    const newZ = type === 'audio' ? 0 : maxZIndex + 1;
    const newElement: CanvasElement = {
      id,
      type,
      name: `New ${MEDIA_LABELS[type]}`,
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
      zIndex: newZ,
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(id);
    setRightSidebarOpen(true);
  }, [maxZIndex]);

  const handleElementMouseDown = useCallback((e: React.MouseEvent, id: string, mode: 'drag' | 'resize') => {
    e.stopPropagation();
    const element = elements.find(e => e.id === id);
    if (!element || element.type === 'audio') return;

    if (mode === 'drag') {
      setDragOffset({ x: e.clientX - element.x, y: e.clientY - element.y });
    }
    setDragging(id);
    setResizing(mode === 'resize' ? id : null);
    setSelectedId(id);
  }, [elements]);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizing && canvasRef.current) {
        const element = elements.find(e => e.id === resizing);
        const rect = canvasRef.current.getBoundingClientRect();
        if (element) {
          const newWidth = Math.max(50, e.clientX - rect.left - element.x);
          const newHeight = Math.max(40, e.clientY - rect.top - element.y);
          updateElement(resizing, { width: newWidth, height: newHeight });
        }
      } else {
        updateElement(dragging, {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, resizing, dragOffset, elements, updateElement]);

  useEffect(() => {
    elements.forEach(el => {
      if (el.type === 'audio' && el.mediaUrl) {
        let audio = audioRefs.current.get(el.id);
        if (!audio) {
          audio = new Audio(el.mediaUrl);
          audioRefs.current.set(el.id, audio);
        }
        audio.volume = el.volume;
        audio.loop = el.loop;
      }
    });
  }, [elements]);

  const handleDragStart = (e: React.DragEvent, type: MediaType) => {
    e.dataTransfer.setData('mediaType', type);
  };

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      setPlaybackTime(0);
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    } else {
      setIsPlaying(true);
      setPlaybackTime(0);
      elements.forEach(el => {
        if (el.type === 'audio' && el.mediaUrl) {
          const audio = audioRefs.current.get(el.id);
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(console.error);
          }
        }
      });
    }
  }, [isPlaying, elements]);

  useEffect(() => {
    if (isPlaying) {
      playbackRef.current = window.setInterval(() => {
        setPlaybackTime(prev => {
          if (prev >= alertConfig.duration) {
            setIsPlaying(false);
            audioRefs.current.forEach(audio => {
              audio.pause();
              audio.currentTime = 0;
            });
            return 0;
          }
          return prev + 100;
        });
      }, 100);
    }
    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
      }
    };
  }, [isPlaying, alertConfig.duration]);

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
      transition: "${alertConfig.transition}"
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
          opacity: ${el.opacity}`).join('\n')}`;
    
    const blob = new Blob([yamlOutput], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trigger-alert-${alertConfig.name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }, [alertConfig, elements]);

  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="w-screen h-screen bg-slate-900 flex">
      {/* Left Sidebar - Layers & Add Elements */}
      <AnimatePresence>
        {leftSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-700">
              <h1 className="text-white font-bold text-lg flex items-center gap-2">
                <Icon name="alert" className="text-cyan-400" />
                Alert Editor
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <label className="text-xs text-slate-400 block mb-2 flex items-center gap-1">
                  <Icon name="plus" className="w-3 h-3" />
                  Add Elements
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DRAGGABLE_ITEMS.map(item => (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.type)}
                      onClick={() => addElement(item.type)}
                      className="bg-slate-700 hover:bg-slate-600 p-3 rounded-lg text-center cursor-grab active:cursor-grabbing"
                    >
                      <Icon name={item.iconName} className="w-6 h-6 mx-auto mb-1 text-cyan-400" />
                      <div className="text-white text-xs">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4 pt-3 border-t border-slate-700">
                <label className="text-xs text-slate-400 block mb-2 flex items-center gap-1">
                  <Icon name="layers" className="w-3 h-3" />
                  Layers / Elements
                </label>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {sortedElements.length === 0 ? (
                    <div className="text-slate-500 text-xs text-center py-2">No elements</div>
                  ) : (
                    sortedElements.map((el, idx) => (
                      <div
                        key={el.id}
                        onClick={() => { setSelectedId(el.id); setRightSidebarOpen(true); }}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                          selectedId === el.id ? 'bg-cyan-500/20 border border-cyan-400' : 'bg-slate-700 hover:bg-slate-600'
                        } ${el.type === 'audio' ? 'opacity-60' : ''}`}
                      >
                        <span className="text-slate-500 text-xs w-4">{idx + 1}</span>
                        <Icon name={el.type as keyof typeof ICONS} className="w-4 h-4" />
                        <span className="text-white text-xs flex-1 truncate">{el.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 'up'); }}
                          disabled={idx === sortedElements.length - 1}
                          className="text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <Icon name="chevronUp" className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 'down'); }}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <Icon name="chevronDown" className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Icon name="close" className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700">
                <label className="text-xs text-slate-400 block mb-2 flex items-center gap-1">
                  <Icon name="settings" className="w-3 h-3" />
                  Alert Settings
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={alertConfig.name}
                    onChange={(e) => setAlertConfig(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="Alert name"
                  />
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Duration: {alertConfig.duration}ms</label>
                    <input
                      type="range"
                      min={1000}
                      max={30000}
                      step={500}
                      value={alertConfig.duration}
                      onChange={(e) => setAlertConfig(prev => ({ ...prev, duration: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <select
                    value={alertConfig.transition}
                    onChange={(e) => setAlertConfig(prev => ({ ...prev, transition: e.target.value as Transition }))}
                    className="w-full bg-slate-700 text-white text-sm px-2 py-1.5 rounded outline-none"
                  >
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="scale">Scale</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-700 space-y-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={downloadJson}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Icon name="download" className="w-4 h-4" />
                Export JSON
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={exportToTriggerRule}
                className="w-full bg-violet-500 hover:bg-violet-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Icon name="export" className="w-4 h-4" />
                Export to Trigger
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Left Sidebar */}
      <button
        onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-700 hover:bg-slate-600 p-2 rounded-r-lg"
        style={{ left: leftSidebarOpen ? 280 : 0 }}
      >
        <span className={`text-white transition-transform ${leftSidebarOpen ? 'rotate-180' : ''}`}>
          <Icon name="chevronLeft" className="w-4 h-4" />
        </span>
      </button>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => setSelectedId(null)}
        style={{ 
          backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', 
          backgroundSize: '20px 20px' 
        }}
      >
        {isPlaying && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-500/80 px-4 py-2 rounded-full text-white text-sm z-50 flex items-center gap-2">
            <Icon name="play" className="w-4 h-4" />
            Playing... {Math.round(playbackTime / 1000)}s / {Math.round(alertConfig.duration / 1000)}s
          </div>
        )}

        {elements.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Icon name="alert" className="w-12 h-12 mx-auto mb-2 text-slate-600" />
              <div>Drag elements from the sidebar</div>
            </div>
          </div>
        ) : (
          sortedElements.filter(el => el.type !== 'audio').map(element => (
            <motion.div
              key={element.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: element.opacity }}
              style={{
                position: 'absolute',
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                zIndex: element.zIndex,
              }}
              className={`bg-slate-800 rounded-lg border-2 shadow-xl flex flex-col ${
                selectedId === element.id ? 'border-cyan-400' : 'border-slate-600'
              }`}
              onClick={(e) => { e.stopPropagation(); setSelectedId(element.id); setRightSidebarOpen(true); }}
            >
              <div 
                className="h-6 bg-slate-700 rounded-t-lg cursor-move flex items-center px-2 justify-between"
                onMouseDown={(e) => handleElementMouseDown(e, element.id, 'drag')}
              >
                <span className="text-xs text-white truncate flex items-center gap-1">
                  <Icon name={element.type as keyof typeof ICONS} className="w-3 h-3" />
                  {element.name}
                </span>
              </div>
              
              <div className="flex-1 p-2 overflow-hidden">
                {element.type === 'image' && element.mediaUrl ? (
                  <img src={element.mediaUrl} alt="" className="w-full h-full object-cover rounded" />
                ) : element.type === 'video' && element.mediaUrl ? (
                  <video src={element.mediaUrl} className="w-full h-full object-cover rounded" />
                ) : element.type === 'text' ? (
                  <div className="w-full h-full flex items-center justify-center text-white text-sm text-center p-1">
                    {element.text}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                    <Icon name={element.type as keyof typeof ICONS} className="w-8 h-8 opacity-50" />
                  </div>
                )}
              </div>
              
              {selectedId === element.id && (
                <div 
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-cyan-400 rounded-bl"
                  onMouseDown={(e) => handleElementMouseDown(e, element.id, 'resize')}
                />
              )}
            </motion.div>
          ))
        )}

        <div className="absolute top-4 right-4 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={togglePlay}
            className={`${isPlaying ? 'bg-red-500 hover:bg-red-400' : 'bg-cyan-500 hover:bg-cyan-400'} text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2`}
          >
            <Icon name={isPlaying ? 'stop' : 'play'} className="w-4 h-4" />
            {isPlaying ? 'Stop' : 'Play'}
          </motion.button>
          
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg text-slate-400 text-sm">
            {elements.filter(e => e.type !== 'audio').length} visible | {elements.filter(e => e.type === 'audio').length} audio
          </div>
        </div>
      </div>

      {/* Right Sidebar - Element Properties */}
      <AnimatePresence>
        {rightSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Icon name="settings" className="text-cyan-400" />
                Properties
              </h2>
              <button 
                onClick={() => setRightSidebarOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!selectedElement ? (
                <div className="text-slate-500 text-sm text-center py-8">
                  Select an element to edit its properties
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-700 p-3 rounded-lg flex items-center gap-3">
                    <Icon name={selectedElement.type as keyof typeof ICONS} className="w-8 h-8 text-cyan-400" />
                    <div>
                      <div className="text-white font-medium">{selectedElement.name}</div>
                      <div className="text-slate-400 text-xs capitalize">{selectedElement.type}</div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Name</label>
                    <input
                      type="text"
                      value={selectedElement.name}
                      onChange={(e) => updateElement(selectedId!, { name: e.target.value })}
                      className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  {(selectedElement.type === 'image' || selectedElement.type === 'video') && (
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Media URL</label>
                      <input
                        type="text"
                        value={selectedElement.mediaUrl}
                        onChange={(e) => updateElement(selectedId!, { mediaUrl: e.target.value })}
                        className="w-full bg-slate-700 text-white text-xs px-2 py-1.5 rounded outline-none"
                        placeholder="https://..."
                      />
                    </div>
                  )}

                  {selectedElement.type === 'text' && (
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Text Content</label>
                      <textarea
                        value={selectedElement.text}
                        onChange={(e) => updateElement(selectedId!, { text: e.target.value })}
                        className="w-full bg-slate-700 text-white text-xs px-2 py-1.5 rounded outline-none resize-none"
                        rows={4}
                        placeholder="Enter text..."
                      />
                    </div>
                  )}

                  {selectedElement.type === 'audio' && (
                    <>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Audio URL</label>
                        <input
                          type="text"
                          value={selectedElement.mediaUrl}
                          onChange={(e) => updateElement(selectedId!, { mediaUrl: e.target.value })}
                          className="w-full bg-slate-700 text-white text-xs px-2 py-1.5 rounded outline-none"
                          placeholder="https://...mp3"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Volume: {Math.round(selectedElement.volume * 100)}%</label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={selectedElement.volume}
                          onChange={(e) => updateElement(selectedId!, { volume: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={selectedElement.loop}
                          onChange={(e) => updateElement(selectedId!, { loop: e.target.checked })}
                          className="rounded"
                        />
                        Loop Audio
                      </label>
                    </>
                  )}

                  {selectedElement.type !== 'audio' && (
                    <>
                      <div className="pt-3 border-t border-slate-700">
                        <label className="text-xs text-slate-400 block mb-2">Position</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-500">X</label>
                            <input
                              type="number"
                              value={Math.round(selectedElement.x)}
                              onChange={(e) => updateElement(selectedId!, { x: Number(e.target.value) })}
                              className="w-full bg-slate-700 text-white text-sm px-2 py-1 rounded outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">Y</label>
                            <input
                              type="number"
                              value={Math.round(selectedElement.y)}
                              onChange={(e) => updateElement(selectedId!, { y: Number(e.target.value) })}
                              className="w-full bg-slate-700 text-white text-sm px-2 py-1 rounded outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-2">Size</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-500">Width</label>
                            <input
                              type="number"
                              value={Math.round(selectedElement.width)}
                              onChange={(e) => updateElement(selectedId!, { width: Number(e.target.value) })}
                              className="w-full bg-slate-700 text-white text-sm px-2 py-1 rounded outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">Height</label>
                            <input
                              type="number"
                              value={Math.round(selectedElement.height)}
                              onChange={(e) => updateElement(selectedId!, { height: Number(e.target.value) })}
                              className="w-full bg-slate-700 text-white text-sm px-2 py-1 rounded outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Opacity: {Math.round(selectedElement.opacity * 100)}%</label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={selectedElement.opacity}
                          onChange={(e) => updateElement(selectedId!, { opacity: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Right Sidebar */}
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
  );
}
