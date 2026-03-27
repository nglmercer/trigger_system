import type { CanvasElement, MediaType } from '../types';
import { ANIMATIONS } from '../constants';

interface PropertiesPanelProps {
  isOpen: boolean;
  element: CanvasElement | null;
  onClose: () => void;
  onUpdateElement: (updates: Partial<CanvasElement>) => void;
}

export function PropertiesPanel({
  isOpen,
  element,
  onClose,
  onUpdateElement,
}: PropertiesPanelProps) {
  if (!element || !isOpen) return null;

  const typeLabels: Record<MediaType, string> = {
    video: 'Video',
    audio: 'Audio',
    image: 'Image',
    text: 'Text',
  };

  return (
    <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-white font-semibold">Properties</h2>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-slate-700 p-3 rounded-lg flex items-center gap-3 mb-4">
          <div className="text-2xl">
            {element.type === 'video' ? '🎬' : element.type === 'audio' ? '🔊' : element.type === 'image' ? '🖼️' : '📝'}
          </div>
          <div>
            <div className="text-white font-medium">{element.name}</div>
            <div className="text-slate-400 text-xs capitalize">{typeLabels[element.type]}</div>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-slate-400 block mb-1">Name</label>
          <input
            type="text"
            value={element.name}
            onChange={(e) => onUpdateElement({ name: e.target.value })}
            className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        {(element.type === 'image' || element.type === 'video') && (
          <div className="mb-4">
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
          <div className="mb-4">
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
            <div className="mb-4">
              <label className="text-xs text-slate-400 block mb-1">Audio URL</label>
              <input
                type="text"
                value={element.mediaUrl}
                onChange={(e) => onUpdateElement({ mediaUrl: e.target.value })}
                className="w-full bg-slate-700 text-white text-xs px-2 py-1.5 rounded outline-none"
                placeholder="https://...mp3"
              />
            </div>
            <div className="mb-4">
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
            <label className="flex items-center gap-2 text-xs text-slate-300 mb-4">
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
            <div className="pt-3 border-t border-slate-700 mb-4">
              <label className="text-xs text-slate-400 block mb-2">Animation</label>
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
                    {anim.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
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
            
            <div className="mb-4">
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

            <div className="pt-3 border-t border-slate-700 mb-4">
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

            <div className="mb-4">
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

            <div className="mb-4">
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
    </div>
  );
}
