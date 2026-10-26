import { baseApi } from "../../api/baseApi";
import { tagTypes } from "@/redux/tag-types";
import type {
  CreateMentorBody,
  CreateMentorResponse,
  ListMentorsQuery,
  ListMentorsResponse,
} from "@/types/mentor.types";

const URL = "/mentors";

export const mentorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMentors: builder.query<ListMentorsResponse, ListMentorsQuery>({
      query: (params) => ({ url: URL, method: "GET", params }),
      providesTags: [tagTypes.mentor],
    }),
    createMentor: builder.mutation<CreateMentorResponse, CreateMentorBody>({
      query: (body) => ({ url: URL, method: "POST", body }),
      invalidatesTags: [tagTypes.mentor, tagTypes.user],
    }),
  }),
});

export const { useGetMentorsQuery, useCreateMentorMutation } = mentorApi;
