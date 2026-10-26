import { baseApi } from "../../api/baseApi";
import { tagTypes } from "@/redux/tag-types";
import type {
  GetAuditLogParams,
  GetAuditLogResponse,
  ListAuditLogsQuery,
  ListAuditLogsResponse,
} from "@/types/audit-log.types";

const URL = "/audit-logs";

export const auditLogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<ListAuditLogsResponse, ListAuditLogsQuery>({
      query: (params) => ({ url: URL, method: "GET", params }),
      providesTags: [tagTypes.auditLog],
    }),
    getAuditLogById: builder.query<GetAuditLogResponse, GetAuditLogParams["id"]>({
      query: (id) => ({ url: `${URL}/${encodeURIComponent(id)}`, method: "GET" }),
      providesTags: [tagTypes.auditLog],
    }),
  }),
});

export const { useGetAuditLogsQuery, useGetAuditLogByIdQuery } = auditLogApi;
