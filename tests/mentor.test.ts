import assert from "node:assert/strict";
import test from "node:test";
import {
  reviewSchema,
  studentAccountSchema,
  auditFiltersSchema,
} from "../src/schema/mentor.schema";
import {
  canManageStudent,
  canReviewSubmission,
  isOwnReviewAudit,
  ownReviewAuditQuery,
  studentAccountBody,
} from "../src/lib/mentor";
import { dashboardForRole } from "../src/lib/auth-routing";
import type { AuditLogRecord } from "../src/types/audit-log.types";

test("Mentor decisions accept only terminal decisions with optional feedback bounds", () => {
  for (const status of ["APPROVED", "REJECTED"]) {
    assert.equal(reviewSchema.safeParse({ status, feedback: "" }).success, true);
    assert.equal(reviewSchema.parse({ status, feedback: "  Feedback  " }).feedback, "Feedback");
  }
  for (const status of ["PENDING", "REVISION_REQUIRED", "REOPENED"])
    assert.equal(reviewSchema.safeParse({ status, feedback: "" }).success, false);
  assert.equal(
    reviewSchema.safeParse({ status: "APPROVED", feedback: "x".repeat(10001) }).success,
    false,
  );
  assert.equal(
    reviewSchema.safeParse({ status: "APPROVED", feedback: "", reviewerUserId: "other" }).success,
    false,
  );
});
test("only a Mentor viewing PENDING can review; account management stays Student-only", () => {
  assert.equal(canReviewSubmission({ status: "PENDING" }, "MENTOR"), true);
  for (const status of ["APPROVED", "REJECTED", "REVISION_REQUIRED"] as const)
    assert.equal(canReviewSubmission({ status }, "MENTOR"), false);
  for (const role of ["ADMIN", "STUDENT", undefined] as const)
    assert.equal(canReviewSubmission({ status: "PENDING" }, role), false);
  assert.equal(canManageStudent({ role: "STUDENT", isDeleted: false }), true);
  for (const role of ["ADMIN", "MENTOR"] as const)
    assert.equal(canManageStudent({ role, isDeleted: false }), false);
  assert.equal(canManageStudent({ role: "STUDENT", isDeleted: true }), false);
  assert.equal(dashboardForRole("MENTOR"), "/mentor/dashboard");
  assert.equal(dashboardForRole("STUDENT"), "/student/dashboard");
  assert.equal(dashboardForRole("ADMIN"), "/dashboard");
});
test("Student account forms normalize email, never send role, and omit blank passwords", () => {
  const values = { email: " NEW@EXAMPLE.COM ", password: "", confirmPassword: "" };
  const parsed = studentAccountSchema.parse(values);
  assert.deepEqual(studentAccountBody(parsed, "old@example.com"), { email: "new@example.com" });
  assert.deepEqual(studentAccountBody(parsed, parsed.email), {});
  assert.equal(studentAccountSchema.safeParse({ ...values, role: "ADMIN" }).success, false);
  assert.equal(
    studentAccountSchema.safeParse({
      ...values,
      password: "Aa1" + "é".repeat(35),
      confirmPassword: "Aa1" + "é".repeat(35),
    }).success,
    false,
  );
  assert.equal(
    studentAccountSchema.safeParse({
      ...values,
      password: "Mentor2026!",
      confirmPassword: "different",
    }).success,
    false,
  );
  assert.deepEqual(
    studentAccountBody(
      { ...parsed, password: "Student2026!", role: "ADMIN" } as typeof parsed,
      parsed.email,
    ),
    { password: "Student2026!" },
  );
});
test("audit filters lock own-review scope and reject invalid IDs/calendar dates", () => {
  const query = ownReviewAuditQuery("mentor-user-id", {
    actorUserId: "other",
    action: "USER_STATUS_CHANGED",
    entityType: "User",
    page: 2,
    limit: 20,
    sortOrder: "asc",
  });
  assert.deepEqual(query, {
    actorUserId: "mentor-user-id",
    action: "SUBMISSION_REVIEWED",
    entityType: "Submission",
    page: 2,
    limit: 20,
    sortOrder: "asc",
  });
  const log = {
    actorUserId: "mentor-user-id",
    action: "SUBMISSION_REVIEWED",
    entityType: "Submission",
  } as AuditLogRecord;
  assert.equal(isOwnReviewAudit(log, "mentor-user-id"), true);
  assert.equal(isOwnReviewAudit(log, "other"), false);
  assert.equal(
    isOwnReviewAudit({ ...log, action: "USER_STATUS_CHANGED" }, "mentor-user-id"),
    false,
  );
  const filters = { entityId: "", fromDate: "2026-10-01", toDate: "2026-10-26" };
  assert.equal(auditFiltersSchema.safeParse(filters).success, true);
  for (const patch of [
    { entityId: "bad-id" },
    { toDate: "2026-02-30" },
    { toDate: "2026-09-01" },
    { fromDate: "yesterday" },
  ])
    assert.equal(auditFiltersSchema.safeParse({ ...filters, ...patch }).success, false);
});
