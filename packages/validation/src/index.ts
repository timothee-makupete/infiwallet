import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const profileUpdateSchema = z.object({
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  address: z.string().max(2000).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const depositSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
});

export const withdrawalSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
});

const kycDocumentMime = z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export const kycDocumentItemSchema = z
  .object({
    type: z.string().min(1).max(50),
    fileName: z.string().min(1).max(255),
    mimeType: kycDocumentMime,
    /** Server-side path from a prior upload (rare in web flow). */
    storageKey: z.string().min(1).max(500).optional(),
    /** Base64 file contents (optionally `data:mime;base64,...`). Preferred for browser uploads. */
    dataBase64: z.string().min(1).max(9_000_000).optional(),
  })
  .refine((d) => Boolean(d.storageKey) || Boolean(d.dataBase64), {
    message: "Each document must include either dataBase64 (file) or storageKey",
  });

export const kycSubmitSchema = z
  .object({
    tier: z.coerce.number().int().min(1).max(3),
    documents: z.array(kycDocumentItemSchema).min(1),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const minDocs = data.tier === 1 ? 1 : data.tier === 2 ? 2 : 3;
    if (data.documents.length < minDocs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Tier ${data.tier} requires at least ${minDocs} document(s).`,
        path: ["documents"],
      });
    }
  });

export const kycReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  notes: z.string().max(2000).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
