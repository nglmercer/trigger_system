/**
 * Trigger Editor Icons
 * Centralized SVG icon components for the editor
 */

import { html, svg, type TemplateResult } from 'lit';

// ======================
// Icon Sizes
// ======================

export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

export const ICON_SIZES: Record<IconSize, number> = {
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

// ======================
// Icon Color
// ======================

export type IconColor = 'current' | 'primary' | 'danger' | 'success' | 'inherit';

export const ICON_COLORS: Record<IconColor, string> = {
  current: 'currentColor',
  primary: '#2563eb',
  danger: '#dc2626',
  success: '#16a34a',
  inherit: 'inherit',
};

// ======================
// Icon Templates
// ======================

/**
 * Plus icon - for add actions
 */
export function iconPlus(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `;
}

/**
 * Close/X icon - for closing modals
 */
export function iconX(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
}

/**
 * Edit/Pencil icon
 */
export function iconEdit(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  `;
}

/**
 * Trash/Delete icon
 */
export function iconTrash(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;
}

/**
 * Copy icon
 */
export function iconCopy(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
}

/**
 * File/Document icon
 */
export function iconFile(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>
  `;
}

/**
 * Download icon
 */
export function iconDownload(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  `;
}

/**
 * Check icon
 */
export function iconCheck(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
}

/**
 * Chevron Down icon
 */
export function iconChevronDown(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `;
}

/**
 * Chevron Right icon
 */
export function iconChevronRight(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;
}

/**
 * Alert/Warning icon
 */
export function iconAlert(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  `;
}

/**
 * Info icon
 */
export function iconInfo(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  `;
}

/**
 * Settings/Gear icon
 */
export function iconSettings(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  `;
}

/**
 * Eye icon - for preview/show
 */
export function iconEye(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `;
}

/**
 * Eye Off icon - for hide
 */
export function iconEyeOff(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  `;
}

/**
 * Play icon
 */
export function iconPlay(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  `;
}

/**
 * Pause icon
 */
export function iconPause(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
  `;
}

/**
 * Arrow Up icon
 */
export function iconArrowUp(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"></line>
      <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
  `;
}

/**
 * Arrow Down icon
 */
export function iconArrowDown(size: IconSize = 'md', color: IconColor = 'current'): TemplateResult {
  const s = ICON_SIZES[size];
  return svg`
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[color]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <polyline points="19 12 12 19 5 12"></polyline>
    </svg>
  `;
}

// Icon Component (Web Component)
export { IconComponent } from './components/icon.js';

// ======================
// Export all icons as an object for easy lookup
// ======================

export const ICONS = {
  plus: iconPlus,
  x: iconX,
  edit: iconEdit,
  trash: iconTrash,
  copy: iconCopy,
  file: iconFile,
  download: iconDownload,
  check: iconCheck,
  chevronDown: iconChevronDown,
  chevronRight: iconChevronRight,
  alert: iconAlert,
  info: iconInfo,
  settings: iconSettings,
  eye: iconEye,
  eyeOff: iconEyeOff,
  play: iconPlay,
  pause: iconPause,
  arrowUp: iconArrowUp,
  arrowDown: iconArrowDown,
} as const;

// ======================
// Type for icon names
// ======================

export type IconName = keyof typeof ICONS;
