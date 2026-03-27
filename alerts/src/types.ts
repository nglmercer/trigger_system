export type MediaType = 'video' | 'audio' | 'image' | 'text';

export type ElementAnimation = 
  | 'none' 
  | 'fade' 
  | 'slideInLeft' 
  | 'slideInRight' 
  | 'slideInTop' 
  | 'slideInBottom' 
  | 'scaleIn' 
  | 'bounce' 
  | 'pulse' 
  | 'shake';

export interface CanvasElement {
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
  animation: ElementAnimation;
  animationDuration: number;
  animationDelay: number;
}

export interface AlertConfig {
  name: string;
  duration: number;
  transition?: string;
}

export interface AlertExport {
  version: string;
  exportedAt: string;
  alert: AlertConfig;
  elements: Array<{
    id: string;
    type: MediaType;
    name: string;
    mediaUrl: string;
    text: string;
    volume: number;
    loop: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
    style: { opacity: number; scale: number; zIndex: number };
    animation: { type: ElementAnimation; duration: number; delay: number };
  }>;
}

export type AnimationDirection = 'up' | 'down';
export type DragMode = 'drag' | 'resize';