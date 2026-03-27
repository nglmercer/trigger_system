import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { animate } from 'animejs';
import type { 
  AlertConfig, 
  AlertElement,
  AlertStyle,
  AlertElementLayout,
  AlertElementAnimation,
  AlertElementStyle,
  AlertTextElement,
  AlertImageElement,
  AlertVideoElement,
  AlertAudioElement,
  AlertButtonElement,
  AlertContainerElement,
  AlertSpacerElement,
} from '../styles/types';
import { 
  elementStyleToCSS, 
  elementLayoutToCSS,
  styleToVariables 
} from '../styles/types';
import { 
  animateElement, 
  animateElementOut, 
  animateStagger,
  setupElementInteractions 
} from '../utils/animations';
import './AlertElement';

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
  `;

  @property({ type: Object }) config!: AlertConfig;
  @state() private visible = false;
  @state() private elements: AlertElement[] = [];

  connectedCallback() {
    super.connectedCallback();
    this.style.cssText = this.getCSSVars();
    this.elements = this.config.elements || [];
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

  private getPositionStyles(position?: string): string {
    const positionMap: Record<string, string> = {
      'top': 'top: 20px; left: 50%; transform: translateX(-50%);',
      'bottom': 'bottom: 20px; left: 50%; transform: translateX(-50%);',
      'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);',
      'top-left': 'top: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;'
    };
    return positionMap[position || 'top'] || positionMap['top'];
  }

  private getAnimationDirection(position?: string): string {
    if (!position) return 'up';
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

  private async animateIn() {
    const alertEl = this.shadowRoot?.querySelector('.alert') as HTMLElement;
    if (!alertEl) return;

    const animation = this.config.style?.animation;
    const animationType = animation?.type || 'fade';
    const direction = animation?.direction || this.getAnimationDirection(this.config.style?.position);
    const duration = animation?.duration || 0.3;
    const easing = this.parseEasing(animation?.easing);

    const animations: Record<string, any> = {
      fade: { opacity: [0, 1] },
      slide: {
        transform: [this.getSlideTransform(direction, -30), 'translateY(0)']
      },
      scale: { transform: [{ scale: 0.8 }, { scale: 1 }] },
      bounce: { transform: [{ scale: 0.5 }, { scale: 1.1 }, { scale: 1 }] }
    };

    //await animate(alertEl, animations[animationType], { duration, easing });
    
    const elementEls = this.shadowRoot?.querySelectorAll('alert-element');
    if (elementEls && elementEls.length > 0) {
      const elements = Array.from(elementEls) as HTMLElement[];
      await animateStagger(elements, { type: 'fade', duration: 0.2 }, 0.05);
    }
    
    await this.updateComplete;
    this.visible = true;
  }

  private getSlideTransform(direction: string, from: number): string {
    switch (direction) {
      case 'up': return `translateY(${from}px)`;
      case 'down': return `translateY(${-from}px)`;
      case 'left': return `translateX(${from}px)`;
      case 'right': return `translateX(${-from}px)`;
      default: return `translateY(${from}px)`;
    }
  }

  async dismiss() {
    const el = this.shadowRoot?.querySelector('.alert') as HTMLElement;
    if (el) {
      const animationType = this.config.style?.animation?.type || 'fade';
      const direction = this.config.style?.animation?.direction;
      await animateElementOut(el, animationType, direction as any, 0.2);
    }
    this.config.onComplete?.();
    this.remove();
  }

  render() {
    const position = this.config.style?.position || 'top';
    const positionStyles = this.getPositionStyles(position);
    
    return html`
      <div 
        class="alert ${position}" 
        style="position: fixed; ${positionStyles}"
      >
        ${this.elements.map(el => html`
          <alert-element .element="${el}"></alert-element>
        `)}
        ${this.config.dismissible ? html`
          <button 
            class="dismiss-btn" 
            style="position: absolute; top: 8px; right: 8px; background: transparent; border: none; cursor: pointer; font-size: 18px; color: inherit; opacity: 0.6;"
            @click="${this.dismiss}"
          >×</button>
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