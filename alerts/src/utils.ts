import type { ElementAnimation } from './types';
import type { Easing } from 'framer-motion';
import { RuleBuilder,RuleExporter,type ActionParams } from '../../src/index';
interface AnimationVariant {
  initial: { opacity?: number; x?: number; y?: number; scale?: number };
  animate: { opacity?: number; x?: number; y?: number; scale?: number };
  transition: {
    duration: number;
    ease?: Easing;
    type?: 'spring';
    stiffness?: number;
    damping?: number;
  };
}

export function getAnimationVariant(animation: ElementAnimation, duration: number): AnimationVariant {
  const dur = duration / 1000;
  
  switch (animation) {
    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: dur, ease: 'easeOut' }
      };
    case 'slideInLeft':
      return {
        initial: { opacity: 0, x: -100 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: dur, ease: 'easeOut' }
      };
    case 'slideInRight':
      return {
        initial: { opacity: 0, x: 100 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: dur, ease: 'easeOut' }
      };
    case 'slideInTop':
      return {
        initial: { opacity: 0, y: -100 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: dur, ease: 'easeOut' }
      };
    case 'slideInBottom':
      return {
        initial: { opacity: 0, y: 100 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: dur, ease: 'easeOut' }
      };
    case 'scaleIn':
      return {
        initial: { opacity: 0, scale: 0 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: dur, ease: 'easeOut' }
      };
    case 'bounce':
      return {
        initial: { opacity: 0, y: -50 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: dur, type: 'spring', stiffness: 300, damping: 20 }
      };
    case 'pulse':
      return {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: dur }
      };
    case 'shake':
      return {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: dur }
      };
    default:
      return {
        initial: {},
        animate: {},
        transition: { duration: dur }
      };
  }
}

export function generateId(prefix: string = 'el'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
export function buildRule(action: string, params: ActionParams) {
  const rule = new RuleBuilder()
    .withId('alert_' + generateId())
    .withName('Alert Rule')
    .withDescription('Alert Rule Description')
    .on('ALERT_TRIGGER')
    .do(action, params as ActionParams)
    .build();
  const yaml = RuleExporter.toYaml(rule);
  return {rule, yaml};
}
/*
    const blob = new Blob([yamlOutput], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trigger-alert-${alertConfig.name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
*/
export function downloadYaml(yaml: string, filename: string) {
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
export function downloadJson(json: string, filename: string) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}