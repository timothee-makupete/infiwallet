"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodValidationPipe = void 0;
const common_1 = require("@nestjs/common");
class ZodValidationPipe {
    schema;
    constructor(schema) {
        this.schema = schema;
    }
    transform(value) {
        const parsed = this.schema.safeParse(value);
        if (!parsed.success) {
            const msg = parsed.error.flatten();
            throw new common_1.BadRequestException({ message: "Validation failed", errors: msg });
        }
        return parsed.data;
    }
}
exports.ZodValidationPipe = ZodValidationPipe;
//# sourceMappingURL=zod-validation.pipe.js.map