import type {
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
  AlertStyle,
} from '../styles/types';

let elementIdCounter = 0;
function generateId(): string {
  return `el-${Date.now()}-${++elementIdCounter}`;
}

export class AlertBuilder {
  private config: Partial<AlertConfig> = {
    dismissible: true,
    duration: 5000,
    elements: [],
  };

  id(id: string): this {
    this.config.id = id;
    return this;
  }

  name(name: string): this {
    this.config.name = name;
    return this;
  }

  text(content: string, options?: {
    markdown?: boolean;
    style?: AlertElementStyle;
    animation?: AlertElementAnimation;
    interaction?: AlertElementInteraction;
  }): this {
    const textEl: AlertTextElement = {
      type: 'text',
      id: generateId(),
      content,
      markdown: options?.markdown,
      style: options?.style,
      animation: options?.animation,
      interaction: options?.interaction,
    };
    this.addElement(textEl);
    return this;
  }

  image(src: string, alt?: string, options?: {
    style?: AlertElementStyle;
    animation?: AlertElementAnimation;
    interaction?: AlertElementInteraction;
  }): this {
    const imgEl: AlertImageElement = {
      type: 'image',
      id: generateId(),
      src,
      alt,
      style: options?.style,
      animation: options?.animation,
      interaction: options?.interaction,
    };
    this.addElement(imgEl);
    return this;
  }

  video(src: string, options?: {
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    poster?: string;
    preload?: 'auto' | 'metadata' | 'none';
    style?: AlertElementStyle;
    animation?: AlertElementAnimation;
    interaction?: AlertElementInteraction;
  }): this {
    const videoEl: AlertVideoElement = {
      type: 'video',
      id: generateId(),
      src,
      autoplay: options?.autoplay ?? true,
      loop: options?.loop ?? false,
      muted: options?.muted ?? true,
      poster: options?.poster,
      preload: options?.preload,
      style: options?.style,
      animation: options?.animation,
      interaction: options?.interaction,
    };
    this.addElement(videoEl);
    return this;
  }

  audio(src: string, options?: {
    autoplay?: boolean;
    loop?: boolean;
    volume?: number;
    controls?: boolean;
    style?: AlertElementStyle;
    animation?: AlertElementAnimation;
    interaction?: AlertElementInteraction;
  }): this {
    const audioEl: AlertAudioElement = {
      type: 'audio',
      id: generateId(),
      src,
      autoplay: options?.autoplay ?? true,
      loop: options?.loop ?? false,
      volume: options?.volume ?? 1,
      controls: options?.controls,
      style: options?.style,
      animation: options?.animation,
      interaction: options?.interaction,
    };
    this.addElement(audioEl);
    return this;
  }

  button(content: string, onClick?: () => void, options?: {
    variant?: 'filled' | 'outline' | 'ghost';
    disabled?: boolean;
    style?: AlertElementStyle;
    animation?: AlertElementAnimation;
    interaction?: AlertElementInteraction;
  }): this {
    const btnEl: AlertButtonElement = {
      type: 'button',
      id: generateId(),
      content,
      variant: options?.variant,
      onClick,
      disabled: options?.disabled,
      style: options?.style,
      animation: options?.animation,
      interaction: options?.interaction,
    };
    this.addElement(btnEl);
    return this;
  }

  container(children: AlertElement[], options?: {
    layout?: AlertElementLayout;
    style?: AlertElementStyle;
    animation?: AlertElementAnimation;
    interaction?: AlertElementInteraction;
  }): this {
    const containerEl: AlertContainerElement = {
      type: 'container',
      id: generateId(),
      children,
      layout: options?.layout,
      style: options?.style,
      animation: options?.animation,
      interaction: options?.interaction,
    };
    this.addElement(containerEl);
    return this;
  }

  spacer(size: number | string, style?: AlertElementStyle): this {
    const spacerEl: AlertSpacerElement = {
      type: 'spacer',
      id: generateId(),
      size,
      style,
    };
    this.addElement(spacerEl);
    return this;
  }

  addElement(element: AlertElement): void {
    if (!this.config.elements) {
      this.config.elements = [];
    }
    this.config.elements.push(element);
  }

  style(style: AlertStyle): this {
    this.config.style = style;
    return this;
  }

  position(position: AlertStyle['position']): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.position = position;
    return this;
  }

  background(background: string): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.background = background;
    return this;
  }

  color(color: string): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.color = color;
    return this;
  }

  borderRadius(radius: number | string): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.borderRadius = radius;
    return this;
  }

  padding(padding: number | string): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.padding = padding;
    return this;
  }

  margin(margin: number | string): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.margin = margin;
    return this;
  }

  width(width: number | string): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.width = width;
    return this;
  }

  maxWidth(maxWidth: number | string): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.maxWidth = maxWidth;
    return this;
  }

  fontSize(fontSize: number | string): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.fontSize = fontSize;
    return this;
  }

  fontFamily(fontFamily: string): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.fontFamily = fontFamily;
    return this;
  }

  fontWeight(fontWeight: string | number): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.fontWeight = fontWeight;
    return this;
  }

  boxShadow(boxShadow: string): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.boxShadow = boxShadow;
    return this;
  }

  border(border: string): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.border = border;
    return this;
  }

  zIndex(zIndex: number): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.zIndex = zIndex;
    return this;
  }

  animation(animation: AlertStyle['animation']): this {
    if (!this.config.style) this.config.style = {};
    this.config.style.animation = animation;
    return this;
  }

  duration(ms: number): this {
    this.config.duration = ms;
    return this;
  }

  dismissible(dismissible: boolean): this {
    this.config.dismissible = dismissible;
    return this;
  }

  onDismiss(callback: () => void): this {
    this.config.onDismiss = callback;
    return this;
  }

  onComplete(callback: () => void): this {
    this.config.onComplete = callback;
    return this;
  }

  build(): AlertConfig {
    if (!this.config.id) {
      throw new Error('Alert ID is required');
    }
    if (!this.config.elements || this.config.elements.length === 0) {
      throw new Error('At least one element is required');
    }
    return this.config as AlertConfig;
  }
}

export function createAlert(id: string): AlertBuilder {
  return new AlertBuilder().id(id);
}