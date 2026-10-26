import type { ApiResponse, DateTime, PaginatedResponse, Role, UUID } from "./common.types";

export interface UserRecord {
  id: UUID;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: DateTime | null;
  isDeleted: boolean;
  deletedAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface UserListItem {
  id: UUID;
  email: string;
  role: Role;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface ProfileFields {
  id: UUID;
  firstName: string;
  lastName: string;
  phone: string | null;
  bio: string | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export type AdminProfileFields = ProfileFields;

export interface MentorProfileFields extends ProfileFields {
  gender: string;
}

export interface StudentProfileFields extends ProfileFields {
  gender: string | null;
}

export interface UserProfile {
  id: UUID;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
  admin: AdminProfileFields | null;
  mentor: MentorProfileFields | null;
  student: StudentProfileFields | null;
}

export interface PasswordChangeResult {
  message: "Password changed.";
}

export interface AccountSummary {
  id: UUID;
  email: string;
  role: Role;
  isActive: boolean;
}

export type GetOwnProfileResponse = ApiResponse<UserProfile>;

export interface UpdateOwnProfileBody {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  bio?: string | null;
}

export type UpdateOwnProfileResponse = ApiResponse<UserProfile>;

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export type ChangePasswordResponse = ApiResponse<PasswordChangeResult>;

export type UpdateUserStatusParams = {
  id: UUID;
};

export interface UpdateUserStatusBody {
  isActive: boolean;
}

export type UpdateUserStatusResponse = ApiResponse<UserRecord>;

export interface ListUsersQuery {
  search?: string;
  searchTerm?: string;
  page?: number | `${number}`;
  limit?: number | `${number}`;
  sortBy?:
    "id" | "email" | "role" | "isActive" | "isDeleted" | "deletedAt" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  fromDate?: string;
  toDate?: string;
  role?: Role;
  isActive?: "true" | "false";
  ids?: string;
}

export type ListUsersResponse = PaginatedResponse<UserListItem>;

export type GetUserParams = {
  id: UUID;
};

export type GetUserResponse = ApiResponse<UserRecord>;

export type UpdateUserParams = {
  id: UUID;
};

export interface UpdateUserBody {
  email?: string;
  password?: string;
  role?: Role;
  isActive?: boolean;
}

export type UpdateUserResponse = ApiResponse<UserRecord>;

export type DeleteUserParams = {
  id: UUID;
};

export type DeleteUserResponse = ApiResponse<null>;
