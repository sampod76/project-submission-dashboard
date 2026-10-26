import assert from "node:assert/strict";
import test from "node:test";

test("Mentor APIs serialize exact contracts, refresh dependent caches, and recover sessions once", async (t) => {
  process.env.NEXT_PUBLIC_BASE_URL = "http://mentor.test";
  const { store } = await import("../../store");
  const { login, logout } = await import("../../features/auth/authSlice");
  const { submissionApi } = await import("../../features/submission/submissionApi");
  const { reviewApi } = await import("../../features/review/reviewApi");
  const { userApi } = await import("../../features/user/userApi");
  const { studentApi } = await import("../../features/student/studentApi");
  const { auditLogApi } = await import("../../features/auditLog/auditLogApi");
  const { authApi } = await import("../../features/auth/authApi");
  const originalFetch = globalThis.fetch;
  const requests: Request[] = [];
  const subscriptions: { unsubscribe: () => void }[] = [];
  const user = {
    id: "mentor-user",
    email: "mentor@example.test",
    role: "MENTOR" as const,
    name: "Mentor",
  };
  const tokens = {
    accessToken: "mentor-token",
    refreshToken: "refresh-token",
    expiresIn: 3600,
    user,
  };
  let mutationStatus = 201;
  let refreshed = false;
  let refreshFails = false;
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    const url = new URL(request.url);
    if (url.pathname.endsWith("/refresh-token")) {
      if (refreshFails)
        return Response.json({ success: false, message: "Invalid refresh token" }, { status: 401 });
      await new Promise((resolve) => setTimeout(resolve, 20));
      refreshed = true;
      return Response.json({ success: true, statusCode: 200, message: "", data: tokens });
    }
    if (url.pathname.endsWith("/login"))
      return Response.json({
        success: true,
        statusCode: 200,
        message: "Login successful",
        data: tokens,
      });
    if (request.headers.get("authorization") === "Bearer expired")
      return Response.json({ success: false, message: "Token expired" }, { status: 401 });
    if (request.method === "POST" && url.pathname.endsWith("/reviews"))
      return Response.json(
        mutationStatus === 201
          ? { success: true, data: { status: "APPROVED" } }
          : {
              success: false,
              message:
                mutationStatus === 409 ? "Submission already reviewed or changed" : "Unavailable",
            },
        { status: mutationStatus },
      );
    if (url.pathname.endsWith("/statistics"))
      return Response.json({
        success: true,
        data: { total: 3, pending: 1, approved: 1, rejected: 1, revisionRequired: 0 },
      });
    if (request.method === "DELETE")
      return Response.json({ success: true, statusCode: 200, data: null });
    if (url.pathname.endsWith("/submissions/project-id"))
      return Response.json({ success: true, data: { id: "project-id", status: "PENDING" } });
    return Response.json({ success: true, data: [], meta: { page: 2, limit: 20, total: 41 } });
  };
  t.after(() => {
    subscriptions.forEach((s) => s.unsubscribe());
    store.dispatch(logout());
    globalThis.fetch = originalFetch;
  });
  store.dispatch(login(tokens));
  const settle = async () => {
    await Promise.all(store.dispatch(submissionApi.util.getRunningQueriesThunk()));
  };
  const count = (suffix: string) =>
    requests.filter((r) => new URL(r.url).pathname.endsWith(suffix) && r.method === "GET").length;

  await t.test(
    "list queries use only documented keys, User IDs, and parent-scoped review URLs",
    async () => {
      const queue = store.dispatch(
        submissionApi.endpoints.getSubmissions.initiate({
          page: 2,
          limit: 20,
          searchTerm: "portal",
          status: "PENDING",
          sortBy: "projectName",
          sortOrder: "asc",
        }),
      );
      const stats = store.dispatch(submissionApi.endpoints.getSubmissionStatistics.initiate());
      const detail = store.dispatch(
        submissionApi.endpoints.getSubmissionById.initiate("project-id"),
      );
      const reviews = store.dispatch(
        reviewApi.endpoints.getReviews.initiate({
          id: "project-id",
          params: { page: 2, limit: 20 },
        }),
      );
      const audit = store.dispatch(
        auditLogApi.endpoints.getAuditLogs.initiate({
          page: 2,
          limit: 20,
          actorUserId: user.id,
          action: "SUBMISSION_REVIEWED",
          entityType: "Submission",
        }),
      );
      subscriptions.push(queue, stats, detail, reviews, audit);
      await Promise.all([
        queue.unwrap(),
        stats.unwrap(),
        detail.unwrap(),
        reviews.unwrap(),
        audit.unwrap(),
      ]);
      assert.deepEqual((await queue.unwrap()).meta, { page: 2, limit: 20, total: 41 });
      const request = requests.find(
        (r) => new URL(r.url).searchParams.get("searchTerm") === "portal",
      )!;
      assert.equal(
        new URL(request.url).search,
        "?page=2&limit=20&searchTerm=portal&status=PENDING&sortBy=projectName&sortOrder=asc",
      );
      const history = requests.find((r) =>
        new URL(r.url).pathname.endsWith("/project-id/reviews"),
      )!;
      assert.equal(new URL(history.url).search, "?page=2&limit=20");
      for (const r of requests) assert.equal(r.headers.get("authorization"), "Bearer mentor-token");
    },
  );
  await t.test(
    "successful reviews AND 409 conflicts refresh details, queue, stats, reviews and audit",
    async () => {
      for (const code of [201, 409]) {
        mutationStatus = code;
        const suffixes = ["/submissions", "/statistics", "/project-id", "/reviews", "/audit-logs"];
        const before = suffixes.map(count);
        const mutation = store.dispatch(
          reviewApi.endpoints.createReview.initiate({
            id: "project-id",
            body: { status: "APPROVED", feedback: null },
          }),
        );
        const result = await mutation;
        await settle();
        assert.equal(Boolean(result.error), code === 409);
        for (const [index, suffix] of suffixes.entries())
          assert.equal(count(suffix), before[index] + 1, suffix);
        const sent = requests
          .filter((r) => r.method === "POST" && r.url.endsWith("/reviews"))
          .at(-1)!;
        assert.deepEqual(await sent.clone().json(), { status: "APPROVED", feedback: null });
        mutation.reset();
      }
      mutationStatus = 503;
      const before = count("/statistics");
      await store.dispatch(
        reviewApi.endpoints.createReview.initiate({
          id: "project-id",
          body: { status: "REJECTED" },
        }),
      );
      await settle();
      assert.equal(count("/statistics"), before);
    },
  );
  await t.test(
    "concurrent expired requests use one refresh and one retry per request",
    async () => {
      store.dispatch(login({ ...tokens, accessToken: "expired" }));
      const before = requests.length;
      const accounts = store.dispatch(
        userApi.endpoints.getUsers.initiate({
          page: 1,
          limit: 10,
          role: "STUDENT",
          isActive: "false",
          search: "student",
        }),
      );
      const directory = store.dispatch(
        studentApi.endpoints.getStudents.initiate({ page: 1, limit: 10, searchTerm: "Ada" }),
      );
      subscriptions.push(accounts, directory);
      await Promise.all([accounts.unwrap(), directory.unwrap()]);
      assert.equal(refreshed, true);
      const batch = requests.slice(before);
      assert.equal(batch.filter((r) => r.url.endsWith("/refresh-token")).length, 1);
      assert.equal(
        batch.filter((r) => r.headers.get("authorization") === "Bearer expired").length,
        2,
      );
      assert.equal(
        batch.filter((r) => r.headers.get("authorization") === "Bearer mentor-token").length,
        2,
      );
    },
  );
  await t.test("mismatched login tab never authenticates and performs server logout", async () => {
    store.dispatch(logout());
    const result = await store.dispatch(
      authApi.endpoints.login.initiate({
        email: user.email,
        password: "example",
        expectedRole: "ADMIN",
      }),
    );
    assert.ok(result.error);
    assert.equal(store.getState().auth.user, null);
    const cleanup = requests.find((r) => r.url.endsWith("/auth/logout"))!;
    assert.equal(cleanup.headers.get("authorization"), "Bearer mentor-token");
  });
  await t.test(
    "an absent refresh cookie returns an observable 401 for anonymous bootstrap",
    async () => {
      refreshFails = true;
      const operation = store.dispatch(authApi.endpoints.refreshToken.initiate());
      const result = await operation;
      assert.equal(
        result.error && "status" in result.error
          ? result.error.status
          : JSON.stringify(result.error),
        401,
      );
      operation.reset();
    },
  );
  await t.test(
    "logout finishes its cookie request before clearing local session and caches",
    async () => {
      store.dispatch(login(tokens));
      const operation = store.dispatch(authApi.endpoints.logout.initiate());
      const result = await operation;
      assert.equal(result.error, undefined);
      assert.equal(store.getState().auth.user, null);
      const last = requests.at(-1)!;
      assert.equal(new URL(last.url).pathname, "/api/v1/auth/logout");
      assert.equal(last.headers.get("authorization"), "Bearer mentor-token");
      operation.reset();
    },
  );
});
