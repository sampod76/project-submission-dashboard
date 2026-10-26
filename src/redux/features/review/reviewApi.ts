import { baseApi } from "../../api/baseApi";
import { tagTypes } from "@/redux/tag-types";
import type {
  CreateReviewBody,
  CreateReviewParams,
  CreateReviewResponse,
  ListReviewsParams,
  ListReviewsQuery,
  ListReviewsResponse,
} from "@/types/review.types";

export const reviewApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createReview: builder.mutation<
      CreateReviewResponse,
      CreateReviewParams & { body: CreateReviewBody }
    >({
      query: ({ id, body }) => ({
        url: `/submissions/${encodeURIComponent(id)}/reviews`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        tagTypes.review,
        tagTypes.submission,
        tagTypes.submissionStatistics,
        tagTypes.auditLog,
      ],
    }),
    getReviews: builder.query<
      ListReviewsResponse,
      ListReviewsParams & { params?: ListReviewsQuery }
    >({
      query: ({ id, params }) => ({
        url: `/submissions/${encodeURIComponent(id)}/reviews`,
        method: "GET",
        params,
      }),
      providesTags: [tagTypes.review],
    }),
  }),
});

export const { useCreateReviewMutation, useGetReviewsQuery } = reviewApi;
