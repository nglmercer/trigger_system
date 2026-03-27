import type { MediaType, ElementAnimation } from './types';
import { ICONS } from './icons';

type IconName = keyof typeof ICONS;

export const MEDIA_LABELS: Record<MediaType, string> = {
  video: 'Video',
  audio: 'Audio',
  image: 'Image',
  text: 'Text',
};

export const DRAGGABLE_ITEMS: Array<{ type: MediaType; iconName: IconName; label: string }> = [
  { type: 'video', iconName: 'video', label: 'Video' },
  { type: 'audio', iconName: 'audio', label: 'Audio' },
  { type: 'image', iconName: 'image', label: 'Image' },
  { type: 'text', iconName: 'text', label: 'Text' },
];

export const ANIMATIONS: Array<{ value: ElementAnimation; label: string; icon: IconName }> = [
  { value: 'none', label: 'None', icon: 'animNone' },
  { value: 'fade', label: 'Fade In', icon: 'animFade' },
  { value: 'slideInLeft', label: 'Slide Left', icon: 'animSlideLeft' },
  { value: 'slideInRight', label: 'Slide Right', icon: 'animSlideRight' },
  { value: 'slideInTop', label: 'Slide Top', icon: 'animSlideTop' },
  { value: 'slideInBottom', label: 'Slide Bottom', icon: 'animSlideBottom' },
  { value: 'scaleIn', label: 'Scale In', icon: 'animScale' },
  { value: 'bounce', label: 'Bounce', icon: 'animBounce' },
  { value: 'pulse', label: 'Pulse', icon: 'animPulse' },
  { value: 'shake', label: 'Shake', icon: 'animShake' },
];

export const DEFAULT_ALERT_CONFIG = {
  name: 'New Alert',
  duration: 5000,
} as const;

export const DEFAULT_ELEMENT_CONFIG = {
  width: 150,
  height: 150,
  textWidth: 200,
  textHeight: 80,
  opacity: 1,
  scale: 1,
  volume: 1,
  loop: false,
  animation: 'fade' as ElementAnimation,
  animationDuration: 500,
  animationDelay: 0,
} as const;

export const ELEMENT_LIMITS = {
  minWidth: 50,
  minHeight: 40,
  maxDuration: 30000,
  minDuration: 1000,
  durationStep: 500,
  maxAnimationDuration: 2000,
  minAnimationDuration: 100,
  animationDurationStep: 50,
  maxAnimationDelay: 3000,
  animationDelayStep: 100,
} as const;