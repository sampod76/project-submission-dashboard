import { baseApi } from "../../api/baseApi";
import { login, setUser } from "./authSlice";
import type {
  AuthState,
  LoginPayload,
  LoginResponse,
  RefreshTokenResponse,
  ProfileResponse,
  ChangePasswordPayload,
  ChangePasswordResponse,
} from "@/types/auth";
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginPayload>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
    }),
    refreshToken: builder.mutation<RefreshTokenResponse, { refreshToken: string }>({
      query: (body) => ({ url: "/auth/refresh-token", method: "POST", body }),
      async onQueryStarted({ refreshToken }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (
            (getState() as unknown as { auth: AuthState }).auth.refreshToken === refreshToken &&
            data.success
          )
            dispatch(login(data.data));
        } catch {

        }
      },
    }),
    getProfile: builder.query<ProfileResponse, void>({
      query: () => ({ url: "/auth/profile", method: "GET" }),
      async onQueryStarted(_, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const current = (getState() as unknown as { auth: AuthState }).auth;
          const user = data.data.user;
          if (data.success && current.accessToken && current.user?.userId === user.userId) {
            dispatch(
              setUser({
                userId: user.userId,
                email: user.email,
                role: user.role,
                name: user.profile?.name ?? current.user.name,
              }),
            );
          }
        } catch {

        }
      },
    }),
    changePassword: builder.mutation<ChangePasswordResponse, ChangePasswordPayload>({
      query: (body) => ({ url: "/auth/change-password", method: "POST", body }),
    }),
  }),
});
export const {
  useLoginMutation,
  useRefreshTokenMutation,
  useGetProfileQuery,
  useChangePasswordMutation,
} = authApi;
