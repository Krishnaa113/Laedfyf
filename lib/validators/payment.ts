import { z } from "zod";
import { PAYMENT_STATUSES } from "@/lib/status";

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

export const paymentInputSchema = z
  .object({
    clientId: z.string().trim().min(1, "Client is required"),
    orderId: optionalId,
    invoiceAmount: z.coerce.number().min(0),
    amountReceived: z.coerce.number().min(0).optional().default(0),
    paymentDate: optionalDate,
    method: z.string().trim().optional().default(""),
    transactionRef: z.string().trim().optional().default(""),
    notes: z.string().optional().default(""),
    status: z.enum(PAYMENT_STATUSES).optional(),
  })
  .strict();

export const paymentPatchSchema = z
  .object({
    clientId: z.string().trim().min(1).optional(),
    orderId: optionalId,
    invoiceAmount: z.coerce.number().min(0).optional(),
    amountReceived: z.coerce.number().min(0).optional(),
    paymentDate: optionalDate,
    method: z.string().trim().optional(),
    transactionRef: z.string().trim().optional(),
    notes: z.string().optional(),
    status: z.enum(PAYMENT_STATUSES).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export type PaymentInput = z.infer<typeof paymentInputSchema>;
export type PaymentPatchInput = z.infer<typeof paymentPatchSchema>;
