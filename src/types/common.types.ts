export type UUID = string;

export type DateTime = string;

export type Role = "ADMIN" | "MENTOR" | "STUDENT";

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUIRED";

export type ReviewDecision = "APPROVED" | "REJECTED";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}
