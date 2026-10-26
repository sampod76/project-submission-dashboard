import type {
  ApiResponse,
  DateTime,
  JsonValue,
  PaginatedResponse,
  Role,
  UUID,
} from "./common.types";

export interface Actor {
  id: UUID;
  email: string;
  role: Role;
}

export interface AuditLogRecord {
  id: UUID;
  actorUserId: UUID | null;
  action: string;
  entityType: string;
  entityId: UUID | null;
  oldData: JsonValue;
  newData: JsonValue;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: DateTime;
  actor: Actor | null;
}

export interface ListAuditLogsQuery {
  page?: number | `${number}`;
  limit?: number | `${number}`;
  sortBy?: "createdAt";
  sortOrder?: "asc" | "desc";
  action?: string;
  entityType?: string;
  entityId?: UUID;
  actorUserId?: UUID;
  fromDate?: string;
  toDate?: string;
}

export type ListAuditLogsResponse = PaginatedResponse<AuditLogRecord>;

export type GetAuditLogParams = {
  id: UUID;
};

export type GetAuditLogResponse = ApiResponse<AuditLogRecord>;
