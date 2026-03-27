import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import {
  type AlertElement,
  type AlertTextElement,
  type AlertImageElement,
  type AlertVideoElement,
  type AlertAudioElement,
  type AlertButtonElement,
  type AlertContainerElement,
  type AlertSpacerElement,
  type AlertElementStyle,
  type AlertCheckboxElement,
  type AlertElementLayout,
  type AlertElementAnimation,
  type AlertElementInteraction,
  elementStyleToCSS,
  elementLayoutToCSS,
  transformToString,
  filterToString,
} from '../styles/types';
import { animateElement, setupElementInteractions, getInitialAnimationStyles } from '../animations';
import { AlertBehaviorRegistry } from '../registry/BehaviorRegistry';

@customElement('alert-element')
export class AlertElementComponent extends LitElement {
  @property({ type: Object }) element!: AlertElement;
  @property({ type: Object }) parentLayout?: AlertElementLayout;
  @state() private mounted = false;

  protected createRenderRoot() {
    return this;
  }

  firstUpdated() {
    this.mounted = true;
    this.setupAnimations();
    this.setupInteractions();
  }

  private setupAnimations() {
    const el = this.querySelector('.element') as HTMLElement;
    if (!el) return;
    
    // Call onRender if defined (direct function call)
    if (this.element && (this.element as any).onRender) {
      (this.element as any).onRender(el);
    }

    // Execute behavior from registry if defined (JSON safe)
    if (this.element && (this.element as any).behavior) {
      AlertBehaviorRegistry.execute((this.element as any).behavior, el, (this.element as any).behaviorData);
    }

    const animatableTypes = ['text', 'image', 'video', 'audio', 'button', 'container', 'checkbox'];
    if (!animatableTypes.includes(this.element.type)) return;
    if (!('animation' in this.element)) return;
    
    const animation = (this.element as any).animation as AlertElementAnimation | undefined;
    if (!animation) return;
    
    this.updateComplete.then(() => {
      animateElement(el, animation);
    });
  }

  private setupInteractions() {
    const el = this.querySelector('.element') as HTMLElement;
    if (!el) return;
    
    const interactiveTypes = ['text', 'image', 'video', 'audio', 'button', 'container'];
    if (!interactiveTypes.includes(this.element.type)) return;
    if (!('interaction' in this.element)) return;
    
    const interaction = (this.element as any).interaction as AlertElementInteraction | undefined;
    if (!interaction) return;
    
    this.updateComplete.then(() => {
      setupElementInteractions(el, interaction);
    });
  }

  private parseMarkdown(text: string): string {
    let result = text
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    if (result.includes('<li>')) {
      result = `<ul>${result}</ul>`;
    }
    if (!result.startsWith('<') && result.includes('<br>')) {
      result = `<p>${result}</p>`;
    }
    return result;
  }

  private getElementStyle(): string {
    let style = elementStyleToCSS(this.element.style || {});
    
    if (this.element.type === 'spacer') {
      const size = (this.element as AlertSpacerElement).size;
      style += `; width: ${typeof size === 'number' ? `${size}px` : size}; height: ${typeof size === 'number' ? `${size}px` : size};`;
    }

    // Add initial animation styles to prevent flicker
    if ('animation' in this.element && this.element.animation) {
      const initial = getInitialAnimationStyles(this.element.animation);
      Object.entries(initial).forEach(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        style += `; ${cssKey}: ${value}`;
      });
    }
    
    return style;
  }

  private getLayoutStyle(): string {
    const layout = (this.element as AlertContainerElement).layout || this.parentLayout;
    if (!layout) return '';
    return elementLayoutToCSS(layout);
  }

  private renderText(element: AlertTextElement) {
    const content = element.markdown 
      ? this.parseMarkdown(element.content)
      : element.content;
    
    return element.markdown
      ? html`<div class="text markdown">${unsafeHTML(content)}</div>`
      : html`<div class="text">${content}</div>`;
  }

  private renderImage(element: AlertImageElement) {
    return html`<img src="${element.src}" alt="${element.alt || ''}" loading="lazy" />`;
  }

  private renderVideo(element: AlertVideoElement) {
    return html`
      <video
        src="${element.src}"
        ?autoplay="${element.autoplay}"
        ?loop="${element.loop}"
        ?muted="${element.muted}"
        poster="${element.poster || ''}"
        preload="${element.preload || 'auto'}"
      />
    `;
  }

  private renderCheckbox(element: AlertCheckboxElement) {
    return html`
      <div class="checkbox-wrapper ${element.checked ? 'checked' : ''}">
        <div class="checkmark">✓</div>
      </div>
    `;
  }

  private renderAudio(element: AlertAudioElement) {
    return html`
      <audio
        src="${element.src}"
        ?autoplay="${element.autoplay}"
        ?loop="${element.loop}"
        ?controls="${element.controls}"
      />
    `;
  }

  private renderButton(element: AlertButtonElement) {
    const handleClick = () => {
      if (!element.disabled && element.onClick) {
        element.onClick();
      }
    };

    return html`
      <button
        class="${element.variant || 'filled'}"
        ?disabled="${element.disabled}"
        @click="${handleClick}"
      >
        ${element.content}
      </button>
    `;
  }

  private renderContainer(element: AlertContainerElement) {
    return html`
      <div class="container" style="${elementLayoutToCSS(element.layout || {})}">
        ${element.children.map(child => html`
          <alert-element 
            id="${child.id}"
            .element="${child}" 
            .parentLayout="${element.layout}"
          ></alert-element>
        `)}
      </div>
    `;
  }

  private renderSpacer(element: AlertSpacerElement) {
    return html`<div class="spacer"></div>`;
  }

  render() {
    if (!this.element) return nothing;

    let content;
    switch (this.element.type) {
      case 'text':
        content = this.renderText(this.element as AlertTextElement);
        break;
      case 'image':
        content = this.renderImage(this.element as AlertImageElement);
        break;
      case 'video':
        content = this.renderVideo(this.element as AlertVideoElement);
        break;
      case 'audio':
        content = this.renderAudio(this.element as AlertAudioElement);
        break;
      case 'button':
        content = this.renderButton(this.element as AlertButtonElement);
        break;
      case 'container':
        content = this.renderContainer(this.element as AlertContainerElement);
        break;
      case 'spacer':
        content = this.renderSpacer(this.element as AlertSpacerElement);
        break;
      case 'checkbox':
        content = this.renderCheckbox(this.element as AlertCheckboxElement);
        break;
      default:
        content = nothing;
    }

    const layoutStyle = this.getLayoutStyle();
    const elementStyle = this.getElementStyle();
    const combinedStyle = [layoutStyle, elementStyle].filter(Boolean).join('; ');

    return html`
      <style>
        .element {
          box-sizing: border-box;
        }
        
        .text {
          white-space: pre-wrap;
          word-break: break-word;
        }
        
        .text.markdown strong { font-weight: 700; }
        .text.markdown em { font-style: italic; }
        .text.markdown code {
          background: rgba(0,0,0,0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
        }
        .text.markdown ul, .text.markdown ol { margin: 8px 0; padding-left: 20px; }
        .text.markdown li { margin: 4px 0; }
        .text.markdown blockquote {
          border-left: 3px solid currentColor;
          padding-left: 12px;
          margin: 8px 0;
          opacity: 0.8;
        }
        .text.markdown a { color: inherit; text-decoration: underline; }
        
        img { 
          max-width: 100%; 
          width: 100%;
          height: 100%;
          display: block; 
          object-fit: cover;
        }
        video, audio { max-width: 100%; width: 100%; }
        
        button {
          border: none;
          cursor: pointer;
          padding: 10px 20px;
          font-size: inherit;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        
        button.filled { background: #007bff; color: white; }
        button:hover { filter: brightness(1.1); }
        button:active { transform: scale(0.98); }
        button.outline { background: transparent; border: 2px solid #007bff; color: #007bff; }
        button.outline:hover { background: rgba(0, 123, 255, 0.1); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Checkbox Styles */
        .checkbox-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        
        .checkmark {
          color: white;
          opacity: 0;
          transform: scale(0.5);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .checkbox-wrapper.checked {
          background-color: #6366f1;
          border-color: #6366f1;
        }
        
        .checkbox-wrapper.checked .checkmark {
          opacity: 1;
          transform: scale(1);
        }
        
        .spacer { flex-shrink: 0; }
      </style>
      <div 
        id="${this.element.id}"
        class="element ${this.element.type}"
        style="${combinedStyle}"
      >
        ${content}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'alert-element': AlertElementComponent;
  }
}