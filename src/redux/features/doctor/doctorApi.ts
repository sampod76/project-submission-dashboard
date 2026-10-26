import { baseApi } from "../../api/baseApi";
import { legacyUnavailable } from "../../api/legacy-unavailable";
import type {
  DoctorDetails,
  DoctorFormValues,
  DoctorsQueryParams,
  DoctorsResponse,
  TDoctor,
  UpdateDoctorValues,
} from "@/types/doctor";
import type { TResponse } from "@/types/global";

export const doctorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateDoctor: builder.mutation<TResponse<TDoctor>, { id: string; body: UpdateDoctorValues }>({
      queryFn: legacyUnavailable,
    }),
    getDoctorById: builder.query<TResponse<DoctorDetails>, string>({ queryFn: legacyUnavailable }),
    getDoctors: builder.query<DoctorsResponse, DoctorsQueryParams>({ queryFn: legacyUnavailable }),
    createDoctorAccount: builder.mutation<TDoctor, DoctorFormValues>({
      queryFn: legacyUnavailable,
    }),
    deleteDoctor: builder.mutation<TResponse<TDoctor>, string>({ queryFn: legacyUnavailable }),
  }),
});

export const {
  useGetDoctorsQuery,
  useGetDoctorByIdQuery,
  useCreateDoctorAccountMutation,
  useUpdateDoctorMutation,
  useDeleteDoctorMutation,
} = doctorApi;
