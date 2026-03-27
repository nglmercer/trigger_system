import type { AnimationOptions, ScrollOffset } from 'motion';

export type AlertElementType = 'text' | 'image' | 'video' | 'audio' | 'button' | 'container' | 'spacer';

export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type FlexWrap = 'wrap' | 'nowrap' | 'wrap-reverse';
export type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
export type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';

export interface AlertElementTransform {
  x?: number | string;
  y?: number | string;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  rotateX?: number;
  rotateY?: number;
  skewX?: number;
  skewY?: number;
}

export interface AlertElementFilter {
  brightness?: number;
  contrast?: number;
  grayscale?: number;
  hueRotate?: number;
  invert?: number;
  opacity?: number;
  saturate?: number;
  sepia?: number;
  blur?: number;
  dropShadow?: string;
}

export interface AlertElementStyle {
  background?: string;
  color?: string;
  borderRadius?: number | string;
  padding?: number | string;
  margin?: number | string;
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  fontSize?: number | string;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number | string;
  letterSpacing?: number | string;
  textDecoration?: string;
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
  border?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  boxShadow?: string;
  opacity?: number;
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';
  cursor?: 'auto' | 'default' | 'pointer' | 'not-allowed' | 'grab' | 'grabbing';
  zIndex?: number;
  transform?: AlertElementTransform;
  filter?: AlertElementFilter;
  flex?: number | string;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | string;
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
}

export interface AlertElementAnimation {
  type: 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce' | 'shake' | 'pulse' | 'flip' | 'flipX' | 'flipY';
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  delay?: number;
  easing?: string;
  repeat?: number;
  repeatType?: 'loop' | 'reverse' | 'mirror';
  from?: number | string;
  to?: number | string;
  keyframes?: number[] | string[];
  scrollTrigger?: {
    trigger: string;
    start?: string;
    end?: string;
    scrub?: boolean | number;
    pin?: boolean;
    markers?: boolean;
  };
}

export interface AlertElementInteraction {
  hover?: {
    animation?: AlertElementAnimation;
    style?: Partial<AlertElementStyle>;
    scale?: number;
    rotate?: number;
    translate?: { x?: number; y?: number };
    filter?: Partial<AlertElementFilter>;
  };
  press?: {
    animation?: AlertElementAnimation;
    scale?: number;
    rotate?: number;
    translate?: { x?: number; y?: number };
  };
  focus?: {
    animation?: AlertElementAnimation;
    style?: Partial<AlertElementStyle>;
  };
}

export interface AlertElementLayout {
  display?: 'block' | 'flex' | 'grid' | 'inline' | 'inline-block' | 'inline-flex' | 'none';
  flexDirection?: FlexDirection;
  flexWrap?: FlexWrap;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  alignContent?: JustifyContent;
  gap?: number | string;
  columnGap?: number | string;
  rowGap?: number | string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}

export interface AlertTextElement {
  type: 'text';
  id: string;
  content: string;
  markdown?: boolean;
  style?: AlertElementStyle;
  animation?: AlertElementAnimation;
  interaction?: AlertElementInteraction;
}

export interface AlertImageElement {
  type: 'image';
  id: string;
  src: string;
  alt?: string;
  style?: AlertElementStyle;
  animation?: AlertElementAnimation;
  interaction?: AlertElementInteraction;
}

export interface AlertVideoElement {
  type: 'video';
  id: string;
  src: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
  preload?: 'auto' | 'metadata' | 'none';
  style?: AlertElementStyle;
  animation?: AlertElementAnimation;
  interaction?: AlertElementInteraction;
}

export interface AlertAudioElement {
  type: 'audio';
  id: string;
  src: string;
  autoplay?: boolean;
  loop?: boolean;
  volume?: number;
  controls?: boolean;
  style?: AlertElementStyle;
  animation?: AlertElementAnimation;
  interaction?: AlertElementInteraction;
}

export interface AlertButtonElement {
  type: 'button';
  id: string;
  content: string;
  variant?: 'filled' | 'outline' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  style?: AlertElementStyle;
  animation?: AlertElementAnimation;
  interaction?: AlertElementInteraction;
}

export interface AlertContainerElement {
  type: 'container';
  id: string;
  children: AlertElement[];
  layout?: AlertElementLayout;
  style?: AlertElementStyle;
  animation?: AlertElementAnimation;
  interaction?: AlertElementInteraction;
}

export interface AlertSpacerElement {
  type: 'spacer';
  id: string;
  size: number | string;
  style?: AlertElementStyle;
}

export type AlertElement = 
  | AlertTextElement 
  | AlertImageElement 
  | AlertVideoElement 
  | AlertAudioElement 
  | AlertButtonElement 
  | AlertContainerElement 
  | AlertSpacerElement;

export interface AlertStyleAnimation {
  type: 'fade' | 'slide' | 'scale' | 'bounce';
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  easing?: string;
  animateText?: boolean;
}

export interface AlertStyle {
  position?: 'top' | 'bottom' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  background?: string;
  color?: string;
  borderRadius?: number | string;
  padding?: number | string;
  margin?: number | string;
  width?: number | string;
  maxWidth?: number | string;
  fontSize?: number | string;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right';
  boxShadow?: string;
  border?: string;
  zIndex?: number;
  animation?: AlertStyleAnimation;
  overlay?: boolean;
}

export interface AlertConfig {
  id: string;
  name?: string;
  elements: AlertElement[];
  style?: AlertStyle;
  duration?: number;
  dismissible?: boolean;
  onDismiss?: () => void;
  onComplete?: () => void;
}

export interface AlertStyleVariables {
  '--alert-bg'?: string;
  '--alert-color'?: string;
  '--alert-radius'?: string;
  '--alert-padding'?: string;
  '--alert-margin'?: string;
  '--alert-width'?: string;
  '--alert-max-width'?: string;
  '--alert-font-size'?: string;
  '--alert-font-family'?: string;
  '--alert-font-weight'?: string;
  '--alert-text-align'?: string;
  '--alert-box-shadow'?: string;
  '--alert-border'?: string;
  '--alert-z-index'?: string;
}

export function styleToVariables(style: AlertStyle): AlertStyleVariables {
  const vars: AlertStyleVariables = {};
  
  if (style.background) vars['--alert-bg'] = style.background;
  if (style.color) vars['--alert-color'] = style.color;
  if (style.borderRadius !== undefined) vars['--alert-radius'] = String(style.borderRadius);
  if (style.padding !== undefined) vars['--alert-padding'] = String(style.padding);
  if (style.margin !== undefined) vars['--alert-margin'] = String(style.margin);
  if (style.width !== undefined) vars['--alert-width'] = String(style.width);
  if (style.maxWidth !== undefined) vars['--alert-max-width'] = String(style.maxWidth);
  if (style.fontSize !== undefined) vars['--alert-font-size'] = String(style.fontSize);
  if (style.fontFamily) vars['--alert-font-family'] = style.fontFamily;
  if (style.fontWeight !== undefined) vars['--alert-font-weight'] = String(style.fontWeight);
  if (style.textAlign) vars['--alert-text-align'] = style.textAlign;
  if (style.boxShadow) vars['--alert-box-shadow'] = style.boxShadow;
  if (style.border) vars['--alert-border'] = style.border;
  if (style.zIndex !== undefined) vars['--alert-z-index'] = String(style.zIndex);
  
  return vars;
}

export function transformToString(transform: AlertElementTransform): string {
  const parts: string[] = [];
  if (transform.x !== undefined) parts.push(`translateX(${typeof transform.x === 'number' ? `${transform.x}px` : transform.x})`);
  if (transform.y !== undefined) parts.push(`translateY(${typeof transform.y === 'number' ? `${transform.y}px` : transform.y})`);
  if (transform.scale !== undefined) parts.push(`scale(${transform.scale})`);
  if (transform.scaleX !== undefined) parts.push(`scaleX(${transform.scaleX})`);
  if (transform.scaleY !== undefined) parts.push(`scaleY(${transform.scaleY})`);
  if (transform.rotate !== undefined) parts.push(`rotate(${transform.rotate}deg)`);
  if (transform.rotateX !== undefined) parts.push(`rotateX(${transform.rotateX}deg)`);
  if (transform.rotateY !== undefined) parts.push(`rotateY(${transform.rotateY}deg)`);
  if (transform.skewX !== undefined) parts.push(`skewX(${transform.skewX}deg)`);
  if (transform.skewY !== undefined) parts.push(`skewY(${transform.skewY}deg)`);
  return parts.join(' ');
}

export function filterToString(filter: AlertElementFilter): string {
  const parts: string[] = [];
  if (filter.brightness !== undefined) parts.push(`brightness(${filter.brightness})`);
  if (filter.contrast !== undefined) parts.push(`contrast(${filter.contrast})`);
  if (filter.grayscale !== undefined) parts.push(`grayscale(${filter.grayscale})`);
  if (filter.hueRotate !== undefined) parts.push(`hue-rotate(${filter.hueRotate}deg)`);
  if (filter.invert !== undefined) parts.push(`invert(${filter.invert})`);
  if (filter.opacity !== undefined) parts.push(`opacity(${filter.opacity})`);
  if (filter.saturate !== undefined) parts.push(`saturate(${filter.saturate})`);
  if (filter.sepia !== undefined) parts.push(`sepia(${filter.sepia})`);
  if (filter.blur !== undefined) parts.push(`blur(${filter.blur}px)`);
  if (filter.dropShadow) parts.push(`drop-shadow(${filter.dropShadow})`);
  return parts.join(' ');
}

export function elementStyleToCSS(style: AlertElementStyle): string {
  const css: string[] = [];
  
  if (style.background) css.push(`background: ${style.background}`);
  if (style.color) css.push(`color: ${style.color}`);
  if (style.borderRadius !== undefined) css.push(`border-radius: ${String(style.borderRadius)}`);
  if (style.padding !== undefined) css.push(`padding: ${String(style.padding)}`);
  if (style.margin !== undefined) css.push(`margin: ${String(style.margin)}`);
  if (style.width !== undefined) css.push(`width: ${String(style.width)}`);
  if (style.height !== undefined) css.push(`height: ${String(style.height)}`);
  if (style.minWidth !== undefined) css.push(`min-width: ${String(style.minWidth)}`);
  if (style.maxWidth !== undefined) css.push(`max-width: ${String(style.maxWidth)}`);
  if (style.minHeight !== undefined) css.push(`min-height: ${String(style.minHeight)}`);
  if (style.maxHeight !== undefined) css.push(`max-height: ${String(style.maxHeight)}`);
  if (style.fontSize !== undefined) css.push(`font-size: ${String(style.fontSize)}`);
  if (style.fontFamily) css.push(`font-family: ${style.fontFamily}`);
  if (style.fontWeight !== undefined) css.push(`font-weight: ${String(style.fontWeight)}`);
  if (style.textAlign) css.push(`text-align: ${style.textAlign}`);
  if (style.lineHeight !== undefined) css.push(`line-height: ${String(style.lineHeight)}`);
  if (style.letterSpacing !== undefined) css.push(`letter-spacing: ${String(style.letterSpacing)}`);
  if (style.textDecoration) css.push(`text-decoration: ${style.textDecoration}`);
  if (style.textTransform) css.push(`text-transform: ${style.textTransform}`);
  if (style.border) css.push(`border: ${style.border}`);
  if (style.borderTop) css.push(`border-top: ${style.borderTop}`);
  if (style.borderRight) css.push(`border-right: ${style.borderRight}`);
  if (style.borderBottom) css.push(`border-bottom: ${style.borderBottom}`);
  if (style.borderLeft) css.push(`border-left: ${style.borderLeft}`);
  if (style.boxShadow) css.push(`box-shadow: ${style.boxShadow}`);
  if (style.opacity !== undefined) css.push(`opacity: ${style.opacity}`);
  if (style.overflow) css.push(`overflow: ${style.overflow}`);
  if (style.overflowX) css.push(`overflow-x: ${style.overflowX}`);
  if (style.overflowY) css.push(`overflow-y: ${style.overflowY}`);
  if (style.cursor) css.push(`cursor: ${style.cursor}`);
  if (style.zIndex !== undefined) css.push(`z-index: ${style.zIndex}`);
  if (style.flex !== undefined) css.push(`flex: ${String(style.flex)}`);
  if (style.flexGrow !== undefined) css.push(`flex-grow: ${style.flexGrow}`);
  if (style.flexShrink !== undefined) css.push(`flex-shrink: ${style.flexShrink}`);
  if (style.flexBasis !== undefined) css.push(`flex-basis: ${String(style.flexBasis)}`);
  if (style.alignSelf) css.push(`align-self: ${style.alignSelf}`);
  
  if (style.transform) {
    const transformStr = transformToString(style.transform);
    if (transformStr) css.push(`transform: ${transformStr}`);
  }
  
  if (style.filter) {
    const filterStr = filterToString(style.filter);
    if (filterStr) css.push(`filter: ${filterStr}`);
  }
  
  return css.join('; ');
}

export function elementLayoutToCSS(layout: AlertElementLayout): string {
  const css: string[] = [];
  
  if (layout.display) css.push(`display: ${layout.display}`);
  if (layout.flexDirection) css.push(`flex-direction: ${layout.flexDirection}`);
  if (layout.flexWrap) css.push(`flex-wrap: ${layout.flexWrap}`);
  if (layout.justifyContent) css.push(`justify-content: ${layout.justifyContent}`);
  if (layout.alignItems) css.push(`align-items: ${layout.alignItems}`);
  if (layout.alignContent) css.push(`align-content: ${layout.alignContent}`);
  if (layout.gap !== undefined) css.push(`gap: ${String(layout.gap)}`);
  if (layout.columnGap !== undefined) css.push(`column-gap: ${String(layout.columnGap)}`);
  if (layout.rowGap !== undefined) css.push(`row-gap: ${String(layout.rowGap)}`);
  if (layout.gridTemplateColumns) css.push(`grid-template-columns: ${layout.gridTemplateColumns}`);
  if (layout.gridTemplateRows) css.push(`grid-template-rows: ${layout.gridTemplateRows}`);
  if (layout.gridColumn) css.push(`grid-column: ${layout.gridColumn}`);
  if (layout.gridRow) css.push(`grid-row: ${layout.gridRow}`);
  if (layout.position) css.push(`position: ${layout.position}`);
  if (layout.top !== undefined) css.push(`top: ${String(layout.top)}`);
  if (layout.right !== undefined) css.push(`right: ${String(layout.right)}`);
  if (layout.bottom !== undefined) css.push(`bottom: ${String(layout.bottom)}`);
  if (layout.left !== undefined) css.push(`left: ${String(layout.left)}`);
  
  return css.join('; ');
}