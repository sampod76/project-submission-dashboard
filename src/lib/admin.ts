import type { Role, UpdateUserBody, UserRecord } from "@/types/api-contracts";
import type { AdminAccountValues } from "@/schema/admin.schema";

export const canManageAccount = (
  account: Pick<UserRecord, "role" | "isDeleted">,
  actorRole?: Role,
) =>
  !account.isDeleted &&
  (actorRole === "ADMIN" || (actorRole === "MENTOR" && account.role === "STUDENT"));

export function accountUpdateBody(
  values: AdminAccountValues,
  account: Pick<UserRecord, "email" | "role">,
  actorRole?: Role,
): UpdateUserBody {
  return {
    ...(values.email !== account.email ? { email: values.email } : {}),
    ...(values.password ? { password: values.password } : {}),
    ...(actorRole === "ADMIN" && values.role && values.role !== account.role
      ? { role: values.role }
      : {}),
  };
}

// Defense in depth for imported audit snapshots; always render as text.
export function redactAudit(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAudit);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        /password|passwd|token|secret|authorization|cookie|credential|apikey|privatekey|otp|databaseurl|connectionstring/.test(
          key.toLowerCase().replace(/[^a-z]/g, ""),
        )
          ? "[REDACTED]"
          : redactAudit(entry),
      ]),
    );
  return value;
}
