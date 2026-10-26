import assert from "node:assert/strict";
import test from "node:test";
import type { SubmissionCounts } from "../../../types/submission.types";

test("dashboard queries use authenticated statistics and invalidate only when counts can change", async (t) => {
  process.env.NEXT_PUBLIC_BASE_URL = "http://statistics.test";
  const { store } = await import("../../store");
  const { login, logout } = await import("../../features/auth/authSlice");
  const { submissionApi } = await import("../../features/submission/submissionApi");
  const { reviewApi } = await import("../../features/review/reviewApi");
  const originalFetch = globalThis.fetch;
  const requests: Request[] = [];
  let failStatistics = false;
  let failRecent = false;
  let failMutation = false;
  const counts: SubmissionCounts = {
    total: 6,
    pending: 3,
    approved: 2,
    rejected: 1,
    revisionRequired: 0,
  };
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    const path = new URL(request.url).pathname;
    const statistics = path.endsWith("/statistics");
    const recent = path.endsWith("/my");
    if (
      (statistics && failStatistics) ||
      (recent && failRecent) ||
      (!statistics && !recent && failMutation)
    )
      return Response.json({ message: "Temporarily unavailable" }, { status: 503 });
    if (statistics) return Response.json({ success: true, data: { ...counts } });
    if (recent)
      return Response.json({ success: true, data: [], meta: { page: 1, limit: 5, total: 6 } });
    if (request.method === "POST" && path.endsWith("/submissions")) {
      counts.total++;
      counts.pending++;
    } else if (request.method === "DELETE") {
      counts.total--;
      counts.pending--;
    } else if (path.endsWith("/reviews")) {
      counts.pending--;
      counts.approved++;
    }
    return Response.json({ success: true, data: { id: "submission-1" } });
  };
  t.after(() => {
    store.dispatch(logout());
    globalThis.fetch = originalFetch;
  });
  store.dispatch(
    login({
      accessToken: "student-token",
      refreshToken: "refresh-token",
      expiresIn: 3600,
      user: { id: "student-1", role: "STUDENT", email: "student@example.test", name: "Student" },
    }),
  );
  const statistics = store.dispatch(submissionApi.endpoints.getSubmissionStatistics.initiate());
  const recent = store.dispatch(
    submissionApi.endpoints.getMySubmissions.initiate({ page: 1, limit: 5 }),
  );
  const statisticsRequests = () =>
    requests.filter((request) => new URL(request.url).pathname.endsWith("/statistics")).length;
  const settleQueries = () =>
    Promise.all(store.dispatch(submissionApi.util.getRunningQueriesThunk()));

  await t.test(
    "one statistics request and one recent request; no identity/status parameters",
    async () => {
      const [statsResult, recentResult] = await Promise.all([statistics.unwrap(), recent.unwrap()]);
      assert.deepEqual(statsResult.data, counts);
      assert.equal(statsResult.data.revisionRequired, 0);
      assert.equal(recentResult.meta.limit, 5);
      assert.equal(requests.length, 2);
      for (const request of requests) {
        assert.equal(request.headers.get("authorization"), "Bearer student-token");
        const url = new URL(request.url);
        assert.equal(url.search, url.pathname.endsWith("/my") ? "?page=1&limit=5" : "");
      }
    },
  );

  const body = {
    projectName: "Project",
    repoUrl: "https://github.com/student/project",
    liveUrl: "https://example.test",
    description: "Project description",
  };
  await t.test(
    "create/delete/review each refresh statistics once; content edits do not",
    async () => {
      let before = statisticsRequests();
      await store.dispatch(submissionApi.endpoints.createSubmission.initiate(body)).unwrap();
      await settleQueries();
      assert.equal(statisticsRequests(), ++before);
      assert.equal(
        submissionApi.endpoints.getSubmissionStatistics.select()(store.getState()).data?.data.total,
        7,
      );

      await store
        .dispatch(
          submissionApi.endpoints.updateSubmission.initiate({
            id: "submission-1",
            body: { projectName: "Renamed" },
          }),
        )
        .unwrap();
      await settleQueries();
      assert.equal(statisticsRequests(), before);

      await store
        .dispatch(submissionApi.endpoints.deleteSubmission.initiate("submission-1"))
        .unwrap();
      await settleQueries();
      assert.equal(statisticsRequests(), ++before);

      await store
        .dispatch(
          reviewApi.endpoints.createReview.initiate({
            id: "submission-2",
            body: { status: "APPROVED" },
          }),
        )
        .unwrap();
      await settleQueries();
      assert.equal(statisticsRequests(), ++before);
      assert.equal(
        submissionApi.endpoints.getSubmissionStatistics.select()(store.getState()).data?.data
          .approved,
        3,
      );
    },
  );

  await t.test("failed mutations do not refetch statistics", async () => {
    failMutation = true;
    const before = statisticsRequests();
    await store.dispatch(submissionApi.endpoints.createSubmission.initiate(body));
    await store.dispatch(submissionApi.endpoints.deleteSubmission.initiate("submission-1"));
    await store.dispatch(
      reviewApi.endpoints.createReview.initiate({
        id: "submission-2",
        body: { status: "REJECTED" },
      }),
    );
    await settleQueries();
    assert.equal(statisticsRequests(), before);
    failMutation = false;
  });

  await t.test("statistics and recent errors are independent and retry recovers", async () => {
    failStatistics = true;
    assert.ok((await statistics.refetch()).error);
    assert.ok((await recent.refetch()).data);
    failStatistics = false;
    assert.ok((await statistics.refetch()).data);
    failRecent = true;
    assert.ok((await recent.refetch()).error);
    assert.ok((await statistics.refetch()).data);
    failRecent = false;
    assert.ok((await recent.refetch()).data);
  });

  await t.test("switching authenticated students clears the previous statistics cache", () => {
    store.dispatch(
      login({
        accessToken: "other-token",
        refreshToken: "other-refresh",
        expiresIn: 3600,
        user: { id: "student-2", role: "STUDENT", email: "other@example.test", name: "Other" },
      }),
    );
    assert.equal(
      submissionApi.endpoints.getSubmissionStatistics.select()(store.getState()).data,
      undefined,
    );
  });
});
