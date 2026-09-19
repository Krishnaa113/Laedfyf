import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/status";

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

const assignedEmployeeIdsSchema = z
  .array(z.string().trim())
  .optional()
  .default([])
  .transform((ids) => ids.filter(Boolean));

export const orderInputSchema = z
  .object({
    clientId: z.string().trim().min(1, "Client is required"),
    packageName: z.string().trim().min(1, "Package name is required"),
    contractedVideoCount: z.coerce.number().int().min(1),
    pricing: z.coerce.number().min(0).optional().default(0),
    gstTax: z.coerce.number().min(0).optional().default(0),
    amountReceived: z.coerce.number().min(0).optional().default(0),
    startDate: optionalDate,
    dueDate: optionalDate,
    assignedEmployeeIds: assignedEmployeeIdsSchema,
    status: z.enum(ORDER_STATUSES).optional().default("New"),
  })
  .strict();

export const orderPatchSchema = z
  .object({
    clientId: z.string().trim().min(1, "Client is required").optional(),
    packageName: z.string().trim().min(1, "Package name is required").optional(),
    contractedVideoCount: z.coerce.number().int().min(1).optional(),
    pricing: z.coerce.number().min(0).optional(),
    gstTax: z.coerce.number().min(0).optional(),
    amountReceived: z.coerce.number().min(0).optional(),
    startDate: optionalDate,
    dueDate: optionalDate,
    assignedEmployeeIds: z.array(z.string().trim()).optional(),
    status: z.enum(ORDER_STATUSES).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export type OrderInput = z.infer<typeof orderInputSchema>;
export type OrderPatchInput = z.infer<typeof orderPatchSchema>;
