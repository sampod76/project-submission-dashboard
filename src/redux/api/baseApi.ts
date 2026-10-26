import config from "@/config";
import { login, logout } from "@/redux/features/auth/authSlice";
import type { RefreshTokenBody } from "@/types/auth.types";
import {
  createApi,
  fetchBaseQuery,
  type BaseQueryApi,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { tagTypesList } from "../tag-types";
import { getAuthState, isTokenResponse } from "./auth-session";

const publicUrls = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh-token",
  `${config.host}/health`,
]);
const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${config.host}/api/v1`,
  credentials: "include",
  prepareHeaders: (headers, api) => {
    const { accessToken } = getAuthState(api);
    const url = typeof api.arg === "string" ? api.arg : api.arg.url;
    if (accessToken && !publicUrls.has(url)) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }
    return headers;
  },
});

type RawResult = Awaited<ReturnType<typeof rawBaseQuery>>;
type ExtraOptions = Parameters<typeof rawBaseQuery>[2];

const pendingRefresh = new WeakMap<BaseQueryApi["dispatch"], Promise<RawResult>>();
const staleSession = (): RawResult => ({
  error: { status: "CUSTOM_ERROR", error: "Session changed while the request was in flight." },
});

async function refreshSession(
  api: BaseQueryApi,
  extraOptions: ExtraOptions,
  body: RefreshTokenBody,
): Promise<RawResult> {
  const pending = pendingRefresh.get(api.dispatch);
  if (pending) return pending;

  const started = getAuthState(api).sessionVersion;
  const request = (async (): Promise<RawResult> => {
    const result = await rawBaseQuery(
      { url: "/auth/refresh-token", method: "POST", body },
      api,
      extraOptions,
    );
    if (getAuthState(api).sessionVersion !== started) return staleSession();
    if (!isTokenResponse(result.data)) {
      api.dispatch(logout());
      if (!result.error) {
        return { error: { status: "CUSTOM_ERROR", error: "Invalid token response." } };
      }
    }
    return result;
  })();

  pendingRefresh.set(api.dispatch, request);
  try {
    return await request;
  } finally {
    pendingRefresh.delete(api.dispatch);
  }
}

const baseQueryWithReAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const url = typeof args === "string" ? args : args.url;

  if (url === "/auth/refresh-token") {
    const body: RefreshTokenBody = typeof args !== "string" ? (args.body ?? {}) : {};
    return refreshSession(api, extraOptions, body);
  }

  if (url === "/auth/logout") {
    const { accessToken } = getAuthState(api);
    const headers =
      typeof args !== "string" && args.headers
        ? args.headers
        : accessToken
          ? { authorization: `Bearer ${accessToken}` }
          : undefined;

    api.dispatch(logout());
    return rawBaseQuery(
      {
        url,
        method: "POST",
        headers,
      },
      api,
      extraOptions,
    );
  }

  const isPublic = publicUrls.has(url);
  if (!isPublic) await pendingRefresh.get(api.dispatch);
  const started = getAuthState(api);
  let result = await rawBaseQuery(args, api, extraOptions);
  const current = getAuthState(api);

  if (url === "/auth/login") {
    if (current.sessionVersion !== started.sessionVersion) return staleSession();
    if (!result.error && !isTokenResponse(result.data)) {
      return { error: { status: "CUSTOM_ERROR", error: "Invalid token response." } };
    }
    return result;
  }

  if (isPublic) return result;
  if (
    current.user?.id !== started.user?.id ||
    current.user?.role !== started.user?.role ||
    (current.sessionVersion !== started.sessionVersion && !current.accessToken)
  ) {
    return staleSession();
  }
  if (result.error?.status !== 401 || !started.accessToken) return result;

  if (current.sessionVersion === started.sessionVersion) {
    const renewed = await refreshSession(
      api,
      extraOptions,
      current.refreshToken ? { refreshToken: current.refreshToken } : {},
    );
    if (renewed.error) return result;
    if (
      getAuthState(api).sessionVersion === current.sessionVersion &&
      isTokenResponse(renewed.data)
    ) {
      api.dispatch(login(renewed.data.data));
    }
  }

  const retrySession = getAuthState(api);
  if (!retrySession.accessToken) return result;
  if (
    retrySession.user?.id !== started.user?.id ||
    retrySession.user?.role !== started.user?.role
  ) {
    return staleSession();
  }
  result = await rawBaseQuery(args, api, extraOptions);
  if (getAuthState(api).sessionVersion !== retrySession.sessionVersion) return staleSession();
  if (result.error?.status === 401) api.dispatch(logout());
  return result;
};

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: baseQueryWithReAuth,
  endpoints: () => ({}),
  tagTypes: tagTypesList,
});
