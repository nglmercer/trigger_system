export interface AlertConfig {
  id: string;
  name: string;
  mediaType: 'video' | 'audio' | 'image' | 'text';
  mediaUrl: string;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  duration: number;
  loop: boolean;
  volume: number;
  scale: number;
  opacity: number;
  transition: 'fade' | 'slide' | 'scale' | 'none';
}

export interface AlertFlowConfig {
  version: string;
  exportedAt: string;
  alerts: AlertConfig[];
  flow: {
    edges: { source: string; target: string }[];
  };
}

export interface Action {
  type: string;
  params?: Record<string, unknown>;
}

export function alertToAction(alert: AlertConfig): Action {
  const params = {
    mediaType: alert.mediaType,
    mediaUrl: alert.mediaUrl,
    position: alert.position,
    duration: alert.duration,
    loop: alert.loop,
    volume: alert.volume,
    scale: alert.scale,
    opacity: alert.opacity,
    transition: alert.transition,
  };

  return {
    type: 'alert',
    params,
  };
}

export function alertFlowToActions(flow: AlertFlowConfig): { actions: Action[]; edges: { source: string; target: string }[] } {
  return {
    actions: flow.alerts.map(alertToAction),
    edges: flow.flow.edges,
  };
}

export const MEDIA_TYPES = ['video', 'audio', 'image', 'text'] as const;
export const POSITIONS = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export const TRANSITIONS = ['fade', 'slide', 'scale', 'none'] as const;
