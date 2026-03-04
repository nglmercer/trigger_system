export interface ServiceInfo {
    id?: string;
    name?: string;
    version?: string;
    schema?: string;
}
export interface DiscoveredService extends ServiceInfo {
    ip: string;
    port: number;
    lastSeen: number;
}
export interface DiscoveryOptions {
    multicastAddress?: string;
    multicastInterface?: string;
    multicastPort?: number;
    heartbeatInterval?: number;
    offlineTimeout?: number;
    setupHooks?: boolean;
}
export interface Message {
    type: 'hello' | 'heartbeat' | 'goodbye';
    service: ServiceInfo & {
        id: string;
        port: number;
    };
}
