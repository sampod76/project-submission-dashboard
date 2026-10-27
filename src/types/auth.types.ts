import type { AuthUser } from "@/types/api-contracts";
export type {
  AuthUser,
  AuthTokens,
  RegisteredStudent,
  RegisteredStudentFields,
  RegisterBody,
  RegisterResponse,
  LoginBody,
  LoginResponse,
  RefreshTokenBody,
  RefreshTokenResponse,
  LogoutResponse,
  GetAuthProfileResponse,
  ChangePasswordLegacyBody,
  ChangePasswordLegacyResponse,
  SessionUser,
  SessionResponse,
} from "@/types/api-contracts";

export type AuthSessionUser = AuthUser & {
  userId: string;
};

export interface AuthState {
  user: AuthSessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  sessionVersion: number;
}
