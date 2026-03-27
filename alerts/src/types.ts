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
  | 'pulse';

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
}

export interface AlertExport {
  version: string;
  exportedAt: string;
  alert: AlertConfig;
  elements: CanvasElement[];
}
