import { z } from "zod";
import { newPasswordSchema } from "./student.schema";

export const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  feedback: z.string().trim().max(10000, "Use at most 10,000 characters"),
}).strict();
export type ReviewValues = z.infer<typeof reviewSchema>;

export const studentAccountSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255).toLowerCase(),
  password: z.union([z.literal(""), newPasswordSchema]),
  confirmPassword: z.string(),
}).strict().refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"], message: "Passwords do not match",
});
export type StudentAccountValues = z.infer<typeof studentAccountSchema>;

export const auditFiltersSchema = z.object({
  entityId: z.union([z.literal(""), z.string().uuid("Enter a valid submission ID")]),
  fromDate: z.string(),
  toDate: z.string(),
}).refine((value) => !value.fromDate || !value.toDate || value.fromDate <= value.toDate, {
  path: ["toDate"], message: "End date must be on or after start date",
});
export type AuditFilterValues = z.infer<typeof auditFiltersSchema>;
