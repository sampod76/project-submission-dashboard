import { z } from "zod";

export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Password must be at most 72 UTF-8 bytes",
  );
const nameSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(100, "Use at most 100 characters");
export const studentRegistrationSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email")
      .max(255)
      .toLowerCase(),
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    phone: z.string().trim().max(20, "Use at most 20 characters"),
    gender: z.string().trim().max(255, "Use at most 255 characters"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type StudentRegistrationValues = z.infer<typeof studentRegistrationSchema>;

export function isGithubRepository(value: string) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      !url.username &&
      !url.password &&
      !url.port &&
      parts.length === 2 &&
      Boolean(parts[1].replace(/\.git$/i, ""))
    );
  } catch {
    return false;
  }
}
export function isSafeWebUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
export const submissionSchema = z.object({
  projectName: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(200, "Use at most 200 characters"),
  repoUrl: z
    .string()
    .trim()
    .min(1, "Repository URL is required")
    .max(2048)
    .url("Enter a valid URL")
    .refine(
      isGithubRepository,
      "Use an HTTPS github.com/owner/repository URL without credentials or a custom port",
    ),
  liveUrl: z
    .string()
    .trim()
    .min(1, "Live URL is required")
    .max(2048)
    .url("Enter a valid URL")
    .refine(isSafeWebUrl, "Use an HTTP or HTTPS URL without credentials"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(10000, "Use at most 10,000 characters"),
});
export const ownProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: z.string().trim().max(20),
  bio: z.string().trim().max(10000),
});
export type OwnProfileValues = z.infer<typeof ownProfileSchema>;
export const studentPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(1024),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type StudentPasswordValues = z.infer<typeof studentPasswordSchema>;
