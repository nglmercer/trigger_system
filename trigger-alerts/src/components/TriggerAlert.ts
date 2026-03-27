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

  private getPositionStyles(position: string): string {
    const positionMap: Record<string, string> = {
      'top': 'top: 20px; left: 50%; transform: translateX(-50%);',
      'bottom': 'bottom: 20px; left: 50%; transform: translateX(-50%);',
      'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);',
      'top-left': 'top: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;'
    };
    return positionMap[position] || positionMap['top'];
  }

  private getAnimationDirection(position: string): string {
    if (position.includes('top')) return 'down';
    if (position.includes('bottom')) return 'up';
    return 'up';
  }

  private parseEasing(easing?: string): any {
    if (!easing) return 'ease-out';
    if (easing.startsWith('spring(')) {
      const match = easing.match(/spring\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const [, stiffness, damping, mass] = match;
        return { stiffness: Number(stiffness), damping: Number(damping), mass: Number(mass) };
      }
    }
    return easing;
  }

  private parseMarkdown(text: string): string {
    let result = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n/g, '<br>');
    if (result.includes('<li>')) {
      result = `<ul>${result}</ul>`;
    }
    return result;
  }

  private async animateTextIn(el: HTMLElement) {
    const textEl = el.querySelector('.text') as HTMLElement;
    if (!textEl || !textEl.textContent) return;
    
    const chars = textEl.textContent.split('');
    textEl.innerHTML = '';
    textEl.style.whiteSpace = 'pre-wrap';
    
    const span = document.createElement('span');
    span.style.display = 'inline';
    textEl.appendChild(span);
    
    for (let i = 0; i < chars.length; i++) {
      span.textContent += chars[i];
      await new Promise(r => setTimeout(r, 15));
    }
  }

  private async animateIn() {
    const el = this.shadowRoot?.querySelector('.alert') as HTMLElement;
    if (!el) return;

    const animationType = this.config.style?.animation?.type || 'fade';
    const direction = this.config.style?.animation?.direction || this.getAnimationDirection(this.config.style?.position || 'top');
    const duration = this.config.style?.animation?.duration || 0.3;
    const easing = this.config.style?.animation?.easing ? 
      this.config.style.animation.easing as any : 'ease-out';

    const animations: Record<string, any> = {
      fade: { opacity: [0, 1] },
      slide: {
        transform: [`translate${this.getDirection(direction)}(-30px)`, 'translateY(0)']
      },
      scale: { transform: [{ scale: 0.8 }, { scale: 1 }] },
      bounce: { transform: [{ scale: 0.5 }, { scale: 1.1 }, { scale: 1 }] }
    };

    await animate(el, animations[animationType], { duration, easing });
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
    const positionStyles = this.getPositionStyles(position);
    
    return html`
      <div 
        class="alert ${position}" 
        style="position: fixed; ${positionStyles}"
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