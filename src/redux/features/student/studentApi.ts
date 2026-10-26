import { baseApi } from "../../api/baseApi";
import { tagTypes } from "@/redux/tag-types";
import type { ListStudentsQuery, ListStudentsResponse } from "@/types/student.types";

export const studentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStudents: builder.query<ListStudentsResponse, ListStudentsQuery>({
      query: (params) => ({ url: "/students", method: "GET", params }),
      providesTags: [tagTypes.student],
    }),
  }),
});

export const { useGetStudentsQuery } = studentApi;
