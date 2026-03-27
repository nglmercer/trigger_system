import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { 
  AlertConfig, 
  AlertElement,
  AlertElementAnimation,
} from '../styles/types';
import { 
  styleToVariables 
} from '../styles/types';
import { 
  animateElement, 
  animateElementOut, 
  animateStagger,
} from '../animations';
import './AlertElement';
export const registerOrReplace = (tagName: string, newClass: any): void => {
  const existing = customElements.get(tagName) as any; // Cast to any here

  if (existing) {
    console.log(`[HMR] Patching <${tagName}>...`);

    try {
      const newProto = newClass.prototype;
      const existingProto = existing.prototype;

      // Copy prototype methods
      Object.getOwnPropertyNames(newProto).forEach((name) => {
        if (name !== 'constructor') {
          const descriptor = Object.getOwnPropertyDescriptor(newProto, name);
          if (descriptor) {
            Object.defineProperty(existingProto, name, descriptor);
          }
        }
      });

      // FIX: Use an explicit cast to access static members by string index
      const staticProps = ['styles', 'properties', 'elementProperties', 'shadowRootOptions'];
      
      staticProps.forEach((prop) => {
        // We cast 'existing' and 'newClass' to 'Record<string, any>' 
        // to allow string-based indexing
        const source = newClass as Record<string, any>;
        const target = existing as Record<string, any>;

        if (source[prop]) {
          target[prop] = source[prop];
        }
      });

      // Re-finalize Lit's internal metadata
      if (typeof existing.finalize === 'function') {
        existing.enabledWarnings = []; 
        existing.finalize();
      }

      // Request update for all live elements
      document.querySelectorAll(tagName).forEach((el: any) => {
        if (el.requestUpdate) el.requestUpdate();
      });
      
    } catch (e) {
      console.error(`[HMR] Patching failed for ${tagName}:`, e);
      window.location.reload(); 
    }
  } else {
    customElements.define(tagName, newClass);
  }
};
export class TriggerAlert extends LitElement {
  @property({ type: Object }) config!: AlertConfig;
  @state() private visible = false;
  @state() private elements: AlertElement[] = [];

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.style.cssText = this.getCSSVars();
    this.elements = this.config.elements || [];
    
    // Add host styles manually since we are in light DOM
    this.style.display = 'block';
    this.style.position = 'fixed';
    this.style.zIndex = '1000';
    if (this.config.style?.fontFamily) {
      this.style.fontFamily = this.config.style.fontFamily;
    }
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

  private async animateIn() {
    const alertEl = this.querySelector('.alert') as HTMLElement;
    if (!alertEl) return;

    const animation = this.config.style?.animation;
    const animationType = animation?.type || 'fade';
    const direction = animation?.direction || this.getAnimationDirection(this.config.style?.position);
    
    await animateElement(alertEl, {
      type: animationType as any,
      direction: direction as any,
      duration: animation?.duration || 0.4,
      easing: animation?.easing
    });
    
    const elementEls = this.querySelectorAll('alert-element');
    if (elementEls && elementEls.length > 0) {
      const elements = Array.from(elementEls) as HTMLElement[];
      await animateStagger(elements, { type: 'fade', duration: 0.3 }, 0.05);
    }
    
    await this.updateComplete;
    this.visible = true;
  }

  async dismiss() {
    const el = this.querySelector('.alert') as HTMLElement;
    if (el) {
      const animationType = this.config.style?.animation?.type || 'fade';
      const direction = this.config.style?.animation?.direction;
      await animateElementOut(el, animationType as any, direction as any, 0.3);
    }
    this.config.onComplete?.();
    this.remove();
  }

  render() {
    const position = this.config.style?.position || 'top';
    const positionStyles = this.getPositionStyles(position);
    
    return html`
      <style>
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
          backdrop-filter: var(--alert-backdrop-filter, none);
          pointer-events: auto;
        }
      </style>
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
registerOrReplace('trigger-alert', TriggerAlert);

declare global {
  interface HTMLElementTagNameMap {
    'trigger-alert': TriggerAlert;
  }
}