export { AlertBuilder, createAlert } from './builder/AlertBuilder';
export { TriggerAlert } from './components/TriggerAlert';
export { AlertElementComponent } from './components/AlertElement';
export { AlertBehaviorRegistry } from './registry/BehaviorRegistry';
export { AlertExporter, AlertStyleExporter } from './exporter';
export { 
  animateElement, 
  animateElementOut, 
  animateStagger,
  setupElementInteractions,
} from './animations';
export type { 
  AlertConfig, 
  AlertElement,
  AlertTextElement,
  AlertImageElement,
  AlertVideoElement,
  AlertAudioElement,
  AlertButtonElement,
  AlertContainerElement,
  AlertSpacerElement,
  AlertElementStyle,
  AlertElementLayout,
  AlertElementAnimation,
  AlertElementInteraction,
  AlertElementTransform,
  AlertElementFilter,
  AlertStyle,
  AlertStyleAnimation,
  AlertStyleVariables,
  FlexDirection,
  FlexWrap,
  JustifyContent,
  AlignItems,
} from './styles/types';
export { 
  styleToVariables,
  elementStyleToCSS,
  elementLayoutToCSS,
  transformToString,
  filterToString,
} from './styles/types';