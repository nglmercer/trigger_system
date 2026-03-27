import { useState, useEffect, useCallback, useRef } from 'react';
import type { CanvasElement } from '../types';

interface UseDragProps {
  elements: CanvasElement[];
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export function useDrag({ elements, updateElement, canvasRef }: UseDragProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleElementMouseDown = useCallback((e: React.MouseEvent, id: string, mode: 'drag' | 'resize') => {
    e.stopPropagation();
    const element = elements.find(e => e.id === id);
    if (!element || element.type === 'audio') return;

    if (mode === 'drag') {
      setDragOffset({ x: e.clientX - element.x, y: e.clientY - element.y });
    }
    setDragging(id);
    setResizing(mode === 'resize' ? id : null);
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
  }, [dragging, resizing, dragOffset, elements, updateElement, canvasRef]);

  return {
    dragging,
    resizing,
    handleElementMouseDown,
    setDragging,
    setResizing,
  };
}