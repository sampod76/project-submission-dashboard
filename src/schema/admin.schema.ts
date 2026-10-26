import { z } from "zod";
import { newPasswordSchema } from "./student.schema";

const name = z.string().trim().min(1, "This field is required").max(100);
const email = z.string().trim().email("Enter a valid email").max(255).toLowerCase();
const credentials = { email, password: newPasswordSchema, confirmPassword: z.string() };
const matchingPasswords = (value: { password: string; confirmPassword: string }) =>
  value.password === value.confirmPassword;
const passwordIssue = { path: ["confirmPassword"], message: "Passwords do not match" };
export const createAdminSchema = z
  .object({
    ...credentials,
    firstName: name,
    lastName: name,
    phone: z.string().trim().max(20),
    bio: z.string(),
  })
  .strict()
  .refine(matchingPasswords, passwordIssue);
export const createMentorSchema = z
  .object({
    ...credentials,
    firstName: name,
    lastName: name,
    phone: z.string().trim().max(20),
    bio: z.string().trim().max(10000),
    gender: z.string().trim().min(1, "Gender is required").max(255),
  })
  .strict()
  .refine(matchingPasswords, passwordIssue);
export type CreateAdminValues = z.infer<typeof createAdminSchema>;
export type CreateMentorValues = z.infer<typeof createMentorSchema>;
export const staffCreationSchema = (role: "ADMIN" | "MENTOR") =>
  z
    .object({
      ...credentials,
      firstName: name,
      lastName: name,
      phone: z.string().trim().max(20),
      bio: role === "MENTOR" ? z.string().trim().max(10000) : z.string(),
      gender: z.string().trim().max(255).optional(),
    })
    .strict()
    .refine(matchingPasswords, passwordIssue)
    .superRefine((value, ctx) => {
      if (role === "MENTOR" && !value.gender)
        ctx.addIssue({ code: "custom", path: ["gender"], message: "Gender is required" });
    });
export type StaffCreationValues = z.infer<ReturnType<typeof staffCreationSchema>>;
export const adminProfileSchema = z
  .object({
    firstName: name,
    lastName: name,
    phone: z.string().trim().max(20),
    bio: z.string(),
  })
  .strict();
export type AdminProfileValues = z.infer<typeof adminProfileSchema>;
export const adminAccountSchema = z
  .object({
    email,
    password: z.union([z.literal(""), newPasswordSchema]),
    confirmPassword: z.string(),
    role: z.enum(["ADMIN", "MENTOR", "STUDENT"]).optional(),
  })
  .strict()
  .refine(matchingPasswords, passwordIssue);
export type AdminAccountValues = z.infer<typeof adminAccountSchema>;
export const optionalDate = z
  .string()
  .refine(
    (value) =>
      !value ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value),
    "Enter a valid calendar date",
  );
const optionalUuid = z.union([z.literal(""), z.string().uuid("Enter a valid ID")]);
const orderedDates = (value: { fromDate: string; toDate: string }) =>
  !value.fromDate || !value.toDate || value.fromDate <= value.toDate;
const dateIssue = { path: ["toDate"], message: "End date must be on or after start date" };
export const adminAuditFiltersSchema = z
  .object({
    action: z.string().trim().max(100),
    entityType: z.string().trim().max(100),
    entityId: optionalUuid,
    actorUserId: optionalUuid,
    fromDate: optionalDate,
    toDate: optionalDate,
  })
  .strict()
  .refine(orderedDates, dateIssue);
export type AdminAuditFilterValues = z.infer<typeof adminAuditFiltersSchema>;
export const userFiltersSchema = z
  .object({
    search: z.string().trim().max(100),
    role: z.union([z.literal(""), z.enum(["ADMIN", "MENTOR", "STUDENT"])]),
    isActive: z.enum(["", "true", "false"]),
    fromDate: optionalDate,
    toDate: optionalDate,
    ids: z
      .string()
      .trim()
      .refine(
        (value) =>
          !value || value.split(",").every((id) => z.string().uuid().safeParse(id.trim()).success),
        "Enter comma-separated User IDs",
      ),
  })
  .strict()
  .refine(orderedDates, dateIssue);
export type UserFilterValues = z.infer<typeof userFiltersSchema>;
export const adminDirectoryFiltersSchema = z
  .object({
    search: z.string().trim().max(100),
    userId: optionalUuid,
    fromDate: optionalDate,
    toDate: optionalDate,
  })
  .strict()
  .refine(orderedDates, dateIssue);
export type AdminDirectoryFilterValues = z.infer<typeof adminDirectoryFiltersSchema>;
