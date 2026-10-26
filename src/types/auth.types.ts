import type { ApiResponse, DateTime, Role, UUID } from "./common.types";
import type { PasswordChangeResult, UserProfile } from "./user.types";

export interface RegisteredStudentFields {
  id: UUID;
  firstName: string;
  lastName: string;
  phone: string | null;
  gender: string | null;
}

export interface RegisteredStudent {
  id: UUID;
  email: string;
  role: "STUDENT";
  isActive: boolean;
  lastLoginAt: DateTime | null;
  isDeleted: boolean;
  deletedAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
  student: RegisteredStudentFields;
}

export interface AuthUser {
  id: UUID;
  email: string;
  role: Role;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface SessionUser {
  id: UUID;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  gender?: string;
}

export type RegisterResponse = ApiResponse<RegisteredStudent>;

export interface LoginBody {
  email: string;
  password: string;
}

export type LoginResponse = ApiResponse<AuthTokens>;

export interface RefreshTokenBody {
  refreshToken?: string;
}

export type RefreshTokenResponse = ApiResponse<AuthTokens>;

export type LogoutResponse = ApiResponse<null>;

export type SessionResponse = ApiResponse<SessionUser>;

export type GetAuthProfileResponse = ApiResponse<UserProfile>;

export interface ChangePasswordLegacyBody {
  currentPassword: string;
  newPassword: string;
}

export type ChangePasswordLegacyResponse = ApiResponse<PasswordChangeResult>;

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

export interface ProfileUser {
  userId: string;
  email: string;
  role: string;
  isActive: boolean;
  profile: {
    _id: string;
    userId: string;
    name: string;
    phone?: string;
    isDeleted: boolean;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export type ProfileResponse = ApiResponse<{
  user: ProfileUser;
}>;
