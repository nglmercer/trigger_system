import { EventEmitter } from 'events';
import type { DiscoveredService, ServiceInfo } from '../types';
export declare class Registry extends EventEmitter {
    private services;
    update(serviceId: string, discoveredService: DiscoveredService): void;
    remove(serviceId: string): void;
    get(serviceId: string): DiscoveredService | undefined;
    getAll(): DiscoveredService[];
    checkOffline(timeoutMs: number): void;
    filter(criteria: Partial<ServiceInfo>): DiscoveredService[];
}
