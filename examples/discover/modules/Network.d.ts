import { EventEmitter } from 'events';
import type { Message, DiscoveryOptions, ServiceInfo } from '../types';
export declare class Network extends EventEmitter {
    private socket;
    private senderSocket;
    private options;
    private serviceInfo;
    private port;
    constructor(serviceInfo: ServiceInfo, port: number, options: Required<DiscoveryOptions>);
    private getLocalInterfaces;
    start(): Promise<void>;
    private startWithInterface;
    broadcastPresence(type: Message['type']): void;
    stop(): void;
}
