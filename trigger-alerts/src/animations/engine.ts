import { animate, type JSAnimation } from 'animejs';
import type { AlertElementAnimation } from '../styles/types';

export interface AnimationOptions {
  duration?: number;
  delay?: number;
  easing?: string;
  loop?: boolean | number;
  direction?: 'alternate' | 'normal' | 'reverse';
  onComplete?: () => void;
}

export const getEasing = (easing?: string): string => {
  if (!easing) return 'easeOutQuad';
  // Anime.js uses camelCase for easings, e.g. 'easeInOutQuad'
  // Common CSS easings to Anime.js mapping
  const map: Record<string, string> = {
    'ease-in': 'easeInQuad',
    'ease-out': 'easeOutQuad',
    'ease-in-out': 'easeInOutQuad',
    'linear': 'linear'
  };
  return map[easing] || easing;
};

export async function runAnimation(
  targets: HTMLElement | HTMLElement[],
  keyframes: any,
  options: AnimationOptions = {}
): Promise<JSAnimation> {
  const animation = animate(targets, {
    ...keyframes,
    duration: (options.duration || 0.3) * 1000,
    delay: (options.delay || 0) * 1000,
    ease: getEasing(options.easing),
    loop: options.loop,
    direction: options.direction,
  });

  return new Promise((resolve) => {
    animation.onComplete = () => {
      options.onComplete?.();
      resolve(animation);
    };
  });
}

export async function runStagger(
  targets: HTMLElement[],
  keyframes: any,
  staggerDelay: number = 0.1,
  options: AnimationOptions = {}
): Promise<void> {
  const animation = animate(targets, {
    ...keyframes,
    duration: (options.duration || 0.3) * 1000,
    delay: (el, i) => (options.delay || 0) * 1000 + i * (staggerDelay * 1000),
    ease: getEasing(options.easing),
  });

  await new Promise(resolve => {
    animation.onComplete = resolve;
  });
}
