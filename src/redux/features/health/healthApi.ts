import config from "@/config";
import { baseApi } from "../../api/baseApi";
import type { HealthResponse } from "@/types/health.types";

export const healthApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHealth: builder.query<HealthResponse, void>({
      query: () => ({ url: `${config.host}/health`, method: "GET" }),
    }),
  }),
});

export const { useGetHealthQuery } = healthApi;
