import type { DiscoveredService, ServiceInfo } from '../types';
export declare class ClientFactory {
    private filterServices;
    constructor(filterServices: (criteria: Partial<ServiceInfo>) => DiscoveredService[]);
    createClient(nameOrId: string): {
        get: (path: string, options?: RequestInit) => Promise<Response>;
        post: (path: string, options?: RequestInit) => Promise<Response>;
        put: (path: string, options?: RequestInit) => Promise<Response>;
        delete: (path: string, options?: RequestInit) => Promise<Response>;
    };
    private fetchInternal;
}
