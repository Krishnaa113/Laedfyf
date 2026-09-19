import { z } from "zod";
import { SHOOT_STATUSES } from "@/lib/status";

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

const idList = z
  .array(z.string().trim())
  .optional()
  .default([])
  .transform((ids) => ids.filter(Boolean));

const checklistSchema = z
  .object({
    scriptApproved: z.boolean().optional(),
    creatorConfirmed: z.boolean().optional(),
    locationPermission: z.boolean().optional(),
    clientProductReceived: z.boolean().optional(),
    teamBriefed: z.boolean().optional(),
  })
  .strict()
  .optional();

export const shootInputSchema = z
  .object({
    clientId: z.string().trim().min(1, "Client is required"),
    orderId: optionalId,
    creatorId: optionalId,
    cameramanId: optionalId,
    shootManagerId: optionalId,
    assistantId: optionalId,
    approvedScriptIds: idList,
    location: z.string().trim().optional().default(""),
    scheduledAt: optionalDate,
    endsAt: optionalDate,
    status: z.enum(SHOOT_STATUSES).optional().default("Scheduled"),
    notes: z.string().optional().default(""),
    checklist: checklistSchema,
    footageUploaded: z.boolean().optional().default(false),
    rawIntegrityChecked: z.boolean().optional().default(false),
    reshootRequired: z.boolean().optional().default(false),
  })
  .strict();

export const shootPatchSchema = z
  .object({
    clientId: z.string().trim().min(1, "Client is required").optional(),
    orderId: optionalId,
    creatorId: optionalId,
    cameramanId: optionalId,
    shootManagerId: optionalId,
    assistantId: optionalId,
    approvedScriptIds: z.array(z.string().trim()).optional(),
    location: z.string().trim().optional(),
    scheduledAt: optionalDate,
    endsAt: optionalDate,
    status: z.enum(SHOOT_STATUSES).optional(),
    notes: z.string().optional(),
    checklist: checklistSchema,
    footageUploaded: z.boolean().optional(),
    rawIntegrityChecked: z.boolean().optional(),
    reshootRequired: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export type ShootInput = z.infer<typeof shootInputSchema>;
export type ShootPatchInput = z.infer<typeof shootPatchSchema>;
