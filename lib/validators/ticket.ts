import { z } from "zod";
import { TICKET_STATUSES } from "@/lib/status";

const optionalId = z
  .union([z.string().trim(), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    return value ? value : null;
  });

export const ticketInputSchema = z
  .object({
    clientId: z.string().trim().optional(),
    orderId: optionalId,
    subject: z.string().trim().min(1, "Subject is required"),
    body: z.string().trim().optional().default(""),
  })
  .strict();

export const ticketPatchSchema = z
  .object({
    subject: z.string().trim().min(1).optional(),
    body: z.string().trim().optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    assignedEmployeeId: optionalId,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export type TicketInput = z.infer<typeof ticketInputSchema>;
export type TicketPatchInput = z.infer<typeof ticketPatchSchema>;
