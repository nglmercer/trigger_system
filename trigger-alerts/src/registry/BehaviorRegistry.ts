import type { AlertElement } from '../styles/types';

export type AlertBehaviorCallback = (element: HTMLElement, data?: any) => void;

class BehaviorRegistry {
  private behaviors: Map<string, AlertBehaviorCallback> = new Map();

  register(id: string, callback: AlertBehaviorCallback) {
    this.behaviors.set(id, callback);
  }

  execute(id: string, element: HTMLElement, data?: any) {
    const behavior = this.behaviors.get(id);
    if (behavior) {
      behavior(element, data);
    } else {
      console.warn(`Behavior "${id}" not found in registry.`);
    }
  }

  has(id: string): boolean {
    return this.behaviors.has(id);
  }
}

export const AlertBehaviorRegistry = new BehaviorRegistry();
