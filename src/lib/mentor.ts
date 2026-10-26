import type { AuditLogRecord, ListAuditLogsQuery } from "@/types/audit-log.types";
import type { SubmissionRecord } from "@/types/submission.types";
import type { UpdateUserBody, UserRecord } from "@/types/user.types";
import type { Role } from "@/types/common.types";

export const canReviewSubmission = (submission: Pick<SubmissionRecord, "status">, role?: Role) =>
  role === "MENTOR" && submission.status === "PENDING";
export const canManageStudent = (account: Pick<UserRecord, "role" | "isDeleted">) =>
  account.role === "STUDENT" && !account.isDeleted;
export function studentAccountBody(
  values: { email: string; password: string },
  currentEmail: string,
): Pick<UpdateUserBody, "email" | "password"> {
  return {
    ...(values.email !== currentEmail ? { email: values.email } : {}),
    ...(values.password ? { password: values.password } : {}),
  };
}
export function ownReviewAuditQuery(userId: string, query: ListAuditLogsQuery): ListAuditLogsQuery {
  return { ...query, actorUserId: userId, action: "SUBMISSION_REVIEWED", entityType: "Submission" };
}
export const isOwnReviewAudit = (log: AuditLogRecord, userId?: string) =>
  Boolean(
    userId &&
    log.actorUserId === userId &&
    log.action === "SUBMISSION_REVIEWED" &&
    log.entityType === "Submission",
  );
