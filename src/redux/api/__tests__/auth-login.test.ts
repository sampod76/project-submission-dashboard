import assert from "node:assert/strict";
import test from "node:test";
import { configureStore } from "@reduxjs/toolkit";
import type { AuthTokens } from "../../../types/auth.types";
import type { Role } from "../../../types/common.types";

// Synthetic transport fixtures only, never real or demo account credentials.
process.env.NEXT_PUBLIC_BASE_URL ||= "http://localhost:5000";
const roles: Role[] = ["STUDENT", "MENTOR", "ADMIN"];
const tokens = (role: Role, accessToken = "test-access"): AuthTokens => ({
  accessToken,
  refreshToken: "test-refresh",
  expiresIn: 900,
  user: { id: "test-user", email: "test@example.invalid", name: "Test User", role },
});
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const success = (role: Role) => ({
  success: true,
  statusCode: 200,
  message: "Login successful",
  data: tokens(role),
});

test("role login and session transport", async (t) => {
  const { baseApi } = await import("../baseApi");
  const { authApi } = await import("../../features/auth/authApi");
  const { default: authReducer, login, logout } = await import("../../features/auth/authSlice");
  function createStore() {
    return configureStore({
      reducer: { auth: authReducer, [baseApi.reducerPath]: baseApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    });
  }
  const body = { email: "test@example.invalid", password: "test-only-password" };

  for (const expectedRole of roles) {
    for (const actualRole of roles) {
      await t.test(`${expectedRole} tab with ${actualRole} response`, async (t) => {
        const store = createStore();
        const requests: Request[] = [];
        const sessions: string[] = [];
        const unsubscribe = store.subscribe(() => {
          const role = store.getState().auth.user?.role;
          if (role) sessions.push(role);
        });
        t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
          assert.ok(input instanceof Request);
          requests.push(input);
          if (input.url.endsWith("/auth/logout")) {
            assert.equal(input.headers.get("authorization"), "Bearer test-access");
            return json({ success: true, statusCode: 200, message: "Logged out.", data: null });
          }
          assert.ok(input.url.endsWith("/auth/login"));
          assert.equal(input.credentials, "include");
          assert.deepEqual(await input.clone().json(), body);
          return json(success(actualRole));
        });
        try {
          const request = store.dispatch(
            authApi.endpoints.login.initiate({ ...body, expectedRole }),
          );
          if (expectedRole === actualRole) {
            await request.unwrap();
            assert.equal(store.getState().auth.user?.role, actualRole);
            assert.equal(requests.length, 1);
          } else {
            await assert.rejects(request.unwrap(), (error: unknown) => {
              assert.ok(typeof error === "object" && error !== null && "error" in error);
              assert.match(String(error.error), /does not match the selected role/);
              return true;
            });
            assert.equal(store.getState().auth.accessToken, null);
            assert.deepEqual(
              sessions,
              [],
              "a mismatched role must never become an authenticated session",
            );
            assert.equal(requests.length, 2, "mismatch must clear the backend refresh cookie");
          }
          request.reset();
        } finally {
          unsubscribe();
          store.dispatch(baseApi.util.resetApiState());
        }
      });
    }
  }

  for (const failure of [
    "invalid credentials",
    "network error",
    "malformed success",
    "cookie cleanup error",
  ]) {
    await t.test(failure, async (t) => {
      const store = createStore();
      t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
        assert.ok(input instanceof Request);
        if (failure === "network error") throw new TypeError("offline");
        if (failure === "malformed success") return json({ success: true, data: {} });
        if (failure === "cookie cleanup error") {
          return input.url.endsWith("/auth/login")
            ? json(success("ADMIN"))
            : json({ message: "offline" }, 503);
        }
        return json({ success: false, message: "Invalid credentials", errorMessage: [] }, 401);
      });
      try {
        const request = store.dispatch(
          authApi.endpoints.login.initiate({ ...body, expectedRole: "STUDENT" }),
        );
        await assert.rejects(request.unwrap());
        assert.equal(store.getState().auth.user, null);
        assert.equal(store.getState().auth.accessToken, null);
        request.reset();
      } finally {
        store.dispatch(baseApi.util.resetApiState());
      }
    });
  }

  await t.test(
    "401 refresh uses existing token flow and retries with renewed access",
    async (t) => {
      const store = createStore();
      store.dispatch(login(tokens("STUDENT", "expired-access")));
      let refreshes = 0;
      let sessions = 0;
      t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
        assert.ok(input instanceof Request);
        assert.equal(input.credentials, "include");
        if (input.url.endsWith("/auth/refresh-token")) {
          refreshes++;
          assert.deepEqual(await input.clone().json(), { refreshToken: "test-refresh" });
          return json({
            success: true,
            statusCode: 200,
            message: "",
            data: tokens("STUDENT", "renewed-access"),
          });
        }
        assert.ok(input.url.endsWith("/auth/session"));
        sessions++;
        if (input.headers.get("authorization") === "Bearer expired-access")
          return json({ message: "Token expired" }, 401);
        assert.equal(input.headers.get("authorization"), "Bearer renewed-access");
        return json({
          success: true,
          statusCode: 200,
          message: "",
          data: { id: "test-user", email: body.email, role: "STUDENT", isActive: true },
        });
      });
      try {
        const request = store.dispatch(authApi.endpoints.getSession.initiate());
        await request.unwrap();
        assert.equal(refreshes, 1);
        assert.equal(sessions, 2);
        assert.equal(store.getState().auth.accessToken, "renewed-access");
        request.unsubscribe();
      } finally {
        store.dispatch(baseApi.util.resetApiState());
      }
    },
  );

  await t.test(
    "normal logout still sends the stored access token and clears local state",
    async (t) => {
      const store = createStore();
      store.dispatch(login(tokens("ADMIN")));
      t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
        assert.ok(input instanceof Request);
        assert.equal(input.headers.get("authorization"), "Bearer test-access");
        assert.equal(store.getState().auth.user, null);
        return json({ success: true, statusCode: 200, message: "Logged out.", data: null });
      });
      try {
        await store.dispatch(authApi.endpoints.logout.initiate()).unwrap();
        assert.equal(store.getState().auth.accessToken, null);
        store.dispatch(logout());
      } finally {
        store.dispatch(baseApi.util.resetApiState());
      }
    },
  );
});
