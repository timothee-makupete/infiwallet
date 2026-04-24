import { LoggerService } from "@nestjs/common";
import * as winston from "winston";
export declare function createWinstonLogger(serviceName: string): winston.Logger;
export declare class WinstonNestLogger implements LoggerService {
    private readonly logg;
    constructor(logg: winston.Logger);
    log(message: string, context?: string): void;
    error(message: string, trace?: string, context?: string): void;
    warn(message: string, context?: string): void;
    debug(message: string, context?: string): void;
    verbose(message: string, context?: string): void;
}
export declare function createLogger(serviceName: string): WinstonNestLogger;
