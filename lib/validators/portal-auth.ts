import { z } from "zod";

export const setPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const portalLoginCheckSchema = z
  .object({
    clientName: z.string().trim().optional().default(""),
    email: z.string().trim().optional().default(""),
    password: z.string().min(1),
  })
  .strict()
  .refine((value) => Boolean(value.clientName || value.email), {
    message: "Client name is required",
    path: ["clientName"],
  });

export const bulkInviteSchema = z
  .object({
    ids: z.array(z.string().trim().min(1)).min(1, "Select at least one client"),
  })
  .strict();
