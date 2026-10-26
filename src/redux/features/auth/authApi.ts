import { baseApi } from "../../api/baseApi";
import { tagTypes } from "@/redux/tag-types";
import { getAuthState, isTokenResponse } from "../../api/auth-session";
import { login, logout } from "./authSlice";
import type { Role } from "@/types/common.types";
import type {
  ChangePasswordLegacyBody,
  ChangePasswordLegacyResponse,
  GetAuthProfileResponse,
  LoginBody,
  LoginResponse,
  LogoutResponse,
  RegisterBody,
  RegisterResponse,
  RefreshTokenResponse,
  SessionResponse,
} from "@/types/auth.types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    refreshToken: builder.mutation<RefreshTokenResponse, void>({
      query: () => ({ url: "/auth/refresh-token", method: "POST", body: {} }),
    }),
    getSession: builder.query<SessionResponse, void>({
      query: () => ({ url: "/auth/session", method: "GET" }),
    }),
    register: builder.mutation<RegisterResponse, RegisterBody>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      invalidatesTags: [tagTypes.user, tagTypes.student],
    }),
    login: builder.mutation<LoginResponse, LoginBody & { expectedRole: Role }>({
      async queryFn({ expectedRole, email, password }, _api, _extraOptions, baseQuery) {
        const result = await baseQuery({
          url: "/auth/login",
          method: "POST",
          body: { email, password },
        });
        if (result.error) return { error: result.error };
        if (!isTokenResponse(result.data) || result.data.message !== "Login successful") {
          return { error: { status: "CUSTOM_ERROR", error: "Invalid token response." } };
        }
        if (result.data.data.user.role !== expectedRole) {
          const cleanup = await baseQuery({
            url: "/auth/logout",
            method: "POST",
            headers: { authorization: `Bearer ${result.data.data.accessToken}` },
          });
          const message = cleanup.error
            ? "This account does not match the selected role. Sign out could not be confirmed; please try again."
            : "This account does not match the selected role. Select the correct role and sign in again.";
          return { error: { status: "CUSTOM_ERROR", error: message, data: { message } } };
        }
        return { data: result.data };
      },
      async onQueryStarted(_body, { dispatch, getState, queryFulfilled }) {
        const started = getAuthState({ getState }).sessionVersion;
        try {
          const { data } = await queryFulfilled;
          if (getAuthState({ getState }).sessionVersion === started) dispatch(login(data.data));
        } catch {
          return;
        }
      },
    }),
    logout: builder.mutation<LogoutResponse, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        const actorId = getAuthState({ getState }).user?.id;
        try {
          await queryFulfilled;
        } catch {
          // Local sign-out still completes when cookie cleanup fails.
        } finally {
          if (getAuthState({ getState }).user?.id === actorId) dispatch(logout());
        }
      },
    }),
    getAuthProfile: builder.query<GetAuthProfileResponse, void>({
      query: () => ({ url: "/auth/profile", method: "GET" }),
      providesTags: [tagTypes.profile],
    }),
    changePasswordLegacy: builder.mutation<ChangePasswordLegacyResponse, ChangePasswordLegacyBody>({
      query: (body) => ({ url: "/auth/change-password", method: "POST", body }),
    }),
  }),
});

export const {
  useRefreshTokenMutation,
  useGetSessionQuery,
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetAuthProfileQuery,
  useChangePasswordLegacyMutation,
} = authApi;

export { useChangePasswordMutation } from "../user/userApi";
