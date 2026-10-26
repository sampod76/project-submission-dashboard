import { baseApi } from "@/redux/api/baseApi";
import { tagTypes } from "@/redux/tag-types";
import type {
  CreatePatientPayload,
  PatientDetails,
  UpdatePatientPayload,
  PatientsQueryParams,
  PatientsResponse,
  TPatient,
} from "@/types/patient";
import type { TResponse } from "@/types/global";

const URL = "/patients";

export const patientApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createPatient: builder.mutation<TResponse<Omit<TPatient, "doctor">>, CreatePatientPayload>({
      query: (body) => ({ url: URL, method: "POST", body }),
      invalidatesTags: [tagTypes.patient, tagTypes.doctor],
    }),
    getPatientById: builder.query<TResponse<PatientDetails>, string>({
      query: (id) => ({ url: `${URL}/${id}`, method: "GET" }),
      providesTags: [tagTypes.patient],
    }),
    updatePatient: builder.mutation<
      TResponse<PatientDetails>,
      { id: string; body: UpdatePatientPayload }
    >({
      query: ({ id, body }) => ({ url: `${URL}/${id}`, method: "PATCH", body }),
      invalidatesTags: [tagTypes.patient, tagTypes.doctor],
    }),
    deletePatient: builder.mutation<TResponse<PatientDetails>, string>({
      query: (id) => ({ url: `${URL}/${id}`, method: "DELETE" }),
      invalidatesTags: [tagTypes.patient, tagTypes.doctor],
    }),
    getPatients: builder.query<PatientsResponse, PatientsQueryParams>({
      query: (params) => ({ url: URL, method: "GET", params }),
      providesTags: [tagTypes.patient],
    }),
  }),
});

export const {
  useGetPatientsQuery,
  useCreatePatientMutation,
  useGetPatientByIdQuery,
  useUpdatePatientMutation,
  useDeletePatientMutation,
} = patientApi;
