import { z } from "zod";
import { PAYOUT_STATUSES } from "@/lib/status";

const optionalId = z
  .union([z.string().trim(), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    return value ? value : null;
  });

const optionalDate = z
  .union([z.string().trim(), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    if (!value) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  });

export const payoutInputSchema = z
  .object({
    creatorId: z.string().trim().min(1, "Creator is required"),
    orderId: optionalId,
    videoId: z.string().trim().min(1, "Video is required"),
    videoCount: z.coerce.number().int().min(1).optional().default(1),
    contractedRate: z.coerce.number().min(0),
    totalPayout: z.coerce.number().min(0).optional(),
    paymentDate: optionalDate,
    reference: z.string().trim().optional().default(""),
    status: z.enum(PAYOUT_STATUSES).optional().default("Pending"),
  })
  .strict();

export const payoutPatchSchema = z
  .object({
    status: z.enum(PAYOUT_STATUSES).optional(),
    paymentDate: optionalDate,
    reference: z.string().trim().optional(),
    contractedRate: z.coerce.number().min(0).optional(),
    totalPayout: z.coerce.number().min(0).optional(),
    videoCount: z.coerce.number().int().min(1).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export type PayoutInput = z.infer<typeof payoutInputSchema>;
export type PayoutPatchInput = z.infer<typeof payoutPatchSchema>;
