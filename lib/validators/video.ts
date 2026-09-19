import { z } from "zod";
import { VIDEO_STATUSES } from "@/lib/status";

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

export const videoInputSchema = z
  .object({
    clientId: z.string().trim().min(1, "Client is required"),
    orderId: z.string().trim().min(1, "Order is required"),
    scriptId: optionalId,
    creatorId: optionalId,
    shootId: optionalId,
    assignedEditorId: optionalId,
    editorId: optionalId,
    deadline: optionalDate,
    fileLink: z.string().trim().optional().default(""),
    thumbnailUrl: z.string().trim().optional().default(""),
    finalDeliveryLink: z.string().trim().optional().default(""),
    revisionCount: z.coerce.number().int().min(0).optional().default(0),
    status: z.enum(VIDEO_STATUSES).optional().default("Script Approved"),
  })
  .strict();

export const videoPatchSchema = z
  .object({
    clientId: z.string().trim().min(1, "Client is required").optional(),
    orderId: z.string().trim().min(1, "Order is required").optional(),
    scriptId: optionalId,
    creatorId: optionalId,
    shootId: optionalId,
    assignedEditorId: optionalId,
    editorId: optionalId,
    deadline: optionalDate,
    fileLink: z.string().trim().optional(),
    thumbnailUrl: z.string().trim().optional(),
    finalDeliveryLink: z.string().trim().optional(),
    revisionCount: z.coerce.number().int().min(0).optional(),
    status: z.enum(VIDEO_STATUSES).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export const videoReviewSchema = z
  .object({
    action: z.enum(["comment", "approve", "revision"]),
    body: z.string().trim().optional().default(""),
    timecode: z.string().trim().optional().default(""),
    finalDeliveryLink: z.string().trim().optional().default(""),
  })
  .strict()
  .refine((value) => value.action !== "revision" || value.body.length > 0, {
    message: "A comment is required to request a revision",
  });

export type VideoInput = z.infer<typeof videoInputSchema>;
export type VideoPatchInput = z.infer<typeof videoPatchSchema>;
export type VideoReviewInput = z.infer<typeof videoReviewSchema>;
