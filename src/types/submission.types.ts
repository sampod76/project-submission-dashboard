import type {
  ApiResponse,
  DateTime,
  PaginatedResponse,
  SubmissionStatus,
  UUID,
} from "./common.types";

export interface SubmissionUser {
  id: UUID;
  email: string;
}

export interface SubmissionStudent {
  id: UUID;
  userId: UUID;
  firstName: string;
  lastName: string;
  user: SubmissionUser;
}

export interface SubmissionRecord {
  id: UUID;
  studentId: UUID;
  projectName: string;
  repoUrl: string;
  repoFullName: string;
  liveUrl: string;
  description: string;
  status: SubmissionStatus;
  createdAt: DateTime;
  updatedAt: DateTime;
  student: SubmissionStudent;
}

export interface SubmissionDeleteResult {
  id: UUID;
  isDeleted: true;
}

export interface SubmissionCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  revisionRequired: number;
}

export interface CreateSubmissionBody {
  projectName: string;
  repoUrl: string;
  liveUrl: string;
  description: string;
}

export type CreateSubmissionResponse = ApiResponse<SubmissionRecord>;

export interface ListSubmissionsQuery {
  page?: number | `${number}`;
  limit?: number | `${number}`;
  searchTerm?: string;
  status?: SubmissionStatus;
  sortBy?: "id" | "createdAt" | "updatedAt" | "projectName" | "status";
  sortOrder?: "asc" | "desc";
}

export type ListSubmissionsResponse = PaginatedResponse<SubmissionRecord>;

export interface ListMySubmissionsQuery {
  page?: number | `${number}`;
  limit?: number | `${number}`;
  status?: SubmissionStatus;
}

export type ListMySubmissionsResponse = PaginatedResponse<SubmissionRecord>;

export type SubmissionStatisticsResponse = ApiResponse<SubmissionCounts>;

export type GetSubmissionParams = {
  id: UUID;
};

export type GetSubmissionResponse = ApiResponse<SubmissionRecord>;

export type UpdateSubmissionParams = {
  id: UUID;
};

export interface UpdateSubmissionBody {
  projectName?: string;
  repoUrl?: string;
  liveUrl?: string;
  description?: string;
}

export type UpdateSubmissionResponse = ApiResponse<SubmissionRecord>;

export type DeleteSubmissionParams = {
  id: UUID;
};

export type DeleteSubmissionResponse = ApiResponse<SubmissionDeleteResult>;
