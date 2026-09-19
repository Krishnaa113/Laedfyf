import { z } from "zod";
import { ASSET_KINDS, CLIENT_STATUSES } from "@/lib/status";

const assignedEmployeeIdSchema = z
  .union([z.string().trim(), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    return value ? value : null;
  });

export const clientAssetInputSchema = z.object({
  name: z.string().trim().optional().default(""),
  url: z.string().trim().min(1, "Asset URL is required"),
  kind: z.enum(ASSET_KINDS).optional().default("Other"),
});

export const clientInputSchema = z
  .object({
    name: z.string().trim().min(1, "Client name is required"),
    companyName: z.string().trim().min(1, "Company name is required"),
    email: z.string().trim().email("Valid email is required"),
    phone: z.string().trim().optional().default(""),
    whatsapp: z.string().trim().optional().default(""),
    brandName: z.string().trim().optional().default(""),
    industry: z.string().trim().optional().default(""),
    gstTaxId: z.string().trim().optional().default(""),
    assignedEmployeeId: assignedEmployeeIdSchema.default(null),
    source: z.string().trim().optional().default(""),
    status: z.enum(CLIENT_STATUSES).optional().default("Lead"),
    notes: z.string().optional().default(""),
    password: z
      .string()
      .min(8, "Portal password must be at least 8 characters"),
  })
  .strict();

export const clientWriteSchema = clientInputSchema.extend({
  assets: z.array(clientAssetInputSchema).optional().default([]),
});

export const clientPatchSchema = z
  .object({
    name: z.string().trim().min(1, "Client name is required").optional(),
    companyName: z.string().trim().min(1, "Company name is required").optional(),
    email: z.string().trim().email("Valid email is required").optional(),
    phone: z.string().trim().optional(),
    whatsapp: z.string().trim().optional(),
    brandName: z.string().trim().optional(),
    industry: z.string().trim().optional(),
    gstTaxId: z.string().trim().optional(),
    assignedEmployeeId: assignedEmployeeIdSchema,
    source: z.string().trim().optional(),
    status: z.enum(CLIENT_STATUSES).optional(),
    notes: z.string().optional(),
    password: z
      .string()
      .optional()
      .refine(
        (value) => !value || value.length >= 8,
        "Portal password must be at least 8 characters",
      ),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export type ClientInput = z.infer<typeof clientInputSchema>;
export type ClientWriteInput = z.infer<typeof clientWriteSchema>;
export type ClientPatchInput = z.infer<typeof clientPatchSchema>;
