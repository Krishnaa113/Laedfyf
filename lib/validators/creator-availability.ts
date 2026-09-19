import { z } from "zod";
import { CREATOR_AVAILABILITY_STATUSES } from "@/lib/status";

const optionalId = z
  .union([z.string().trim(), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    return value ? value : null;
  });

const requiredDate = z.string().trim().min(1, "Start time is required").transform((value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid start time");
  }
  return date.toISOString();
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

export const creatorAvailabilityInputSchema = z
  .object({
    creatorId: z.string().trim().min(1, "Creator is required"),
    shootId: optionalId,
    startsAt: requiredDate,
    endsAt: optionalDate,
    status: z.enum(CREATOR_AVAILABILITY_STATUSES).optional().default("Unavailable"),
    notes: z.string().optional().default(""),
  })
  .strict();

export const creatorAvailabilityPatchSchema = z
  .object({
    creatorId: z.string().trim().min(1).optional(),
    shootId: optionalId,
    startsAt: optionalDate,
    endsAt: optionalDate,
    status: z.enum(CREATOR_AVAILABILITY_STATUSES).optional(),
    notes: z.string().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export type CreatorAvailabilityInput = z.infer<typeof creatorAvailabilityInputSchema>;
export type CreatorAvailabilityPatchInput = z.infer<
  typeof creatorAvailabilityPatchSchema
>;
