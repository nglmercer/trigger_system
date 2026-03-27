import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Icon } from '../components';
import { DRAGGABLE_ITEMS } from '../constants';
import type { CanvasElement, MediaType } from '../types';

interface LeftSidebarProps {
  isOpen: boolean;
  elements: CanvasElement[];
  sortedElements: CanvasElement[];
  selectedId: string | null;
  alertName: string;
  alertDuration: number;
  onAddElement: (type: MediaType) => void;
  onDragStart: (e: React.DragEvent, type: string) => void;
  onSelectElement: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onDeleteElement: (id: string) => void;
  onAlertNameChange: (name: string) => void;
  onAlertDurationChange: (duration: number) => void;
  onDownloadJson: () => void;
  onExportToTrigger: () => void;
  onToggle: () => void;
  onTogglePlay?: () => void;
  isPlaying?: boolean;
}

export function LeftSidebar({
  isOpen,
  elements,
  sortedElements,
  selectedId,
  alertName,
  alertDuration,
  onAddElement,
  onDragStart,
  onSelectElement,
  onMoveLayer,
  onDeleteElement,
  onAlertNameChange,
  onAlertDurationChange,
  onDownloadJson,
  onExportToTrigger,
  onToggle,
  onTogglePlay,
  isPlaying,
}: LeftSidebarProps) {
  const [showConfig, setShowConfig] = useState(false);
  return (
    <>
      <AnimatePresence>
        {isOpen && (
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
              <p className="text-slate-400 text-xs mt-1">Del to delete • Esc to deselect</p>
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
                      onDragStart={(e) => onDragStart(e, item.type)}
                      onClick={() => onAddElement(item.type)}
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
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {sortedElements.length === 0 ? (
                    <div className="text-slate-500 text-xs text-center py-2">No elements</div>
                  ) : (
                    sortedElements.map((el, idx) => (
                      <div
                        key={el.id}
                        onClick={() => onSelectElement(el.id)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                          selectedId === el.id ? 'bg-cyan-500/20 border border-cyan-400' : 'bg-slate-700 hover:bg-slate-600'
                        } ${el.type === 'audio' ? 'opacity-60' : ''}`}
                      >
                        <span className="text-slate-500 text-xs w-4">{idx + 1}</span>
                        <Icon name={el.type as any} className="w-4 h-4" />
                        <span className="text-white text-xs flex-1 truncate">{el.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onMoveLayer(el.id, 'up'); }}
                          disabled={idx === sortedElements.length - 1}
                          className="text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <Icon name="chevronUp" className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onMoveLayer(el.id, 'down'); }}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <Icon name="chevronDown" className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteElement(el.id); }}
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
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="flex items-center justify-between w-full text-xs text-slate-400 mb-2"
                >
                  <span className="flex items-center gap-1">
                    <Icon name="settings" className="w-3 h-3" />
                    Alert Settings
                  </span>
                  <span className={showConfig ? 'rotate-180' : ''}>▼</span>
                </button>
                
                {showConfig && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Alert Name</label>
                      <input
                        type="text"
                        value={alertName}
                        onChange={(e) => onAlertNameChange(e.target.value)}
                        className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded outline-none focus:ring-1 focus:ring-cyan-400"
                        placeholder="My Alert"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        Duration: <span className="text-cyan-400">{alertDuration}ms</span>
                        <span className="text-slate-600 ml-1">({(alertDuration / 1000).toFixed(1)}s)</span>
                      </label>
                      <input
                        type="range"
                        min={1000}
                        max={30000}
                        step={500}
                        value={alertDuration}
                        onChange={(e) => onAlertDurationChange(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                        <span>1s</span>
                        <span>5s</span>
                        <span>10s</span>
                        <span>15s</span>
                        <span>30s</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Quick Duration</label>
                      <div className="flex gap-1">
                        {[2000, 5000, 10000, 15000].map(dur => (
                          <button
                            key={dur}
                            onClick={() => onAlertDurationChange(dur)}
                            className={`flex-1 py-1 text-xs rounded ${
                              alertDuration === dur 
                                ? 'bg-cyan-500 text-white' 
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                          >
                            {dur / 1000}s
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-700">
                      <label className="text-xs text-slate-500 block mb-1">Quick Actions</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={onTogglePlay}
                          className={`py-2 rounded text-xs font-medium flex items-center justify-center gap-1 ${
                            isPlaying 
                              ? 'bg-red-500 hover:bg-red-400 text-white' 
                              : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                          }`}
                        >
                          <Icon name={isPlaying ? 'pause' : 'play'} className="w-3 h-3" />
                          {isPlaying ? 'Stop' : 'Preview'}
                        </button>
                        <button
                          onClick={onDownloadJson}
                          className="bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs font-medium flex items-center justify-center gap-1"
                        >
                          <Icon name="download" className="w-3 h-3" />
                          JSON
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-700 space-y-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onDownloadJson}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Icon name="download" className="w-4 h-4" />
                Export JSON
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onExportToTrigger}
                className="w-full bg-violet-500 hover:bg-violet-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Icon name="export" className="w-4 h-4" />
                Export to Trigger
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-700 hover:bg-slate-600 p-2 rounded-r-lg"
        style={{ left: isOpen ? 280 : 0 }}
      >
        <span className={`text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <Icon name="chevronLeft" className="w-4 h-4" />
        </span>
      </button>
    </>
  );
}