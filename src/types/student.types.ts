import type { DateTime, PaginatedResponse, UUID } from "./common.types";
import type { AccountSummary } from "./user.types";

export interface StudentRecord {
  id: UUID;
  userId: UUID;
  firstName: string;
  lastName: string;
  phone: string | null;
  bio: string | null;
  gender: string | null;
  createdAt: DateTime;
  updatedAt: DateTime;
  user: AccountSummary;
}

export interface ListStudentsQuery {
  searchTerm?: string;
  search?: string;
  page?: number | `${number}`;
  limit?: number | `${number}`;
  sortBy?: "id" | "createdAt" | "firstName" | "lastName";
  sortOrder?: "asc" | "desc";
}

export type ListStudentsResponse = PaginatedResponse<StudentRecord>;
