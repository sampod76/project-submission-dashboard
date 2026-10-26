import type { ApiResponse, DateTime, PaginatedResponse, Role, UUID } from "./common.types";

export interface AdminRecord {
  id: UUID;
  userId: UUID;
  firstName: string;
  lastName: string;
  phone: string | null;
  bio: string | null;
  isDeleted: boolean;
  deletedAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface AdminAccountSummary {
  id: UUID;
  email: string;
  role: Role;
  isActive: boolean;
  isDeleted: boolean;
}

export interface AdminDetail extends AdminRecord {
  user: AdminAccountSummary;
}

export interface CreateAdminBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  bio?: string | null;
  phone?: string | null;
}

export type CreateAdminResponse = ApiResponse<AdminRecord>;

export interface ListAdminsQuery {
  search?: string;
  searchTerm?: string;
  page?: number | `${number}`;
  limit?: number | `${number}`;
  sortBy?: "id" | "firstName" | "lastName" | "phone" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  fromDate?: string;
  toDate?: string;
  userId?: UUID;
}

export type ListAdminsResponse = PaginatedResponse<AdminRecord>;

export type GetAdminParams = {
  id: UUID;
};

export type GetAdminResponse = ApiResponse<AdminDetail>;

export type UpdateAdminParams = {
  id: UUID;
};

export interface UpdateAdminBody {
  firstName?: string;
  lastName?: string;
  bio?: string | null;
  phone?: string | null;
}

export type UpdateAdminResponse = ApiResponse<AdminRecord>;

export type DeleteAdminParams = {
  id: UUID;
};

export type DeleteAdminResponse = ApiResponse<AdminRecord>;
