import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/lib/status";

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

export const expenseInputSchema = z
  .object({
    category: z.enum(EXPENSE_CATEGORIES),
    amount: z.coerce.number().min(0, "Amount is required"),
    date: optionalDate,
    receiptUrl: z.string().trim().optional().default(""),
    notes: z.string().optional().default(""),
  })
  .strict();

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
