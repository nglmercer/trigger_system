import YAML from 'yaml';
import type { AlertConfig, AlertStyle } from './styles/types';

export interface CleanAlertConfig {
  id: string;
  name?: string;
  elements?: any[];
  style?: Record<string, any>;
  duration?: number;
  dismissible?: boolean;
}

function cleanElement(el: any): any {
  const cleaned: any = { type: el.type, id: el.id };
  
  if (el.content !== undefined) cleaned.content = el.content;
  if (el.src !== undefined) cleaned.src = el.src;
  if (el.alt !== undefined) cleaned.alt = el.alt;
  if (el.markdown !== undefined) cleaned.markdown = el.markdown;
  if (el.style) cleaned.style = typeof el.style === 'function' ? undefined : el.style;
  if (el.behavior) cleaned.behavior = el.behavior;
  if (el.behaviorData) cleaned.behaviorData = el.behaviorData;
  if (el.layout) cleaned.layout = el.layout;
  if (el.animation) cleaned.animation = el.animation;
  if (el.interaction) cleaned.interaction = el.interaction;
  
  if (el.children && Array.isArray(el.children)) {
    cleaned.children = el.children.map(cleanElement);
  }
  
  return cleaned;
}

function cleanAlert(alert: AlertConfig): CleanAlertConfig {
  const cleaned: CleanAlertConfig = { id: alert.id };
  
  if (alert.name) cleaned.name = alert.name;
  if (alert.elements && alert.elements.length > 0) {
    cleaned.elements = alert.elements.map(cleanElement);
  }
  if (alert.duration !== undefined) cleaned.duration = alert.duration;
  if (alert.dismissible !== undefined) cleaned.dismissible = alert.dismissible;
  if (alert.style) cleaned.style = alert.style as Record<string, any>;
  
  return cleaned;
}

export class AlertExporter {
  static toYaml(alert: AlertConfig | AlertConfig[]): string {
    const data = Array.isArray(alert) ? alert.map(cleanAlert) : cleanAlert(alert);
    return YAML.stringify(data, { indent: 2, lineWidth: 0 });
  }

  static toJson(alert: AlertConfig | AlertConfig[], pretty = true): string {
    const data = Array.isArray(alert) ? alert.map(cleanAlert) : cleanAlert(alert);
    return JSON.stringify(data, null, pretty ? 2 : 0);
  }

  static async toYamlFile(alerts: AlertConfig | AlertConfig[], filePath: string): Promise<void> {
    const yaml = this.toYaml(alerts);
    await Bun.write(filePath, yaml);
  }

  static async toJsonFile(alerts: AlertConfig | AlertConfig[], filePath: string): Promise<void> {
    const json = this.toJson(alerts);
    await Bun.write(filePath, json);
  }
}

export class AlertStyleExporter {
  static toVariables(style: AlertStyle): Record<string, string> {
    const vars: Record<string, string> = {};
    
    if (style.position) vars['position'] = style.position;
    if (style.background) vars['background'] = style.background;
    if (style.color) vars['color'] = style.color;
    if (style.borderRadius !== undefined) vars['border-radius'] = String(style.borderRadius);
    if (style.padding !== undefined) vars['padding'] = String(style.padding);
    if (style.margin !== undefined) vars['margin'] = String(style.margin);
    if (style.width !== undefined) vars['width'] = String(style.width);
    if (style.maxWidth !== undefined) vars['max-width'] = String(style.maxWidth);
    if (style.fontSize !== undefined) vars['font-size'] = String(style.fontSize);
    if (style.fontFamily) vars['font-family'] = style.fontFamily;
    if (style.fontWeight !== undefined) vars['font-weight'] = String(style.fontWeight);
    if (style.textAlign) vars['text-align'] = style.textAlign;
    if (style.boxShadow) vars['box-shadow'] = style.boxShadow;
    if (style.border) vars['border'] = style.border;
    if (style.zIndex !== undefined) vars['z-index'] = String(style.zIndex);
    if (style.animation) vars['animation'] = JSON.stringify(style.animation);
    
    return vars;
  }

  static toCssVars(style: AlertStyle): string {
    const vars = this.toVariables(style);
    return Object.entries(vars)
      .map(([key, value]) => `--alert-${key}: ${value}`)
      .join('; ');
  }
}