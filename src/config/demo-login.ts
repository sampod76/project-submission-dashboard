import type { LoginBody } from "@/types/auth.types";
import type { Role } from "@/types/common.types";

// User-supplied local seed accounts. Never add personal or production credentials.
// Auto Fill is available in both development and production builds.
// It only fills the form; the user still chooses when to sign in.
const demoAccounts: Record<Role, LoginBody> = {
  STUDENT: { email: "student@gmail.com", password: "Sa11223344?" },
  MENTOR: { email: "mentor@gmail.com", password: "Me11223344?" },
  ADMIN: { email: "admin@gmail.com", password: "Ae11223344?" },
};

export const demoLoginCredentials: Record<Role, LoginBody> = demoAccounts;
