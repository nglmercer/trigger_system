import type { AlertElementAnimation } from '../styles/types';

export function getAnimationKeyframes(animation: AlertElementAnimation): any {
  const direction = animation.direction || 'up';
  const from = animation.from;
  const to = animation.to;
  
  switch (animation.type) {
    case 'fade':
      return { opacity: [0, 1] };
    case 'slide':
      const distance = from !== undefined ? (typeof from === 'string' ? from : `${from}px`) : '30px';
      switch (direction) {
        case 'up': return { translateY: [distance, 0], opacity: [0, 1] };
        case 'down': return { translateY: [`-${distance}`, 0], opacity: [0, 1] };
        case 'left': return { translateX: [distance, 0], opacity: [0, 1] };
        case 'right': return { translateX: [`-${distance}`, 0], opacity: [0, 1] };
      }
      break;
    case 'scale':
      return { scale: [from ?? 0, 1], opacity: [0, 1] };
    case 'rotate':
      return { rotate: [from ?? 0, to ?? 360] };
    case 'bounce':
      return {
        scale: [
          { value: 0.5, duration: 0 },
          { value: 1.1, duration: 400 },
          { value: 0.9, duration: 200 },
          { value: 1, duration: 200 }
        ],
        opacity: [0, 1]
      };
    case 'shake':
      return {
        translateX: [
          { value: -10, duration: 100 },
          { value: 10, duration: 100 },
          { value: -10, duration: 100 },
          { value: 10, duration: 100 },
          { value: 0, duration: 100 }
        ]
      };
    case 'pulse':
      return {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
        duration: 800,
        loop: true
      };
    case 'flip':
    case 'flipX':
      return { rotateY: [0, 90, 0] };
    case 'flipY':
      return { rotateX: [0, 90, 0] };
    default:
      return { opacity: [0, 1] };
  }
}

export function getOutKeyframes(
  animationType: AlertElementAnimation['type'] = 'fade',
  direction: string = 'up'
): any {
  switch (animationType) {
    case 'slide':
      const dist = '20px';
      switch (direction) {
        case 'up': return { translateY: [0, `-${dist}`], opacity: [1, 0] };
        case 'down': return { translateY: [0, dist], opacity: [1, 0] };
        case 'left': return { translateX: [0, `-${dist}`], opacity: [1, 0] };
        case 'right': return { translateX: [0, dist], opacity: [1, 0] };
        default: return { translateY: [0, `-${dist}`], opacity: [1, 0] };
      }
    case 'scale':
      return { scale: [1, 0.8], opacity: [1, 0] };
    case 'fade':
    default:
      return { opacity: [1, 0] };
  }
}
