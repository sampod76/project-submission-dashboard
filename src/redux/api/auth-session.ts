import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import type { AuthState, AuthTokens } from "@/types/auth.types";
import type { ApiResponse } from "@/types/common.types";

export const getAuthState = (api: Pick<BaseQueryApi, "getState">) =>
  (api.getState() as { auth: AuthState }).auth;

export function isTokenResponse(value: unknown): value is ApiResponse<AuthTokens> {
  if (
    typeof value !== "object" ||
    value === null ||
    !("success" in value) ||
    value.success !== true ||
    !("statusCode" in value) ||
    value.statusCode !== 200 ||
    !("message" in value) ||
    (value.message !== "" && value.message !== "Login successful") ||
    !("data" in value)
  )
    return false;

  const data = value.data;
  if (
    typeof data !== "object" ||
    data === null ||
    !("accessToken" in data) ||
    typeof data.accessToken !== "string" ||
    !data.accessToken ||
    !("refreshToken" in data) ||
    typeof data.refreshToken !== "string" ||
    !data.refreshToken ||
    !("expiresIn" in data) ||
    typeof data.expiresIn !== "number" ||
    !("user" in data)
  )
    return false;

  const user = data.user;
  return (
    typeof user === "object" &&
    user !== null &&
    "id" in user &&
    typeof user.id === "string" &&
    "email" in user &&
    typeof user.email === "string" &&
    "name" in user &&
    typeof user.name === "string" &&
    "role" in user &&
    (user.role === "ADMIN" || user.role === "MENTOR" || user.role === "STUDENT")
  );
}
