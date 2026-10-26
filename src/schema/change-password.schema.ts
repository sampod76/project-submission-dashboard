import { z } from "zod";
export const passwordSetSchema = z
  .object({
    currentPassword: z.string().min(1, "Please enter your current password."),
    newPassword: z
      .string()
      .min(1, "Please enter your new password.")
      .min(8, "Use 8–128 characters")
      .max(128, "Use 8–128 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type PasswordSetValues = z.infer<typeof passwordSetSchema>;
