import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../components';
import { ICONS } from '../icons';
import { ANIMATIONS } from '../constants';
import type { CanvasElement } from '../types';

interface RightSidebarProps {
  isOpen: boolean;
  element: CanvasElement | null;
  showAnimations: boolean;
  onClose: () => void;
  onUpdateElement: (updates: Partial<CanvasElement>) => void;
  onToggleAnimations: () => void;
}

export function RightSidebar({
  isOpen,
  element,
  showAnimations,
  onClose,
  onUpdateElement,
  onToggleAnimations,
}: RightSidebarProps) {
  if (!element) return null;

  return (
    <AnimatePresence>
      {isOpen && (
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
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <Icon name="close" className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-slate-700 p-3 rounded-lg flex items-center gap-3">
              <Icon name={element.type as keyof typeof ICONS} className="w-8 h-8 text-cyan-400" />
              <div>
                <div className="text-white font-medium">{element.name}</div>
                <div className="text-slate-400 text-xs capitalize">{element.type}</div>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Name</label>
              <input
                type="text"
                value={element.name}
                onChange={(e) => onUpdateElement({ name: e.target.value })}
                className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            {(element.type === 'image' || element.type === 'video') && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Media URL</label>
                <input
                  type="text"
                  value={element.mediaUrl}
                  onChange={(e) => onUpdateElement({ mediaUrl: e.target.value })}
                  className="w-full bg-slate-700 text-white text-xs px-2 py-1.5 rounded outline-none"
                  placeholder="https://..."
                />
              </div>
            )}

            {element.type === 'text' && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Text Content</label>
                <textarea
                  value={element.text}
                  onChange={(e) => onUpdateElement({ text: e.target.value })}
                  className="w-full bg-slate-700 text-white text-xs px-2 py-1.5 rounded outline-none resize-none"
                  rows={4}
                  placeholder="Enter text..."
                />
              </div>
            )}

            {element.type === 'audio' && (
              <>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Audio URL</label>
                  <input
                    type="text"
                    value={element.mediaUrl}
                    onChange={(e) => onUpdateElement({ mediaUrl: e.target.value })}
                    className="w-full bg-slate-700 text-white text-xs px-2 py-1.5 rounded outline-none"
                    placeholder="https://...mp3"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Volume: {Math.round(element.volume * 100)}%</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={element.volume}
                    onChange={(e) => onUpdateElement({ volume: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={element.loop}
                    onChange={(e) => onUpdateElement({ loop: e.target.checked })}
                    className="rounded"
                  />
                  Loop Audio
                </label>
              </>
            )}

            {element.type !== 'audio' && (
              <>
                <div className="pt-3 border-t border-slate-700">
                  <button
                    onClick={onToggleAnimations}
                    className="flex items-center justify-between w-full text-xs text-slate-400 mb-2"
                  >
                    <span className="flex items-center gap-1">
                      <span className="text-cyan-400">✨</span>
                      Animation
                    </span>
                    <span className={showAnimations ? 'rotate-180' : ''}>▼</span>
                  </button>
                  
                  {showAnimations && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-1">
                        {ANIMATIONS.map(anim => (
                          <button
                            key={anim.value}
                            onClick={() => onUpdateElement({ animation: anim.value })}
                            className={`p-2 rounded text-xs text-center transition-colors ${
                              element.animation === anim.value
                                ? 'bg-cyan-500 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            <Icon name={anim.icon} className="w-5 h-5 mx-auto mb-1" />
                            <div className="text-[10px]">{anim.label}</div>
                          </button>
                        ))}
                      </div>
                      
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">
                          Duration: {element.animationDuration}ms
                        </label>
                        <input
                          type="range"
                          min={100}
                          max={2000}
                          step={50}
                          value={element.animationDuration}
                          onChange={(e) => onUpdateElement({ animationDuration: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">
                          Delay: {element.animationDelay}ms
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={3000}
                          step={100}
                          value={element.animationDelay}
                          onChange={(e) => onUpdateElement({ animationDelay: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-700">
                  <label className="text-xs text-slate-400 block mb-2">Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">X</label>
                      <input
                        type="number"
                        value={Math.round(element.x)}
                        onChange={(e) => onUpdateElement({ x: Number(e.target.value) })}
                        className="w-full bg-slate-700 text-white text-sm px-2 py-1 rounded outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Y</label>
                      <input
                        type="number"
                        value={Math.round(element.y)}
                        onChange={(e) => onUpdateElement({ y: Number(e.target.value) })}
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
                        value={Math.round(element.width)}
                        onChange={(e) => onUpdateElement({ width: Number(e.target.value) })}
                        className="w-full bg-slate-700 text-white text-sm px-2 py-1 rounded outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Height</label>
                      <input
                        type="number"
                        value={Math.round(element.height)}
                        onChange={(e) => onUpdateElement({ height: Number(e.target.value) })}
                        className="w-full bg-slate-700 text-white text-sm px-2 py-1 rounded outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Opacity: {Math.round(element.opacity * 100)}%</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={element.opacity}
                    onChange={(e) => onUpdateElement({ opacity: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}