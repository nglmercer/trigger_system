import { useState, useRef, useEffect } from 'react';
import type { CanvasElement, ElementAnimation } from '../types';

interface CanvasProps {
  elements: CanvasElement[];
  isPlaying: boolean;
  selectedId: string | null;
  onSelectElement: (id: string | null) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onElementMouseDown: (e: React.MouseEvent, id: string, mode: 'drag' | 'resize') => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  videoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  canvasRef: React.MutableRefObject<HTMLDivElement | null>;
}

const animationStyles: Record<ElementAnimation, { initial: React.CSSProperties; animate: React.CSSProperties }> = {
  none: { initial: {}, animate: {} },
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  slideInLeft: { initial: { opacity: 0, transform: 'translateX(-100px)' }, animate: { opacity: 1, transform: 'translateX(0)' } },
  slideInRight: { initial: { opacity: 0, transform: 'translateX(100px)' }, animate: { opacity: 1, transform: 'translateX(0)' } },
  slideInTop: { initial: { opacity: 0, transform: 'translateY(-100px)' }, animate: { opacity: 1, transform: 'translateY(0)' } },
  slideInBottom: { initial: { opacity: 0, transform: 'translateY(100px)' }, animate: { opacity: 1, transform: 'translateY(0)' } },
  scaleIn: { initial: { opacity: 0, transform: 'scale(0)' }, animate: { opacity: 1, transform: 'scale(1)' } },
  bounce: { initial: { opacity: 0, transform: 'translateY(-50px)' }, animate: { opacity: 1, transform: 'translateY(0)' } },
  pulse: { initial: { opacity: 0, transform: 'scale(0.8)' }, animate: { opacity: 1, transform: 'scale(1)' } },
};

export function Canvas({
  elements,
  isPlaying,
  selectedId,
  onSelectElement,
  onDragOver,
  onDrop,
  onElementMouseDown,
  onUpdateElement,
  videoRefs,
  canvasRef,
}: CanvasProps) {
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  useEffect(() => {
    if (editingTextId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTextId]);

  const handleTextDoubleClick = (element: CanvasElement) => {
    if (element.type === 'text' && !isPlaying) {
      setEditingTextId(element.id);
      setEditingText(element.text);
    }
  };

  const handleTextBlur = () => {
    if (editingTextId) {
      onUpdateElement(editingTextId, { text: editingText });
      setEditingTextId(null);
    }
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditingTextId(null);
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextBlur();
    }
  };

  const renderElement = (element: CanvasElement) => {
    const isSelected = selectedId === element.id;
    const isAnimating = isPlaying && element.animation !== 'none';
    const anim = animationStyles[element.animation];
    
    const containerStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      zIndex: element.zIndex,
      opacity: element.opacity,
      transform: element.scale !== 1 ? `scale(${element.scale})` : undefined,
      ...(isAnimating ? anim.initial : {}),
      transition: isAnimating ? `all ${element.animationDuration}ms ease-out` : 'none',
    };

    const handleVideoRef = (node: HTMLVideoElement | null) => {
      if (node && isPlaying) {
        if (!videoRefs.current.has(element.id)) {
          videoRefs.current.set(element.id, node);
        }
      }
    };

    return (
      <div
        key={element.id}
        style={containerStyle}
        className={`bg-slate-800 rounded-lg border-2 shadow-xl flex flex-col overflow-hidden transition-all ${
          isSelected && !isPlaying ? 'border-cyan-400' : 'border-slate-600'
        } ${isPlaying ? '' : 'cursor-pointer'}`}
        onClick={(e) => { e.stopPropagation(); if (!isPlaying) onSelectElement(element.id); }}
      >
        <div 
          className="h-6 bg-slate-700 rounded-t-lg cursor-move flex items-center px-2 justify-between"
          onMouseDown={!isPlaying ? (e) => onElementMouseDown(e, element.id, 'drag') : undefined}
        >
          <span className="text-xs text-white truncate flex items-center gap-1">
            {element.name}
            {element.animation !== 'none' && (
              <span className="text-cyan-400 text-[10px] ml-1">{element.animation}</span>
            )}
          </span>
        </div>
        
        <div className="flex-1 p-2 overflow-hidden">
          {element.type === 'image' && element.mediaUrl ? (
            <img src={element.mediaUrl} alt="" className="w-full h-full object-cover rounded" />
          ) : element.type === 'video' && element.mediaUrl ? (
            <video 
              ref={handleVideoRef}
              data-element-id={element.id}
              src={element.mediaUrl} 
              className="w-full h-full object-cover rounded" 
            />
          ) : element.type === 'text' ? (
            editingTextId === element.id ? (
              <textarea
                ref={inputRef}
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={handleTextBlur}
                onKeyDown={handleTextKeyDown}
                className="w-full h-full bg-transparent text-white text-sm text-center p-1 outline-none resize-none"
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-white text-sm text-center p-1 cursor-text"
                onDoubleClick={() => handleTextDoubleClick(element)}
              >
                {element.text}
              </div>
            )
          ) : element.type === 'audio' ? (
            element.mediaUrl ? (
              <audio 
                data-element-id={element.id}
                src={element.mediaUrl} 
                className="w-full"
                controls
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                No audio URL
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
              No content
            </div>
          )}
        </div>
        
        {selectedId === element.id && !isPlaying && (
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-cyan-400 rounded-bl"
            onMouseDown={(e) => onElementMouseDown(e, element.id, 'resize')}
          />
        )}
      </div>
    );
  };

  return (
    <div 
      ref={canvasRef}
      className="relative overflow-hidden w-full h-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => onSelectElement(null)}
      style={{ 
        backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', 
        backgroundSize: '20px 20px' 
      }}
    >
      {elements.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="text-4xl mb-4">🎨</div>
            <div>Drag elements from the sidebar</div>
            <div className="text-slate-600 text-xs mt-2">Del to delete • Esc to deselect</div>
          </div>
        </div>
      ) : (
        sortedElements.filter(el => el.type !== 'audio').map(element => 
          renderElement(element)
        )
      )}
    </div>
  );
}
