import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleToVariables, type AlertConfig, type AlertContent } from '../styles/types';
import { animate } from 'motion';

@customElement('trigger-alert')
export class TriggerAlert extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: fixed;
      z-index: 1000;
      font-family: var(--alert-font-family, system-ui, sans-serif);
    }

    .alert {
      background: var(--alert-bg, #fff);
      color: var(--alert-color, #000);
      border-radius: var(--alert-radius, 8px);
      padding: var(--alert-padding, 16px);
      margin: var(--alert-margin, 8px);
      width: var(--alert-width, auto);
      max-width: var(--alert-max-width, 400px);
      box-shadow: var(--alert-box-shadow, 0 4px 12px rgba(0,0,0,0.15));
      border: var(--alert-border, none);
    }

    .alert.text {
      font-size: var(--alert-font-size, 16px);
      font-weight: var(--alert-font-weight, 400);
      text-align: var(--alert-text-align, left);
    }

    .dismiss-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 18px;
      color: inherit;
      opacity: 0.6;
    }

    .dismiss-btn:hover {
      opacity: 1;
    }
  `;

  @property({ type: Object }) config!: AlertConfig;
  @state() private visible = false;

  connectedCallback() {
    super.connectedCallback();
    this.style.cssText = this.getCSSVars();
  }

  private getCSSVars(): string {
    if (!this.config.style) return '';
    const vars = styleToVariables(this.config.style);
    return Object.entries(vars)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  firstUpdated() {
    this.animateIn();
    if (this.config.duration && this.config.duration > 0) {
      setTimeout(() => this.dismiss(), this.config.duration);
    }
  }

  private getDirection(dir: string): string {
    const map: Record<string, string> = { up: 'Y', down: 'Y', left: 'X', right: 'X' };
    return map[dir] || 'Y';
  }

  private async animateIn() {
    const el = this.shadowRoot?.querySelector('.alert') as HTMLElement;
    if (!el) return;

    const animationType = this.config.style?.animation?.type || 'fade';
    const direction = this.config.style?.animation?.direction || 'up';
    const duration = this.config.style?.animation?.duration || 0.3;

    const animations: Record<string, any> = {
      fade: { opacity: [0, 1] },
      slide: {
        transform: [`translate${this.getDirection(direction)}(-20px)`, 'translateY(0)']
      },
      scale: { transform: [{ scale: 0.8 }, { scale: 1 }] },
      bounce: { transform: [{ scale: 0.5 }, { scale: 1.1 }, { scale: 1 }] }
    };

    await animate(el, animations[animationType], { duration, easing: 'ease-out' });
    this.visible = true;
  }

  async dismiss() {
    const el = this.shadowRoot?.querySelector('.alert') as HTMLElement;
    if (el) {
      await animate(el, { opacity: 0, transform: 'translateY(-10px)' }, { duration: 0.2 });
    }
    this.config.onComplete?.();
    this.remove();
  }

  private renderContent(content: AlertContent) {
    switch (content.type) {
      case 'text':
        return content.markdown ? html`<div class="text markdown">${content.content}</div>` 
                                : html`<div class="text">${content.content}</div>`;
      case 'video':
        return html`
          <video 
            src="${content.src}" 
            ?autoplay="${content.autoplay}" 
            ?loop="${content.loop}" 
            ?muted="${content.muted}"
            poster="${content.poster || ''}"
          ></video>`;
      case 'audio':
        return html`
          <audio 
            src="${content.src}" 
            ?autoplay="${content.autoplay}" 
            ?loop="${content.loop}"
          ></audio>`;
    }
  }

  render() {
    const contents = Array.isArray(this.config.content) ? this.config.content : [this.config.content];
    const position = this.config.style?.position || 'top';
    
    return html`
      <div 
        class="alert ${position}" 
        style="position: ${position === 'center' ? 'fixed' : 'fixed'}; ${position === 'top' ? 'top: 10px;' : position === 'bottom' ? 'bottom: 10px;' : 'top: 50%; left: 50%; transform: translate(-50%, -50%);'}"
      >
        ${contents.map(c => this.renderContent(c))}
        ${this.config.dismissible ? html`
          <button class="dismiss-btn" @click="${this.dismiss}">×</button>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'trigger-alert': TriggerAlert;
  }
}