import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export const apiStatus = (error: unknown): number | undefined =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  typeof error.status === "number"
    ? error.status
    : undefined;

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = error.data;
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    )
      return data.message;
  }
  return fallback;
}

export function mapFormError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  fallback: string,
) {
  const message = apiErrorMessage(error, fallback);
  setError("root", { type: "server", message });
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "errorMessage" in error.data &&
    Array.isArray(error.data.errorMessage)
  ) {
    for (const detail of error.data.errorMessage) {
      if (
        detail &&
        typeof detail.path === "string" &&
        typeof detail.message === "string" &&
        fields.includes(detail.path as Path<T>)
      )
        setError(detail.path as Path<T>, { type: "server", message: detail.message });
    }
  }
  if (apiStatus(error) === 409) {
    if (/email/i.test(message) && fields.includes("email" as Path<T>))
      setError("email" as Path<T>, {
        message: "This email is already registered. Try signing in.",
      });
    if (/repository|repoUrl|repoFullName/i.test(message) && fields.includes("repoUrl" as Path<T>))
      setError("repoUrl" as Path<T>, { message });
  }
  if (
    /current password is incorrect/i.test(message) &&
    fields.includes("currentPassword" as Path<T>)
  )
    setError("currentPassword" as Path<T>, { message });
  return message;
}

export function rateLimitDelay(error: unknown) {
  if (apiStatus(error) !== 429) return 0;
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "retryAfterSeconds" in error.data &&
    typeof error.data.retryAfterSeconds === "number"
  )
    return error.data.retryAfterSeconds;
  return 60;
}
