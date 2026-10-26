import { tagTypes } from "@/redux/tag-types";
import { baseApi } from "../../api/baseApi";
import type {
  DoctorDetails,
  DoctorFormValues,
  DoctorsQueryParams,
  DoctorsResponse,
  TDoctor,
  UpdateDoctorValues,
} from "@/types/doctor";
import type { TResponse } from "@/types/global";
const URL = "/doctors";

export const doctorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateDoctor: builder.mutation<TResponse<TDoctor>, { id: string; body: UpdateDoctorValues }>({
      query: ({ id, body }) => ({
        url: `${URL}/${encodeURIComponent(id)}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [tagTypes.doctor],
    }),
    getDoctorById: builder.query<TResponse<DoctorDetails>, string>({
      query: (id) => ({ url: `${URL}/${encodeURIComponent(id)}`, method: "GET" }),
      providesTags: [tagTypes.doctor],
    }),
    getDoctors: builder.query<DoctorsResponse, DoctorsQueryParams>({
      query: (params) => ({ url: URL, method: "GET", params }),
      providesTags: [tagTypes.doctor],
    }),
    createDoctorAccount: builder.mutation<TDoctor, DoctorFormValues>({
      query: (body) => ({
        url: URL,
        method: "POST",
        body,
      }),
      invalidatesTags: [tagTypes.doctor],
    }),
    deleteDoctor: builder.mutation<TResponse<TDoctor>, string>({
      query: (id) => ({
        url: `${URL}/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: [tagTypes.doctor],
    }),
  }),
});

export const {
  useGetDoctorsQuery,

  useGetDoctorByIdQuery,
  useCreateDoctorAccountMutation,
  useUpdateDoctorMutation,
  useDeleteDoctorMutation,
} = doctorApi;
