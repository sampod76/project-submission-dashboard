import type { LoginBody } from "@/types/auth.types";
import type { Role } from "@/types/common.types";

// User-supplied local seed accounts. Never add personal or production credentials.
// Demo fill is limited to development and never submits the login form.
const demoAccounts: Record<Role, LoginBody> = {
  STUDENT: { email: "student@gmail.com", password: "Sa11223344?" },
  MENTOR: { email: "mentor@gmail.com", password: "Me11223344?" },
  ADMIN: { email: "admin@gmail.com", password: "Ae11223344?" },
};

export const demoLoginCredentials: Partial<Record<Role, LoginBody>> =
  process.env.NODE_ENV === "development" ? demoAccounts : {};
