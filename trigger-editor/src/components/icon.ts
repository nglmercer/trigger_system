/**
 * Icon Component
 * A simple web component for rendering icons by name
 */

import { LitElement, html, svg, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { IconName, IconSize, IconColor } from '../icons.js';
import { ICONS, ICON_SIZES, ICON_COLORS } from '../icons.js';

// Import shared styles
import { baseComponentStyles } from '../styles.js';

@customElement('editor-icon')
export class IconComponent extends LitElement {
  static override styles = css`
    ${baseComponentStyles}

    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    svg {
      display: block;
    }
  `;

  @property({ type: String })
  name: IconName = 'plus';

  @property({ type: String })
  size: IconSize = 'md';

  @property({ type: String })
  color: IconColor = 'current';

  override render() {
    const iconFn = ICONS[this.name];
    if (!iconFn) {
      return html`<span>Icon not found: ${this.name}</span>`;
    }
    return iconFn(this.size, this.color);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-icon': IconComponent;
  }
}
