import { baseApi } from "../../api/baseApi";
import { legacyUnavailable } from "../../api/legacy-unavailable";
import type {
  CreatePatientPayload,
  PatientDetails,
  UpdatePatientPayload,
  PatientsQueryParams,
  PatientsResponse,
  TPatient,
} from "@/types/patient";
import type { TResponse } from "@/types/global";

export const patientApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createPatient: builder.mutation<TResponse<Omit<TPatient, "doctor">>, CreatePatientPayload>({
      queryFn: legacyUnavailable,
    }),
    getPatientById: builder.query<TResponse<PatientDetails>, string>({
      queryFn: legacyUnavailable,
    }),
    updatePatient: builder.mutation<
      TResponse<PatientDetails>,
      { id: string; body: UpdatePatientPayload }
    >({
      queryFn: legacyUnavailable,
    }),
    deletePatient: builder.mutation<TResponse<PatientDetails>, string>({
      queryFn: legacyUnavailable,
    }),
    getPatients: builder.query<PatientsResponse, PatientsQueryParams>({
      queryFn: legacyUnavailable,
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
