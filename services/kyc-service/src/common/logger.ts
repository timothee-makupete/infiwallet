import { LoggerService } from "@nestjs/common";
import * as winston from "winston";

export function createWinstonLogger(serviceName: string): winston.Logger {
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: { service: serviceName },
    transports: [new winston.transports.Console()],
  });
}

export class WinstonNestLogger implements LoggerService {
  constructor(private readonly logg: winston.Logger) {}

  log(message: string, context?: string): void {
    this.logg.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logg.error(message, { trace, context });
  }

  warn(message: string, context?: string): void {
    this.logg.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logg.debug(message, { context });
  }

  verbose(message: string, context?: string): void {
    this.logg.verbose(message, { context });
  }
}

export function createLogger(serviceName: string): WinstonNestLogger {
  return new WinstonNestLogger(createWinstonLogger(serviceName));
}
