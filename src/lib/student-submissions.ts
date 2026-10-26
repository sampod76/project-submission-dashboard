import type { SubmissionRecord } from "@/types/submission.types";
export const canEditSubmission = (submission: SubmissionRecord, userId?: string) =>
  submission.status === "PENDING" && submission.student.userId === userId;
export const submissionStatuses = ["PENDING", "APPROVED", "REJECTED", "REVISION_REQUIRED"] as const;
export const statusLabel = (status: string) =>
  status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
