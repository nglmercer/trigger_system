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
  type AlertElementLayout,
  type AlertElementAnimation,
  type AlertElementInteraction,
  elementStyleToCSS,
  elementLayoutToCSS,
  transformToString,
  filterToString,
} from '../styles/types';
import { animateElement, setupElementInteractions } from '../animations';

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
    
    // Call onRender if defined
    if (this.element && (this.element as any).onRender) {
      (this.element as any).onRender(el);
    }

    const animatableTypes = ['text', 'image', 'video', 'audio', 'button', 'container'];
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
      <div class="container">
        ${element.children.map(child => html`
          <alert-element
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
        button.filled:hover { background: #0056b3; }
        button.outline { background: transparent; border: 2px solid #007bff; color: #007bff; }
        button.outline:hover { background: rgba(0, 123, 255, 0.1); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .spacer { flex-shrink: 0; }
      </style>
      <div 
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