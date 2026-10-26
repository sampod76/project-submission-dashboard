import type { ApiResponse, DateTime, PaginatedResponse, UUID } from "./common.types";
import type { AccountSummary } from "./user.types";

export interface MentorRecord {
  id: UUID;
  userId: UUID;
  firstName: string;
  lastName: string;
  phone: string | null;
  bio: string | null;
  gender: string;
  createdAt: DateTime;
  updatedAt: DateTime;
  user: AccountSummary;
  createdByAdminId: UUID | null;
}

export interface ListMentorsQuery {
  searchTerm?: string;
  search?: string;
  page?: number | `${number}`;
  limit?: number | `${number}`;
  sortBy?: "id" | "createdAt" | "firstName" | "lastName";
  sortOrder?: "asc" | "desc";
}

export type ListMentorsResponse = PaginatedResponse<MentorRecord>;

export interface CreateMentorBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  bio?: string | null;
  gender: string;
}

export type CreateMentorResponse = ApiResponse<MentorRecord>;
