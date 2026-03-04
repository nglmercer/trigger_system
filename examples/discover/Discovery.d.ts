import { EventEmitter } from 'events';
import type { DiscoveryOptions, ServiceInfo, DiscoveredService } from './types';
import { Registry } from './modules/Registry';
export declare class Discovery extends EventEmitter {
    private serviceInfo;
    private port;
    private options;
    private registry;
    private network;
    private clientFactory;
    private heartbeatTimer;
    private checkOfflineTimer;
    private processHooksSet;
    private onProcessExit;
    constructor(serviceInfo: ServiceInfo, port: number, options?: DiscoveryOptions);
    private setupEvents;
    start(): Promise<void>;
    private handleMessage;
    private startTimers;
    filter(criteria: Partial<ServiceInfo>): DiscoveredService[];
    private setupProcessHooks;
    private removeProcessHooks;
    stop(): void;
    createClient(nameOrId: string): {
        get: (path: string, options?: RequestInit) => Promise<Response>;
        post: (path: string, options?: RequestInit) => Promise<Response>;
        put: (path: string, options?: RequestInit) => Promise<Response>;
        delete: (path: string, options?: RequestInit) => Promise<Response>;
    };
    getInternalRegistry(): Registry;
    getServiceId(): string;
}
