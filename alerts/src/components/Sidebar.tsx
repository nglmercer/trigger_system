import { useState } from 'react';
import type { CanvasElement, MediaType } from '../types';
import { DRAGGABLE_ITEMS } from '../constants';

interface SidebarProps {
  isOpen: boolean;
  elements: CanvasElement[];
  sortedElements: CanvasElement[];
  selectedId: string | null;
  alertName: string;
  alertDuration: number;
  onAddElement: (type: MediaType) => void;
  onSelectElement: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onDeleteElement: (id: string) => void;
  onAlertNameChange: (name: string) => void;
  onAlertDurationChange: (duration: number) => void;
  onToggle: () => void;
}

export function Sidebar({
  isOpen,
  elements,
  sortedElements,
  selectedId,
  alertName,
  alertDuration,
  onAddElement,
  onSelectElement,
  onMoveLayer,
  onDeleteElement,
  onAlertNameChange,
  onAlertDurationChange,
  onToggle,
}: SidebarProps) {
  const [showConfig, setShowConfig] = useState(false);

  const typeIcons: Record<MediaType, string> = {
    video: '🎬',
    audio: '🔊',
    image: '🖼️',
    text: '📝',
  };

  return (
    <>
      {isOpen && (
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h1 className="text-white font-bold text-lg">Alert Editor</h1>
            <p className="text-slate-400 text-xs mt-1">Del to delete • Esc to deselect</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4">
              <label className="text-xs text-slate-400 block mb-2">Add Elements</label>
              <div className="grid grid-cols-2 gap-2">
                {DRAGGABLE_ITEMS.map(item => (
                  <button
                    key={item.type}
                    onClick={() => onAddElement(item.type)}
                    className="bg-slate-700 hover:bg-slate-600 p-3 rounded-lg text-center cursor-pointer transition-colors"
                  >
                    <div className="text-2xl mb-1">{typeIcons[item.type]}</div>
                    <div className="text-white text-xs">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 pt-3 border-t border-slate-700">
              <label className="text-xs text-slate-400 block mb-2">Layers / Elements</label>
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
                      <span>{typeIcons[el.type]}</span>
                      <span className="text-white text-xs flex-1 truncate">{el.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onMoveLayer(el.id, 'up'); }}
                        disabled={idx === sortedElements.length - 1}
                        className="text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onMoveLayer(el.id, 'down'); }}
                        disabled={idx === 0}
                        className="text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        ▼
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteElement(el.id); }}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
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
                <span>Alert Settings</span>
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
                      <span>15s</span>
                      <span>30s</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-700 hover:bg-slate-600 p-2 rounded-r-lg transition-all"
        style={{ left: isOpen ? 256 : 0 }}
      >
        <span className={`text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ◀
        </span>
      </button>
    </>
  );
}
