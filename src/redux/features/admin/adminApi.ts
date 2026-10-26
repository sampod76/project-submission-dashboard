import { baseApi } from "../../api/baseApi";
import { tagTypes } from "@/redux/tag-types";
import type {
  CreateAdminBody,
  CreateAdminResponse,
  DeleteAdminParams,
  DeleteAdminResponse,
  GetAdminParams,
  GetAdminResponse,
  ListAdminsQuery,
  ListAdminsResponse,
  UpdateAdminBody,
  UpdateAdminParams,
  UpdateAdminResponse,
} from "@/types/admin.types";

const URL = "/admins";

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createAdmin: builder.mutation<CreateAdminResponse, CreateAdminBody>({
      query: (body) => ({ url: URL, method: "POST", body }),
      invalidatesTags: [tagTypes.admin, tagTypes.user],
    }),
    getAdmins: builder.query<ListAdminsResponse, ListAdminsQuery>({
      query: (params) => ({ url: URL, method: "GET", params }),
      providesTags: [tagTypes.admin],
    }),
    getAdminById: builder.query<GetAdminResponse, GetAdminParams["id"]>({
      query: (id) => ({ url: `${URL}/${encodeURIComponent(id)}`, method: "GET" }),
      providesTags: [tagTypes.admin],
    }),
    updateAdmin: builder.mutation<
      UpdateAdminResponse,
      UpdateAdminParams & { body: UpdateAdminBody }
    >({
      query: ({ id, body }) => ({ url: `${URL}/${encodeURIComponent(id)}`, method: "PATCH", body }),
      invalidatesTags: [tagTypes.admin, tagTypes.profile, tagTypes.review],
    }),
    deleteAdmin: builder.mutation<DeleteAdminResponse, DeleteAdminParams["id"]>({
      query: (id) => ({ url: `${URL}/${encodeURIComponent(id)}`, method: "DELETE" }),
      invalidatesTags: [tagTypes.admin, tagTypes.profile, tagTypes.review],
    }),
  }),
});

export const {
  useCreateAdminMutation,
  useGetAdminsQuery,
  useGetAdminByIdQuery,
  useUpdateAdminMutation,
  useDeleteAdminMutation,
} = adminApi;
