import { baseApi } from "../../api/baseApi";
import { tagTypes } from "@/redux/tag-types";
import type {
  CreateSubmissionBody,
  CreateSubmissionResponse,
  DeleteSubmissionParams,
  DeleteSubmissionResponse,
  GetSubmissionParams,
  GetSubmissionResponse,
  ListMySubmissionsQuery,
  ListMySubmissionsResponse,
  ListSubmissionsQuery,
  ListSubmissionsResponse,
  SubmissionStatisticsResponse,
  UpdateSubmissionBody,
  UpdateSubmissionParams,
  UpdateSubmissionResponse,
} from "@/types/submission.types";

const URL = "/submissions";

export const submissionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createSubmission: builder.mutation<CreateSubmissionResponse, CreateSubmissionBody>({
      query: (body) => ({ url: URL, method: "POST", body }),
      invalidatesTags: [tagTypes.submission, tagTypes.submissionStatistics],
    }),
    getSubmissions: builder.query<ListSubmissionsResponse, ListSubmissionsQuery>({
      query: (params) => ({ url: URL, method: "GET", params }),
      providesTags: [tagTypes.submission],
    }),
    getMySubmissions: builder.query<ListMySubmissionsResponse, ListMySubmissionsQuery>({
      query: (params) => ({ url: `${URL}/my`, method: "GET", params }),
      providesTags: [tagTypes.submission],
    }),
    getSubmissionStatistics: builder.query<SubmissionStatisticsResponse, void>({
      query: () => ({ url: `${URL}/statistics`, method: "GET" }),
      providesTags: [tagTypes.submissionStatistics],
    }),
    getSubmissionById: builder.query<GetSubmissionResponse, GetSubmissionParams["id"]>({
      query: (id) => ({ url: `${URL}/${encodeURIComponent(id)}`, method: "GET" }),
      providesTags: [tagTypes.submission],
    }),
    updateSubmission: builder.mutation<
      UpdateSubmissionResponse,
      UpdateSubmissionParams & { body: UpdateSubmissionBody }
    >({
      query: ({ id, body }) => ({ url: `${URL}/${encodeURIComponent(id)}`, method: "PATCH", body }),
      invalidatesTags: [tagTypes.submission, tagTypes.submissionStatistics],
    }),
    deleteSubmission: builder.mutation<DeleteSubmissionResponse, DeleteSubmissionParams["id"]>({
      query: (id) => ({ url: `${URL}/${encodeURIComponent(id)}`, method: "DELETE" }),
      invalidatesTags: [tagTypes.submission, tagTypes.submissionStatistics, tagTypes.review],
    }),
  }),
});

export const {
  useCreateSubmissionMutation,
  useGetSubmissionsQuery,
  useGetMySubmissionsQuery,
  useGetSubmissionStatisticsQuery,
  useGetSubmissionByIdQuery,
  useUpdateSubmissionMutation,
  useDeleteSubmissionMutation,
} = submissionApi;
