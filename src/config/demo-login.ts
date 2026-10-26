import type { LoginBody } from "@/types/auth.types";
import type { Role } from "@/types/common.types";

// Public assignment demo accounts. Autofill behaves identically in all environments.
// Filling the form does not submit it; the user still chooses Sign In.
export const demoLoginCredentials: Record<Role, LoginBody> = {
  STUDENT: { email: "student@gmail.com", password: "Sa11223344?" },
  MENTOR: { email: "mentor@gmail.com", password: "Me11223344?" },
  ADMIN: { email: "admin@gmail.com", password: "Ae11223344?" },
};
