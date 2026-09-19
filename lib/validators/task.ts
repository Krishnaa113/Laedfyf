import { z } from "zod";
import {
  TASK_RELATED_TYPES,
  normalizeTaskPriority,
  normalizeTaskStatus,
} from "@/lib/status";

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

const relatedType = z
  .union([z.enum(TASK_RELATED_TYPES), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    return value ? value : null;
  });

const attachments = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    const list = Array.isArray(value) ? value : value ? [value] : [];
    return list.map((item) => String(item).trim()).filter(Boolean);
  });

const priority = z
  .string()
  .optional()
  .transform((value) =>
    value === undefined ? undefined : normalizeTaskPriority(value),
  );

const status = z
  .string()
  .optional()
  .transform((value) =>
    value === undefined ? undefined : normalizeTaskStatus(value),
  );

export const taskInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().optional().default(""),
    assigneeId: optionalId,
    relatedType: relatedType,
    relatedId: optionalId,
    priority: priority.default("Medium"),
    status: status.default("To Do"),
    deadline: optionalDate,
    attachments: attachments.default([]),
  })
  .strict()
  .refine(
    (value) =>
      (value.relatedType && value.relatedId) ||
      (!value.relatedType && !value.relatedId),
    { message: "Related type and id must be set together", path: ["relatedId"] },
  );

export const taskPatchSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    assigneeId: optionalId,
    relatedType: relatedType,
    relatedId: optionalId,
    priority: z
      .string()
      .optional()
      .transform((value) =>
        value === undefined ? undefined : normalizeTaskPriority(value),
      ),
    status: z
      .string()
      .optional()
      .transform((value) =>
        value === undefined ? undefined : normalizeTaskStatus(value),
      ),
    deadline: optionalDate,
    attachments: attachments,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  })
  .refine(
    (value) =>
      value.relatedType === undefined ||
      value.relatedId === undefined ||
      (Boolean(value.relatedType) && Boolean(value.relatedId)) ||
      (!value.relatedType && !value.relatedId),
    { message: "Related type and id must be set together", path: ["relatedId"] },
  );

export type TaskInput = z.infer<typeof taskInputSchema>;
export type TaskPatchInput = z.infer<typeof taskPatchSchema>;
