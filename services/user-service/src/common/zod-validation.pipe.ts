import { BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const msg = parsed.error.flatten();
      throw new BadRequestException({ message: "Validation failed", errors: msg });
    }
    return parsed.data;
  }
}
