import type { LoginBody } from "@/types/auth.types";
import type { Role } from "@/types/common.types";

export const demoLoginCredentials: Record<Role, LoginBody> = {
  STUDENT: { email: "student1@gmail.com", password: "St11223344?" },
  MENTOR: { email: "mentor@gmail.com", password: "Me11223344?" },
  ADMIN: { email: "admin@gmail.com", password: "Ae11223344?" },
};
