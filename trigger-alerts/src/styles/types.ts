export type AlertContentType = 'text' | 'video' | 'audio';

export interface AlertTextContent {
  type: 'text';
  content: string;
  markdown?: boolean;
}

export interface AlertVideoContent {
  type: 'video';
  src: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
}

export interface AlertAudioContent {
  type: 'audio';
  src: string;
  autoplay?: boolean;
  loop?: boolean;
  volume?: number;
}

export type AlertContent = AlertTextContent | AlertVideoContent | AlertAudioContent;

export interface AlertStyleAnimation {
  type: 'fade' | 'slide' | 'scale' | 'bounce';
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  easing?: string;
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
  content: AlertContent | AlertContent[];
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