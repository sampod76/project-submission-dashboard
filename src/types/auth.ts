export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  name: string;
}
export interface LoginPayload {
  email: string;
  password: string;
}
export interface AuthData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
}
export type LoginResponse = ApiResponse<AuthData>;
export type RefreshTokenResponse = ApiResponse<AuthData>;
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
export type ProfileResponse = ApiResponse<{ user: ProfileUser }>;
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
export type ChangePasswordResponse = ApiResponse<{ message: string }>;
export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
}
