import { z } from "zod";
import { EMPLOYEE_SUB_ROLES, PERMISSIONS, USER_ROLES } from "@/lib/roles";

export const userInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().email("Valid email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(USER_ROLES),
    employeeSubRole: z.enum(EMPLOYEE_SUB_ROLES).nullable().optional().default(null),
    permissions: z.array(z.enum(PERMISSIONS)).optional().default([]),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const userPatchSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    password: z.string().min(8).optional(),
    role: z.enum(USER_ROLES).optional(),
    employeeSubRole: z.enum(EMPLOYEE_SUB_ROLES).nullable().optional(),
    permissions: z.array(z.enum(PERMISSIONS)).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export type UserInput = z.infer<typeof userInputSchema>;
export type UserPatchInput = z.infer<typeof userPatchSchema>;
