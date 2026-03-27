import type {
  AlertConfig,
  AlertContent,
  AlertContentType,
  AlertStyle,
  AlertTextContent,
  AlertVideoContent,
  AlertAudioContent,
} from '../styles/types';

export class AlertBuilder {
  private config: Partial<AlertConfig> = {
    dismissible: true,
    duration: 5000,
  };

  id(id: string): this {
    this.config.id = id;
    return this;
  }

  name(name: string): this {
    this.config.name = name;
    return this;
  }

  text(content: string, markdown = false): this {
    const textContent: AlertTextContent = { type: 'text', content, markdown };
    this.addContent(textContent);
    return this;
  }

  video(src: string, options?: { autoplay?: boolean; loop?: boolean; muted?: boolean; poster?: string }): this {
    const videoContent: AlertVideoContent = {
      type: 'video',
      src,
      autoplay: options?.autoplay ?? true,
      loop: options?.loop ?? false,
      muted: options?.muted ?? true,
      poster: options?.poster,
    };
    this.addContent(videoContent);
    return this;
  }

  audio(src: string, options?: { autoplay?: boolean; loop?: boolean; volume?: number }): this {
    const audioContent: AlertAudioContent = {
      type: 'audio',
      src,
      autoplay: options?.autoplay ?? true,
      loop: options?.loop ?? false,
      volume: options?.volume ?? 1,
    };
    this.addContent(audioContent);
    return this;
  }

  private addContent(content: AlertContent): void {
    if (!this.config.content) {
      this.config.content = content;
    } else if (Array.isArray(this.config.content)) {
      this.config.content.push(content);
    } else {
      this.config.content = [this.config.content, content];
    }
  }

  style(style: AlertStyle): this {
    this.config.style = style;
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
    if (!this.config.content) {
      throw new Error('Alert content is required');
    }
    return this.config as AlertConfig;
  }
}