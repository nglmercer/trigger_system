export declare class Logger {
    private enabled;
    enable(): void;
    disable(): void;
    log(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
}
export declare const logger: Logger;
