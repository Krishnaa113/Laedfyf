import { z } from "zod";
import { CREATOR_AVAILABILITY_STATUSES } from "@/lib/status";

const stringList = z
  .array(z.string().trim())
  .optional()
  .default([])
  .transform((items) => items.filter(Boolean));

export const creatorInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    photoUrl: z.string().trim().optional().default(""),
    gender: z.string().trim().optional().default(""),
    ageGroup: z.string().trim().optional().default(""),
    languages: stringList,
    location: z.string().trim().optional().default(""),
    niches: stringList,
    demographics: z.string().optional().default(""),
    email: z.string().trim().optional().default(""),
    phone: z.string().trim().optional().default(""),
    rate: z.coerce.number().min(0).optional().default(0),
    bankAccountName: z.string().trim().optional().default(""),
    bankAccountNumber: z.string().trim().optional().default(""),
    upiId: z.string().trim().optional().default(""),
    portfolioLinks: stringList,
    availability: z.enum(CREATOR_AVAILABILITY_STATUSES).optional().default("Available"),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const creatorPatchSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    photoUrl: z.string().trim().optional(),
    gender: z.string().trim().optional(),
    ageGroup: z.string().trim().optional(),
    languages: z.array(z.string().trim()).optional(),
    location: z.string().trim().optional(),
    niches: z.array(z.string().trim()).optional(),
    demographics: z.string().optional(),
    email: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    rate: z.coerce.number().min(0).optional(),
    bankAccountName: z.string().trim().optional(),
    bankAccountNumber: z.string().trim().optional(),
    upiId: z.string().trim().optional(),
    portfolioLinks: z.array(z.string().trim()).optional(),
    availability: z.enum(CREATOR_AVAILABILITY_STATUSES).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export type CreatorInput = z.infer<typeof creatorInputSchema>;
export type CreatorPatchInput = z.infer<typeof creatorPatchSchema>;
