// Explicitly opt in: ALLOW_STUDENT_LIVE_WRITES=1 node scripts/verify-student-live.mjs
// Uses synthetic accounts/projects. Projects are deleted in finally; the API has no Student account deletion.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

if (process.env.ALLOW_STUDENT_LIVE_WRITES !== "1")
  throw new Error("Set ALLOW_STUDENT_LIVE_WRITES=1 to run the local backend write checks.");
const origin = process.env.STUDENT_TEST_ORIGIN || "http://localhost:5000";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw new Error("This verification script only writes to a local backend.");
const base = `${origin}/api/v1`;
const run = randomUUID();
const accounts = [];
const projects = [];
const verified = [];
const mark = (name) => {
  verified.push(name);
  console.log(`PASS ${name}`);
};
async function request(path, { method = "GET", body, token, cookie } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      Origin: "http://localhost:3000",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  return {
    status: response.status,
    data,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
async function expect(path, options, status = 200) {
  const result = await request(path, options);
  assert.equal(
    result.status,
    status,
    `${options?.method || "GET"} ${path}: ${result.data.message || "Unexpected response"}`,
  );
  return result;
}
try {
  for (let index = 0; index < 2; index++) {
    const email = `phase1-live-${run}-${index}@example.invalid`;
    const password = `Phase1Test${randomUUID().replaceAll("-", "")}!`;
    const registration = await expect(
      "/auth/register",
      { method: "POST", body: { email, password, firstName: "Phase", lastName: "Verification" } },
      201,
    );
    assert.equal(registration.data.data.role, "STUDENT");
    assert.equal("accessToken" in registration.data.data, false);
    assert.equal(registration.cookie, undefined);
    const login = await expect("/auth/login", { method: "POST", body: { email, password } });
    const account = {
      email,
      password,
      token: login.data.data.accessToken,
      cookie: login.cookie,
      userId: login.data.data.user.id,
    };
    assert.ok(account.cookie?.startsWith("refreshToken="));
    accounts.push(account);
  }
  mark("registration creates Student without login; login returns server role and refresh cookie");
  const [account, other] = accounts;
  const auth = { token: account.token };
  await expect(
    "/auth/register",
    {
      method: "POST",
      body: {
        email: account.email,
        password: account.password,
        firstName: "Phase",
        lastName: "Verification",
      },
    },
    409,
  );
  await expect(
    "/auth/login",
    { method: "POST", body: { email: account.email, password: "WrongPassword123!" } },
    401,
  );
  mark("duplicate email and incorrect credentials");
  const refreshed = await expect("/auth/refresh-token", {
    method: "POST",
    body: {},
    cookie: account.cookie,
  });
  account.token = refreshed.data.data.accessToken;
  account.cookie = refreshed.cookie;
  auth.token = account.token;
  const session = await expect("/auth/session", auth);
  assert.equal(session.data.data.id, account.userId);
  assert.equal(session.data.data.role, "STUDENT");
  const profile = await expect("/users/profile", auth);
  assert.ok(profile.data.data.student);
  assert.notEqual(profile.data.data.student.id, account.userId);
  mark("cookie-only refresh, active session, own profile and distinct User/Profile IDs");
  for (const path of ["/users", "/students", "/mentors", "/admins", "/submissions", "/audit-logs"])
    await expect(path, auth, 403);
  mark("Student is denied management endpoints");
  const zeroCounts = { total: 0, pending: 0, approved: 0, rejected: 0, revisionRequired: 0 };
  const initialStatistics = await expect("/submissions/statistics", auth);
  assert.deepEqual(initialStatistics.data.data, zeroCounts);
  mark("Student statistics supports authenticated requests and valid zero counts");
  for (let index = 0; index < 12; index++) {
    const body = {
      projectName: `Phase 1 verification ${index + 1}`,
      repoUrl: `https://github.com/phase1-verification/${run}-${index}`,
      liveUrl: "https://example.invalid",
      description: "Disposable local Student workflow verification project.",
    };
    const created = await expect("/submissions", { ...auth, method: "POST", body }, 201);
    assert.equal(created.data.data.status, "PENDING");
    assert.equal(created.data.data.student.userId, account.userId);
    projects.push({ id: created.data.data.id, token: account.token, body });
  }
  mark("project creation derives owner and PENDING status");
  const statistics = await expect("/submissions/statistics", auth);
  assert.deepEqual(statistics.data.data, { ...zeroCounts, total: 12, pending: 12 });
  const otherStatistics = await expect("/submissions/statistics", { token: other.token });
  assert.deepEqual(otherStatistics.data.data, zeroCounts);
  const recent = await expect("/submissions/my?page=1&limit=5", auth);
  assert.equal(recent.data.data.length, 5);
  assert.ok(
    recent.data.data.every(
      (item, index, items) =>
        index === 0 || Date.parse(items[index - 1].createdAt) >= Date.parse(item.createdAt),
    ),
  );
  mark("statistics are scoped to the authenticated Student; recent list returns latest five");
  await expect("/submissions", { ...auth, method: "POST", body: projects[0].body }, 409);
  mark("duplicate repository returns 409");
  const first = await expect("/submissions/my?page=1&limit=10", auth);
  assert.equal(first.data.data.length, 10);
  assert.equal(first.data.meta.total, 12);
  const second = await expect("/submissions/my?page=2&limit=10&status=PENDING", auth);
  assert.equal(second.data.data.length, 2);
  assert.equal(second.data.meta.total, 12);
  const empty = await expect("/submissions/my?page=1&limit=10&status=APPROVED", auth);
  assert.equal(empty.data.meta.total, 0);
  await expect("/submissions/my?searchTerm=test", auth, 400);
  const otherList = await expect("/submissions/my?page=1&limit=10", { token: other.token });
  assert.equal(otherList.data.meta.total, 0);
  mark("server pagination across two pages, status filtering, exact totals and own-only lists");
  const target = projects[0];
  await expect(`/submissions/${target.id}`, { token: other.token }, 403);
  await expect(
    `/submissions/${target.id}`,
    { token: other.token, method: "PATCH", body: { projectName: "Forbidden" } },
    403,
  );
  await expect(`/submissions/${target.id}`, { token: other.token, method: "DELETE" }, 403);
  await expect(`/submissions/${target.id}/reviews`, auth, 403);
  mark("another Student cannot view/edit/delete owned project; review history is denied");
  const detail = await expect(`/submissions/${target.id}`, auth);
  assert.equal(detail.data.data.repoUrl, target.body.repoUrl);
  const updated = await expect(`/submissions/${target.id}`, {
    ...auth,
    method: "PATCH",
    body: { projectName: "Updated verification project", description: "Updated description." },
  });
  assert.equal(updated.data.data.description, "Updated description.");
  await expect(
    `/submissions/${target.id}`,
    { ...auth, method: "PATCH", body: { status: "APPROVED" } },
    400,
  );
  mark("authorized project detail/update; status injection rejected");
  const changed = await expect("/users/profile", {
    ...auth,
    method: "PATCH",
    body: { firstName: "Updated", phone: "123456", bio: "Verification profile" },
  });
  assert.equal(changed.data.data.student.firstName, "Updated");
  const cleared = await expect("/users/profile", {
    ...auth,
    method: "PATCH",
    body: { phone: null, bio: null },
  });
  assert.equal(cleared.data.data.student.phone, null);
  assert.equal(cleared.data.data.student.bio, null);
  mark("own profile changes and nullable clearing");
  await expect(
    "/users/change-password",
    {
      ...auth,
      method: "PATCH",
      body: { currentPassword: "WrongCurrent1!", newPassword: "NewPhase1Password2026!" },
    },
    400,
  );
  await expect("/users/change-password", {
    ...auth,
    method: "PATCH",
    body: { currentPassword: account.password, newPassword: "NewPhase1Password2026!" },
  });
  account.password = "NewPhase1Password2026!";
  await expect("/auth/login", {
    method: "POST",
    body: { email: account.email, password: account.password },
  });
  mark("password validation/change and login using replacement password");
} finally {
  for (const project of projects) {
    const result = await request(`/submissions/${project.id}`, {
      token: project.token,
      method: "DELETE",
    });
    assert.equal(result.status, 200, "Clean up verification project");
    await expect(`/submissions/${project.id}`, { token: project.token }, 404);
  }
  if (projects.length)
    mark("owned PENDING deletion and missing detail afterward; all test projects cleaned up");
  for (const account of accounts) {
    const signedOut = await expect("/auth/logout", {
      method: "POST",
      token: account.token,
      cookie: account.cookie,
    });
    assert.equal(signedOut.cookie, "refreshToken=");
  }
  if (accounts.length) mark("logout clears refresh cookie");
  console.log(
    JSON.stringify({
      checks: verified.length,
      projectsRemoved: projects.length,
      syntheticAccountsRetained: accounts.length,
    }),
  );
}
