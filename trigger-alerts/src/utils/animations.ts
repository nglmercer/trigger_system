import { animate, type AnimationOptions } from 'motion';
import type { AlertElementAnimation, AlertElementInteraction } from '../styles/types';

function parseEasing(easing?: string): AnimationOptions['easing'] {
  if (!easing) return 'ease-out';
  if (easing.startsWith('spring(')) {
    const match = easing.match(/spring\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, stiffness, damping, mass] = match;
      return { type: 'spring', stiffness: Number(stiffness), damping: Number(damping), mass: Number(mass) } as any;
    }
  }
  return easing as AnimationOptions['easing'];
}

function getDirectionValue(direction?: 'up' | 'down' | 'left' | 'right'): string {
  return direction || 'up';
}

export function getAnimationKeyframes(animation: AlertElementAnimation): any {
  const direction = getDirectionValue(animation.direction);
  const from = animation.from ?? 0;
  const to = animation.to ?? 0;
  
  switch (animation.type) {
    case 'fade':
      return { opacity: [0, 1] };
    case 'slide':
      switch (direction) {
        case 'up': return { transform: [`translateY(${from})`, 'translateY(0)'] };
        case 'down': return { transform: [`translateY(${from})`, 'translateY(0)'] };
        case 'left': return { transform: [`translateX(${from})`, 'translateX(0)'] };
        case 'right': return { transform: [`translateX(${from})`, 'translateX(0)'] };
      }
      break;
    case 'scale':
      return { transform: [{ scale: Number(from) }, { scale: 1 }] };
    case 'rotate':
      return { transform: [{ rotate: Number(from) }, { rotate: Number(to) }] };
    case 'bounce':
      return { transform: ['scale(0.5)', 'scale(1.1)', 'scale(0.9)', 'scale(1)'] };
    case 'shake':
      return { transform: ['translateX(0)', 'translateX(-10px)', 'translateX(10px)', 'translateX(-10px)', 'translateX(10px)', 'translateX(0)'] };
    case 'pulse':
      return { transform: ['scale(1)', 'scale(1.05)', 'scale(1)'], opacity: [1, 0.8, 1] };
    case 'flip':
    case 'flipX':
      return { transform: ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(0deg)'] };
    case 'flipY':
      return { transform: ['rotateX(0deg)', 'rotateX(90deg)', 'rotateX(0deg)'] };
    default:
      return { opacity: [0, 1] };
  }
}

export async function animateElement(
  element: HTMLElement,
  animation: AlertElementAnimation
): Promise<void> {
  const keyframes = getAnimationKeyframes(animation);
  const options: AnimationOptions = {
    duration: animation.duration ?? 0.3,
    delay: animation.delay ?? 0,
    easing: parseEasing(animation.easing),
  };

  await animate(element, keyframes, options);
}

export async function animateElementOut(
  element: HTMLElement,
  animationType: AlertElementAnimation['type'] = 'fade',
  direction?: 'up' | 'down' | 'left' | 'right',
  duration: number = 0.2
): Promise<void> {
  let keyframes: any;
  const dir = direction || 'up';
  
  switch (animationType) {
    case 'slide':
      keyframes = dir === 'up' 
        ? { transform: ['translateY(0)', 'translateY(-20px)'], opacity: [1, 0] }
        : { transform: ['translateY(0)', 'translateY(20px)'], opacity: [1, 0] };
      break;
    case 'scale':
      keyframes = { transform: ['scale(1)', 'scale(0.8)'], opacity: [1, 0] };
      break;
    case 'fade':
    default:
      keyframes = { opacity: [1, 0] };
  }

  await animate(element, keyframes, { duration, easing: 'ease-out' });
}

export async function animateStagger(
  elements: HTMLElement[],
  animation: AlertElementAnimation,
  staggerDelay: number = 0.1
): Promise<void> {
  const keyframes = getAnimationKeyframes(animation);
  const options: AnimationOptions = {
    duration: animation.duration ?? 0.3,
    delay: animation.delay ?? 0,
    easing: parseEasing(animation.easing),
  };

  const delay = staggerDelay;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    animate(el, keyframes, { ...options, delay: i * delay });
  }
  
  await new Promise(resolve => setTimeout(resolve, (elements.length - 1) * delay * 1000 + (options.duration ?? 0.3) * 1000));
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
        element.style.transform = `scale(${interactions.hover.scale})`;
      }
      if (interactions.hover?.rotate !== undefined) {
        element.style.transform = `rotate(${interactions.hover.rotate}deg)`;
      }
      if (interactions.hover?.translate) {
        const { x, y } = interactions.hover.translate;
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
      await animate(element, { transform: 'scale(1)', opacity: 1 }, { duration: 0.2 });
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
        element.style.transform = `scale(${interactions.press.scale})`;
      }
      if (interactions.press?.rotate !== undefined) {
        element.style.transform = `rotate(${interactions.press.rotate}deg)`;
      }
      if (interactions.press?.translate) {
        const { x, y } = interactions.press.translate;
        if (x !== undefined) element.style.transform += ` translateX(${x}px)`;
        if (y !== undefined) element.style.transform += ` translateY(${y}px)`;
      }
    });

    element.addEventListener('mouseup', async () => {
      await animate(element, { transform: 'scale(1)' }, { duration: 0.2 });
      element.style.transform = '';
    });

    element.addEventListener('mouseleave', async () => {
      await animate(element, { transform: 'scale(1)' }, { duration: 0.2 });
      element.style.transform = '';
    });
  }

  if (interactions.focus) {
    element.addEventListener('focus', async () => {
      if (interactions.focus?.animation) {
        await animateElement(element, interactions.focus.animation);
      }
      if (interactions.focus?.style) {
        Object.entries(interactions.focus.style).forEach(([key, value]) => {
          if (value !== undefined) {
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            (element as any).style[cssKey] = value;
          }
        });
      }
    });

    element.addEventListener('blur', async () => {
      await animate(element, { opacity: 1 }, { duration: 0.2 });
    });
  }
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeIn(t: number): number {
  return t * t * t;
}

export function spring(
  stiffness: number = 100,
  damping: number = 10,
  mass: number = 1
): (t: number) => number {
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  
  return (t: number) => {
    if (zeta < 1) {
      const omegaD = omega * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega * t) * (
        Math.cos(omegaD * t) + (zeta * omega / omegaD) * Math.sin(omegaD * t)
      );
    }
    return 1 - (1 + omega * t) * Math.exp(-omega * t);
  };
}

export function staggerFn(start: number = 0, interval: number = 0.1): (index: number) => number {
  return (index: number) => start + index * interval;
}

export function wrap(min: number, max: number, value: number): number {
  const range = max - min;
  return min + ((value - min) % range + range) % range;
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}