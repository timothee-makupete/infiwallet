"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WinstonNestLogger = void 0;
exports.createWinstonLogger = createWinstonLogger;
exports.createLogger = createLogger;
const winston = require("winston");
function createWinstonLogger(serviceName) {
    return winston.createLogger({
        level: process.env.LOG_LEVEL ?? "info",
        format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
        defaultMeta: { service: serviceName },
        transports: [new winston.transports.Console()],
    });
}
class WinstonNestLogger {
    logg;
    constructor(logg) {
        this.logg = logg;
    }
    log(message, context) {
        this.logg.info(message, { context });
    }
    error(message, trace, context) {
        this.logg.error(message, { trace, context });
    }
    warn(message, context) {
        this.logg.warn(message, { context });
    }
    debug(message, context) {
        this.logg.debug(message, { context });
    }
    verbose(message, context) {
        this.logg.verbose(message, { context });
    }
}
exports.WinstonNestLogger = WinstonNestLogger;
function createLogger(serviceName) {
    return new WinstonNestLogger(createWinstonLogger(serviceName));
}
//# sourceMappingURL=logger.js.map