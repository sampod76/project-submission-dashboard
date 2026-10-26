import { baseApi } from "@/redux/api/baseApi";
import { tagTypes } from "@/redux/tag-types";
import type { DashboardOverviewResponse } from "@/types/dashboard";

const URL = "/dashboard";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardOverview: builder.query<DashboardOverviewResponse, void>({
      query: () => ({ url: `${URL}/overview`, method: "GET" }),
      providesTags: [tagTypes.doctor, tagTypes.patient],
    }),
  }),
});

export const { useGetDashboardOverviewQuery } = dashboardApi;
