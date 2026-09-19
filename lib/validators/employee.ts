import { z } from "zod";
import { EMPLOYEE_SUB_ROLES } from "@/lib/roles";

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

export const employeeInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().email("Valid email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    employeeSubRole: z.enum(EMPLOYEE_SUB_ROLES),
    jobTitle: z.string().trim().optional().default(""),
    department: z.string().trim().optional().default(""),
    salary: z.coerce.number().min(0).optional().default(0),
    joiningDate: optionalDate,
    phone: z.string().trim().optional().default(""),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const employeePatchSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    password: z.string().min(8).optional(),
    employeeSubRole: z.enum(EMPLOYEE_SUB_ROLES).optional(),
    jobTitle: z.string().trim().optional(),
    department: z.string().trim().optional(),
    salary: z.coerce.number().min(0).optional(),
    joiningDate: optionalDate,
    phone: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export type EmployeeInput = z.infer<typeof employeeInputSchema>;
export type EmployeePatchInput = z.infer<typeof employeePatchSchema>;
