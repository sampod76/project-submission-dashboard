import { baseApi } from "../../api/baseApi";
import { legacyUnavailable } from "../../api/legacy-unavailable";
import type { DashboardOverviewResponse } from "@/types/dashboard";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardOverview: builder.query<DashboardOverviewResponse, void>({
      queryFn: legacyUnavailable,
    }),
  }),
});

export const { useGetDashboardOverviewQuery } = dashboardApi;
