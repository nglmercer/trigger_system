import { motion } from 'framer-motion';
import { Icon } from '../components';
import { ICONS } from '../icons';
import type { CanvasElement } from '../types';
import { getAnimationVariant } from '../utils';

interface CanvasProps {
  elements: CanvasElement[];
  isPlaying: boolean;
  selectedId: string | null;
  onSelectElement: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onElementMouseDown: (e: React.MouseEvent, id: string, mode: 'drag' | 'resize') => void;
  videoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  canvasRef: React.MutableRefObject<HTMLDivElement | null>;
}

export function Canvas({
  elements,
  isPlaying,
  selectedId,
  onSelectElement,
  onDragOver,
  onDrop,
  onElementMouseDown,
  videoRefs,
  canvasRef,
}: CanvasProps) {
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  const renderElement = (element: CanvasElement, isPreview: boolean = false) => {
    const variant = getAnimationVariant(element.animation, element.animationDuration);
    const isAnimated = isPreview && element.animation !== 'none';
    
    const MotionDiv = isAnimated ? motion.div : 'div';
    const motionProps = isAnimated ? {
      initial: variant.initial,
      animate: variant.animate,
      transition: variant.transition,
      style: { opacity: element.opacity }
    } : { style: { opacity: element.opacity } };

    const handleVideoRef = (node: HTMLVideoElement | null) => {
      if (node && isPreview) {
        if (!videoRefs.current.has(element.id)) {
          videoRefs.current.set(element.id, node);
        }
      }
    };

    return (
      <MotionDiv
        key={element.id}
        {...motionProps}
        style={{
          position: 'absolute',
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          zIndex: element.zIndex,
        }}
        className={`bg-slate-800 rounded-lg border-2 shadow-xl flex flex-col ${
          selectedId === element.id && !isPreview ? 'border-cyan-400' : 'border-slate-600'
        } ${isPreview ? '' : 'pointer-events-auto'}`}
        onClick={isPreview ? undefined : (e) => { e.stopPropagation(); onSelectElement(element.id); }}
      >
        <div 
          className="h-6 bg-slate-700 rounded-t-lg cursor-move flex items-center px-2 justify-between"
          onMouseDown={isPreview ? undefined : (e) => onElementMouseDown(e, element.id, 'drag')}
        >
          <span className="text-xs text-white truncate flex items-center gap-1">
            <Icon name={element.type as keyof typeof ICONS} className="w-3 h-3" />
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
              ref={isPreview ? handleVideoRef : undefined} 
              data-element-id={element.id}
              src={element.mediaUrl} 
              className="w-full h-full object-cover rounded" 
            />
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
        
        {selectedId === element.id && !isPreview && (
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-cyan-400 rounded-bl"
            onMouseDown={(e) => onElementMouseDown(e, element.id, 'resize')}
          />
        )}
      </MotionDiv>
    );
  };

  return (
    <div 
      ref={canvasRef}
      className="relative overflow-hidden"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => onSelectElement('')}
      style={{ 
        backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', 
        backgroundSize: '20px 20px' 
      }}
    >
      {elements.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center text-slate-500">
          <div className="text-center">
            <Icon name="alert" className="w-12 h-12 mx-auto mb-2 text-slate-600" />
            <div>Drag elements from the sidebar</div>
            <div className="text-slate-600 text-xs mt-2">Del to delete • Esc to deselect</div>
          </div>
        </div>
      ) : (
        sortedElements.filter(el => el.type !== 'audio').map(element => 
          renderElement(element, isPlaying)
        )
      )}
    </div>
  );
}