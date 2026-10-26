import config from "@/config";
import { login, logout } from "@/redux/features/auth/authSlice";
import type { AuthState, RefreshTokenResponse } from "@/types/auth";
import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";

import { tagTypesList } from "../tag-types";

const mutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${config.host}/api/v1`,

  prepareHeaders: (headers, { getState }) => {
    const { accessToken } = (getState() as { auth: AuthState }).auth;

    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }

    return headers;
  },
});

const getAuthState = (api: Parameters<BaseQueryFn>[1]) =>
  (api.getState() as { auth: AuthState }).auth;

const baseQueryWithReAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const url = typeof args === "string" ? args : args.url;

  const isAuthRoute =
    url === "/auth/login" || url === "/auth/refresh-token";


  if (!isAuthRoute) {
    await mutex.waitForUnlock();
  }

  const originalAccessToken = getAuthState(api).accessToken;

  let result = await rawBaseQuery(args, api, extraOptions);


  if (
    isAuthRoute ||
    result.error?.status !== 401 ||
    !originalAccessToken
  ) {
    return result;
  }

  const release = await mutex.acquire();

  try {
    const currentAuth = getAuthState(api);


    if (currentAuth.accessToken !== originalAccessToken) {
      return rawBaseQuery(args, api, extraOptions);
    }

    const refreshToken = currentAuth.refreshToken;

    if (!refreshToken) {
      api.dispatch(logout());
      api.dispatch(baseApi.util.resetApiState());

      return result;
    }

    const refreshResult = await rawBaseQuery(
      {
        url: "/auth/refresh-token",
        method: "POST",
        body: { refreshToken },
      },
      api,
      extraOptions,
    );


    const latestAuth = getAuthState(api);

    if (
      latestAuth.accessToken !== originalAccessToken ||
      latestAuth.refreshToken !== refreshToken
    ) {
      return result;
    }

    const response = refreshResult.data as RefreshTokenResponse | undefined;

    if (
      !response?.success ||
      !response.data?.accessToken ||
      !response.data.refreshToken ||
      !response.data.user ||
      typeof response.data.expiresIn !== "number"
    ) {
      api.dispatch(logout());
      api.dispatch(baseApi.util.resetApiState());

      return result;
    }

    api.dispatch(login(response.data));


    result = await rawBaseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
      api.dispatch(logout());
      api.dispatch(baseApi.util.resetApiState());
    }

    return result;
  } finally {
    release();
  }
};

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: baseQueryWithReAuth,
  endpoints: () => ({}),
  tagTypes: tagTypesList,
});