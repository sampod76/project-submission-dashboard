import { baseApi } from "../../api/baseApi";
import { getAuthState } from "../../api/auth-session";
import { logout } from "../auth/authSlice";
import { tagTypes } from "@/redux/tag-types";
import type {
  ChangePasswordBody,
  ChangePasswordResponse,
  DeleteUserParams,
  DeleteUserResponse,
  GetOwnProfileResponse,
  GetUserParams,
  GetUserResponse,
  ListUsersQuery,
  ListUsersResponse,
  UpdateOwnProfileBody,
  UpdateOwnProfileResponse,
  UpdateUserBody,
  UpdateUserParams,
  UpdateUserResponse,
  UpdateUserStatusBody,
  UpdateUserStatusParams,
  UpdateUserStatusResponse,
} from "@/types/user.types";

const URL = "/users";

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOwnProfile: builder.query<GetOwnProfileResponse, void>({
      query: () => ({ url: `${URL}/profile`, method: "GET" }),
      providesTags: [tagTypes.profile],
    }),
    updateOwnProfile: builder.mutation<UpdateOwnProfileResponse, UpdateOwnProfileBody>({
      query: (body) => ({ url: `${URL}/profile`, method: "PATCH", body }),
      invalidatesTags: [
        tagTypes.profile,
        tagTypes.admin,
        tagTypes.mentor,
        tagTypes.student,
        tagTypes.submission,
        tagTypes.review,
      ],
    }),
    changePassword: builder.mutation<ChangePasswordResponse, ChangePasswordBody>({
      query: (body) => ({ url: `${URL}/change-password`, method: "PATCH", body }),
    }),
    updateUserStatus: builder.mutation<
      UpdateUserStatusResponse,
      UpdateUserStatusParams & { body: UpdateUserStatusBody }
    >({
      query: ({ id, body }) => ({
        url: `${URL}/${encodeURIComponent(id)}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        tagTypes.user,
        tagTypes.admin,
        tagTypes.mentor,
        tagTypes.student,
        tagTypes.profile,
        tagTypes.auditLog,
      ],
    }),
    getUsers: builder.query<ListUsersResponse, ListUsersQuery>({
      query: (params) => ({ url: URL, method: "GET", params }),
      providesTags: [tagTypes.user],
    }),
    getUserById: builder.query<GetUserResponse, GetUserParams["id"]>({
      query: (id) => ({ url: `${URL}/${encodeURIComponent(id)}`, method: "GET" }),
      providesTags: [tagTypes.user],
    }),
    updateUser: builder.mutation<UpdateUserResponse, UpdateUserParams & { body: UpdateUserBody }>({
      query: ({ id, body }) => ({ url: `${URL}/${encodeURIComponent(id)}`, method: "PATCH", body }),
      invalidatesTags: [
        tagTypes.user,
        tagTypes.admin,
        tagTypes.mentor,
        tagTypes.student,
        tagTypes.profile,
        tagTypes.submission,
        tagTypes.review,
        tagTypes.auditLog,
      ],
      async onQueryStarted({ id, body }, { dispatch, getState, queryFulfilled }) {
        const actor = getAuthState({ getState }).user;
        try {
          await queryFulfilled;
          if (
            actor?.id === id &&
            body.role &&
            body.role !== actor.role &&
            getAuthState({ getState }).user?.id === id
          )
            dispatch(logout());
        } catch {
          return;
        }
      },
    }),
    deleteUser: builder.mutation<DeleteUserResponse, DeleteUserParams["id"]>({
      query: (id) => ({ url: `${URL}/${encodeURIComponent(id)}`, method: "DELETE" }),
      invalidatesTags: [
        tagTypes.user,
        tagTypes.admin,
        tagTypes.mentor,
        tagTypes.student,
        tagTypes.profile,
        tagTypes.submission,
        tagTypes.submissionStatistics,
        tagTypes.review,
      ],
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        const actorId = getAuthState({ getState }).user?.id;
        try {
          await queryFulfilled;
          if (actorId === id && getAuthState({ getState }).user?.id === id) {
            dispatch(logout());
          }
        } catch {
          return;
        }
      },
    }),
  }),
});

export const {
  useGetOwnProfileQuery,
  useUpdateOwnProfileMutation,
  useChangePasswordMutation,
  useUpdateUserStatusMutation,
  useGetUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = userApi;
