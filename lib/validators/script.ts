import { z } from "zod";
import { SCRIPT_STATUSES } from "@/lib/status";

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

const referenceLinksSchema = z
  .array(z.string().trim())
  .optional()
  .default([])
  .transform((links) => links.filter(Boolean));

export const scriptInputSchema = z
  .object({
    clientId: z.string().trim().min(1, "Client is required"),
    orderId: optionalId,
    videoNumber: z.coerce.number().int().min(1).optional().default(1),
    writerId: optionalId,
    creatorId: optionalId,
    language: z.string().trim().optional().default(""),
    scriptText: z.string().optional().default(""),
    referenceLinks: referenceLinksSchema,
    deadline: optionalDate,
    status: z.enum(SCRIPT_STATUSES).optional().default("Draft"),
  })
  .strict();

export const scriptPatchSchema = z
  .object({
    clientId: z.string().trim().min(1, "Client is required").optional(),
    orderId: optionalId,
    videoNumber: z.coerce.number().int().min(1).optional(),
    writerId: optionalId,
    creatorId: optionalId,
    language: z.string().trim().optional(),
    scriptText: z.string().optional(),
    referenceLinks: z.array(z.string().trim()).optional(),
    deadline: optionalDate,
    status: z.enum(SCRIPT_STATUSES).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export const scriptReviewSchema = z
  .object({
    action: z.enum(["comment", "approve", "revision"]),
    body: z.string().trim().optional().default(""),
  })
  .strict()
  .refine((value) => value.action !== "revision" || value.body.length > 0, {
    message: "A comment is required to request a revision",
  });

export type ScriptInput = z.infer<typeof scriptInputSchema>;
export type ScriptPatchInput = z.infer<typeof scriptPatchSchema>;
export type ScriptReviewInput = z.infer<typeof scriptReviewSchema>;
