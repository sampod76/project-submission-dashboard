// Local database verification: ALLOW_MENTOR_LIVE_WRITES=1 plus MENTOR_TEST_EMAIL/PASSWORD.
// Creates synthetic Student accounts, projects and reviews. Finally soft-deletes test accounts.
// Review/audit records remain as backend history; there is no hard-delete API.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

if (process.env.ALLOW_MENTOR_LIVE_WRITES !== "1")
  throw new Error("Set ALLOW_MENTOR_LIVE_WRITES=1 to enable local verification writes.");
const origin = process.env.MENTOR_TEST_ORIGIN || "http://localhost:5000";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw new Error("Only a local backend is supported.");
const email = process.env.MENTOR_TEST_EMAIL;
const password = process.env.MENTOR_TEST_PASSWORD;
if (!email || !password)
  throw new Error("Provide the local Mentor test credentials through environment variables.");
const run = randomUUID();
const testUsers = [];
let token;
let refreshCookie;
const mark = (message) => console.log(`PASS ${message}`);
async function request(path, { method = "GET", body, bearer = token, cookie } = {}) {
  const response = await fetch(`${origin}/api/v1${path}`, {
    method,
    headers: {
      Origin: "http://localhost:3000",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
async function expect(path, options, code = 200) {
  const result = await request(path, options);
  assert.equal(
    result.status,
    code,
    `${options?.method ?? "GET"} ${path}: ${result.data.message ?? "Unexpected status"}`,
  );
  return result;
}
try {
  const signedIn = await expect("/auth/login", {
    method: "POST",
    bearer: null,
    body: { email, password },
  });
  assert.equal(signedIn.data.data.user.role, "MENTOR");
  token = signedIn.data.data.accessToken;
  refreshCookie = signedIn.cookie;
  assert.ok(refreshCookie?.startsWith("refreshToken="));
  const mentorId = signedIn.data.data.user.id;
  const refreshed = await expect("/auth/refresh-token", {
    method: "POST",
    bearer: null,
    cookie: refreshCookie,
    body: {},
  });
  token = refreshed.data.data.accessToken;
  refreshCookie = refreshed.cookie;
  assert.equal((await expect("/auth/session")).data.data.id, mentorId);
  const profile = (await expect("/users/profile")).data.data;
  assert.equal(profile.role, "MENTOR");
  assert.ok(profile.mentor);
  assert.notEqual(profile.mentor.id, mentorId);
  mark("Mentor login, refresh cookie, session and own profile with distinct profile/User IDs");
  await expect("/admins", undefined, 403);
  await expect("/mentors", undefined, 403);
  await expect(`/users/${mentorId}`, undefined, 403);
  assert.deepEqual((await expect("/users?role=ADMIN")).data.data, []);
  mark("Admin/mentor directories, staff account access and unrestricted user results denied");

  const studentPassword = `Phase2Test${run.replaceAll("-", "")}!`;
  const studentEmail = `phase2-mentor-${run}@example.invalid`;
  const registration = (
    await expect(
      "/auth/register",
      {
        method: "POST",
        bearer: null,
        body: {
          email: studentEmail,
          password: studentPassword,
          firstName: "PhaseTwo",
          lastName: "Verification",
        },
      },
      201,
    )
  ).data.data;
  testUsers.push(registration.id);
  const studentToken = (
    await expect("/auth/login", {
      method: "POST",
      bearer: null,
      body: { email: studentEmail, password: studentPassword },
    })
  ).data.data.accessToken;
  const students = (
    await expect(
      `/students?searchTerm=${encodeURIComponent(studentEmail)}&page=1&limit=10&sortBy=firstName&sortOrder=asc`,
    )
  ).data;
  assert.equal(students.meta.total, 1);
  assert.equal(students.data[0].userId, registration.id);
  assert.notEqual(students.data[0].id, registration.id);
  const users = (
    await expect(
      `/users?search=${encodeURIComponent(studentEmail)}&role=STUDENT&isActive=true&page=1&limit=10&sortBy=email&sortOrder=asc`,
    )
  ).data;
  assert.equal(users.meta.total, 1);
  assert.ok(users.data.every((row) => row.role === "STUDENT"));
  assert.equal((await expect(`/users/${registration.id}`)).data.data.role, "STUDENT");
  await expect(`/users/${registration.id}`, { method: "PATCH", body: { role: "MENTOR" } }, 403);
  mark(
    "Student directory search/sort/pagination, account filters/details and role escalation denial",
  );

  const baseline = (await expect("/submissions/statistics")).data.data;
  const projects = [];
  for (let index = 0; index < 3; index++) {
    const result = await expect(
      "/submissions",
      {
        method: "POST",
        bearer: studentToken,
        body: {
          projectName: `PhaseTwo ${run} ${index}`,
          repoUrl: `https://github.com/phase2-${run}/project-${index}`,
          liveUrl: "https://example.invalid",
          description: "Synthetic Mentor workflow verification project.",
        },
      },
      201,
    );
    projects.push(result.data.data);
  }
  const queue = (
    await expect(
      `/submissions?searchTerm=${run}&status=PENDING&page=1&limit=2&sortBy=projectName&sortOrder=asc`,
    )
  ).data;
  assert.equal(queue.meta.total, 3);
  assert.equal(queue.data.length, 2);
  assert.equal((await expect(`/submissions?searchTerm=${run}&page=2&limit=2`)).data.data.length, 1);
  assert.equal(
    (await expect(`/submissions/${projects[0].id}`)).data.data.description,
    projects[0].description,
  );
  assert.equal(
    (await expect(`/submissions/${projects[0].id}/reviews?page=1&limit=10`)).data.meta.total,
    0,
  );
  assert.equal((await expect("/submissions/statistics")).data.data.total, baseline.total + 3);
  mark(
    "Student submission creation preserved; Mentor real queue search/status/sort/pagination/detail/statistics",
  );

  for (const [index, status] of ["APPROVED", "REJECTED"].entries()) {
    const review = (
      await expect(
        `/submissions/${projects[index].id}/reviews`,
        {
          method: "POST",
          body: { status, feedback: index ? null : "Verified project requirements." },
        },
        201,
      )
    ).data.data;
    assert.equal(review.status, status);
    assert.equal(review.previousStatus, "PENDING");
    assert.equal(review.reviewerUserId, mentorId);
    const history = (await expect(`/submissions/${projects[index].id}/reviews?page=1&limit=10`))
      .data;
    assert.equal(history.meta.total, 1);
    assert.equal(history.data[0].status, status);
    assert.equal((await expect(`/submissions/${projects[index].id}`)).data.data.status, status);
  }
  const race = await Promise.all(
    ["APPROVED", "REJECTED"].map((status) =>
      request(`/submissions/${projects[2].id}/reviews`, { method: "POST", body: { status } }),
    ),
  );
  assert.deepEqual(race.map((result) => result.status).sort(), [201, 409]);
  await expect(
    `/submissions/${projects[0].id}/reviews`,
    { method: "POST", body: { status: "REJECTED" } },
    409,
  );
  const totals = (await expect("/submissions/statistics")).data.data;
  assert.equal(totals.pending, baseline.pending);
  assert.equal(totals.approved + totals.rejected, baseline.approved + baseline.rejected + 3);
  await expect(`/submissions/${projects[0].id}/reviews`, { bearer: studentToken }, 403);
  mark(
    "approve/reject, nullable feedback, parent history, duplicate/concurrent 409, final status and fresh totals",
  );

  const logs = (
    await expect(
      `/audit-logs?entityId=${projects[0].id}&action=SUBMISSION_REVIEWED&entityType=Submission&actorUserId=${mentorId}&page=1&limit=10&sortBy=createdAt&sortOrder=desc`,
    )
  ).data;
  assert.equal(logs.meta.total, 1);
  assert.ok(
    logs.data.every(
      (log) =>
        log.actorUserId === mentorId &&
        log.action === "SUBMISSION_REVIEWED" &&
        log.entityType === "Submission",
    ),
  );
  assert.equal(
    (await expect(`/audit-logs/${logs.data[0].id}`)).data.data.newData.status,
    "APPROVED",
  );
  assert.deepEqual((await expect("/audit-logs?action=USER_STATUS_CHANGED")).data.data, []);
  assert.deepEqual((await expect(`/audit-logs?actorUserId=${registration.id}`)).data.data, []);
  mark("own review audit filtering/detail; account-status and other-actor activity excluded");

  const changedEmail = `phase2-updated-${run}@example.invalid`;
  const changedPassword = `NewPhase2${run.replaceAll("-", "")}!`;
  await expect(`/users/${registration.id}`, {
    method: "PATCH",
    body: { email: changedEmail, password: changedPassword },
  });
  await expect("/auth/login", {
    method: "POST",
    bearer: null,
    body: { email: changedEmail, password: changedPassword },
  });
  await expect(`/users/${registration.id}/status`, { method: "PATCH", body: { isActive: false } });
  await expect("/auth/session", { bearer: studentToken }, 403);
  await expect(
    "/auth/login",
    { method: "POST", bearer: null, body: { email: changedEmail, password: changedPassword } },
    401,
  );
  await expect(`/users/${registration.id}/status`, { method: "PATCH", body: { isActive: true } });
  await expect("/auth/session", { bearer: studentToken });
  // Shared self-service APIs exercised on the disposable Student, preserving seeded Mentor credentials.
  await expect("/users/profile", {
    method: "PATCH",
    bearer: studentToken,
    body: { bio: "Shared profile API verification", phone: null },
  });
  const finalPassword = `FinalPhase2${run.replaceAll("-", "")}!`;
  await expect("/users/change-password", {
    method: "PATCH",
    bearer: studentToken,
    body: { currentPassword: changedPassword, newPassword: finalPassword },
  });
  await expect("/auth/login", {
    method: "POST",
    bearer: null,
    body: { email: changedEmail, password: finalPassword },
  });
  mark(
    "Student email/password update, deactivate/reactivate, inactive session denial; shared own-profile/password APIs",
  );
} finally {
  if (token) {
    for (const id of testUsers) {
      const removed = await expect(`/users/${id}`, { method: "DELETE" });
      assert.equal(removed.data.data, null);
      await expect(`/users/${id}`, undefined, 404);
    }
    if (testUsers.length)
      mark("Student account deletion and missing-record handling; synthetic accounts cleaned up");
    const signedOut = await expect("/auth/logout", { method: "POST", cookie: refreshCookie });
    assert.ok(signedOut.cookie?.startsWith("refreshToken="));
    mark("Mentor logout clears refresh cookie");
  }
}
