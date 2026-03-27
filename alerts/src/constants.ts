import type { MediaType, ElementAnimation } from './types';

export const MEDIA_LABELS: Record<MediaType, string> = {
  video: 'Video',
  audio: 'Audio',
  image: 'Image',
  text: 'Text',
};

export const DRAGGABLE_ITEMS: Array<{ type: MediaType; label: string }> = [
  { type: 'video', label: 'Video' },
  { type: 'audio', label: 'Audio' },
  { type: 'image', label: 'Image' },
  { type: 'text', label: 'Text' },
];

export const ANIMATIONS: Array<{ value: ElementAnimation; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade In' },
  { value: 'slideInLeft', label: 'Slide Left' },
  { value: 'slideInRight', label: 'Slide Right' },
  { value: 'slideInTop', label: 'Slide Top' },
  { value: 'slideInBottom', label: 'Slide Bottom' },
  { value: 'scaleIn', label: 'Scale In' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'pulse', label: 'Pulse' },
];

export const DEFAULT_ALERT_CONFIG = {
  name: 'New Alert',
  duration: 5000,
} as const;
