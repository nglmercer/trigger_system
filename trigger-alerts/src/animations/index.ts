export * from './engine';
export * from './keyframes';

import { runAnimation, runStagger, type AnimationOptions } from './engine';
import { getAnimationKeyframes, getOutKeyframes } from './keyframes';
import type { AlertElementAnimation, AlertElementInteraction } from '../styles/types';

export async function animateElement(
  element: HTMLElement,
  animation: AlertElementAnimation,
  options: Partial<AnimationOptions> = {}
): Promise<any> {
  const keyframes = getAnimationKeyframes(animation);
  return runAnimation(element, keyframes, {
    duration: animation.duration,
    delay: animation.delay,
    easing: animation.easing,
    ...options
  });
}

export async function animateElementOut(
  element: HTMLElement,
  animationType: AlertElementAnimation['type'] = 'fade',
  direction: string = 'up',
  duration: number = 0.2
): Promise<any> {
  const keyframes = getOutKeyframes(animationType, direction);
  return runAnimation(element, keyframes, { duration });
}

export async function animateStagger(
  elements: HTMLElement[],
  animation: AlertElementAnimation,
  staggerDelay: number = 0.1
): Promise<any> {
  const keyframes = getAnimationKeyframes(animation);
  return runStagger(elements, keyframes, staggerDelay, {
    duration: animation.duration,
    delay: animation.delay,
    easing: animation.easing
  });
}

export function setupElementInteractions(
  element: HTMLElement,
  interactions: AlertElementInteraction
): void {
  if (interactions.hover) {
    element.addEventListener('mouseenter', async () => {
      if (interactions.hover?.animation) {
        await animateElement(element, interactions.hover.animation);
      }
      if (interactions.hover?.scale !== undefined) {
        element.style.transition = 'transform 0.2s ease-out';
        element.style.transform = `scale(${interactions.hover.scale})`;
      }
      if (interactions.hover?.rotate !== undefined) {
         element.style.transition = 'transform 0.2s ease-out';
        element.style.transform += ` rotate(${interactions.hover.rotate}deg)`;
      }
      if (interactions.hover?.translate) {
        const { x, y } = interactions.hover.translate;
        element.style.transition = 'transform 0.2s ease-out';
        if (x !== undefined) element.style.transform += ` translateX(${x}px)`;
        if (y !== undefined) element.style.transform += ` translateY(${y}px)`;
      }
      if (interactions.hover?.filter) {
        const filterParts: string[] = [];
        if (interactions.hover.filter.brightness) filterParts.push(`brightness(${interactions.hover.filter.brightness})`);
        if (interactions.hover.filter.grayscale) filterParts.push(`grayscale(${interactions.hover.filter.grayscale})`);
        if (filterParts.length) element.style.filter = filterParts.join(' ');
      }
      if (interactions.hover?.style) {
        Object.entries(interactions.hover.style).forEach(([key, value]) => {
          if (value !== undefined) {
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            (element as any).style[cssKey] = value;
          }
        });
      }
    });

    element.addEventListener('mouseleave', async () => {
      element.style.transition = 'all 0.2s ease-out';
      element.style.transform = '';
      element.style.filter = '';
    });
  }

  if (interactions.press) {
    element.addEventListener('mousedown', async () => {
      if (interactions.press?.animation) {
        await animateElement(element, interactions.press.animation);
      }
      if (interactions.press?.scale !== undefined) {
        element.style.transition = 'transform 0.1s ease-out';
        element.style.transform = `scale(${interactions.press.scale})`;
      }
    });

    element.addEventListener('mouseup', async () => {
      element.style.transform = '';
    });

    element.addEventListener('mouseleave', async () => {
       element.style.transform = '';
    });
  }
}
