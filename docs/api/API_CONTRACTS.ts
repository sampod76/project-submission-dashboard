/**
 * Documentation-only frontend wire contracts, statically audited 2026-10-26.
 * No backend imports or runtime dependencies. Dates are JSON strings.
 * Constraints not expressible as plain types are documented in API_REFERENCE.md.
 * Query types describe client input BEFORE server Zod transformations: serialize
 * numbers as query strings, ids as one comma-delimited string, dates YYYY-MM-DD.
 * Unknown body/query keys are rejected only where a strict schema is mounted.
 * NoParams/NoQuery mean no supported inputs; ignored inputs are not capabilities.
 * HTTP error status is read from the transport, not from global error JSON.
 */
export type UUID = string;
/** ISO 8601 UTC timestamp, for example 2026-10-26T06:00:00.000Z. */
export type DateTime = string;
export type Role = "ADMIN" | "MENTOR" | "STUDENT";
export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUIRED";
export type ReviewDecision = "APPROVED" | "REJECTED";
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type NoParams = Record<string, never>;
export type NoQuery = Record<string, never>;
export type NoBody = undefined;
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}
export interface Success<T, S extends number = 200, M extends string = ""> {
  success: true;
  statusCode: S;
  message: M;
  data: T;
}
export interface PageSuccess<T> extends Success<T[]> {
  meta: PaginationMeta;
}
export interface ErrorDetail {
  path?: string | number;
  message: string;
}
export interface ApiFailure<M extends string = string> {
  success: false;
  message: M;
  errorMessage: ErrorDetail[];
}
export type ValidationFailure = ApiFailure<`Validation Error:-> ${string}`>;
export type PrismaFailure = ApiFailure<
  | `Duplicate ${string} value`
  | "Concurrent change; please retry"
  | "Record not found"
  | "Invalid reference"
  | "Something went wrong"
>;
export interface InternalFailure {
  success: false;
  message: "Unexpected server error" | "Something went wrong. Please try again later.";
  errorCode: "INTERNAL_SERVER_ERROR";
  errorMessage: [];
}
export interface RateLimitFailure {
  success: false;
  statusCode: 429;
  message: "Too many requests, please try again later.";
}
/** Unmatched routes only; not a successful endpoint contract. */
export interface RouteNotFoundFailure {
  success: false;
  message: "Route not found";
  errorMessages: { path: string; message: "api not found" }[];
}

export interface UserRecord {
  /** User account ID */
  id: UUID;
  /** Account email */
  email: string;
  /** Current account role */
  role: Role;
  /** Account enabled flag */
  isActive: boolean;
  /** Last successful login, null before login */
  lastLoginAt: DateTime | null;
  /** Soft deletion flag */
  isDeleted: boolean;
  /** Soft deletion timestamp */
  deletedAt: DateTime | null;
  /** Creation time */
  createdAt: DateTime;
  /** Last update time */
  updatedAt: DateTime;
}

export interface UserListItem {
  /** User account ID */
  id: UUID;
  /** Account email */
  email: string;
  /** Current role */
  role: Role;
  /** Enabled flag */
  isActive: boolean;
  /** Soft deletion flag */
  isDeleted: boolean;
  /** Deletion time */
  deletedAt: DateTime | null;
  /** Creation time */
  createdAt: DateTime;
  /** Last update time */
  updatedAt: DateTime;
}

export interface ProfileFields {
  /** Role profile ID, not User ID */
  id: UUID;
  /** Given name */
  firstName: string;
  /** Family name */
  lastName: string;
  /** Telephone */
  phone: string | null;
  /** Biography */
  bio: string | null;
  /** Profile creation time */
  createdAt: DateTime;
  /** Profile update time */
  updatedAt: DateTime;
}

export type AdminProfileFields = ProfileFields;

export interface MentorProfileFields extends ProfileFields {
  /** Required Mentor gender in database; free text */
  gender: string;
}

export interface StudentProfileFields extends ProfileFields {
  /** Optional Student gender */
  gender: string | null;
}

export interface UserProfile {
  /** User account ID */
  id: UUID;
  /** Account email */
  email: string;
  /** Current role */
  role: Role;
  /** Enabled flag */
  isActive: boolean;
  /** Last login */
  lastLoginAt: DateTime | null;
  /** User creation time */
  createdAt: DateTime;
  /** User update time */
  updatedAt: DateTime;
  /** Non-deleted Admin profile, nullable */
  admin: AdminProfileFields | null;
  /** Non-deleted Mentor profile, nullable */
  mentor: MentorProfileFields | null;
  /** Non-deleted Student profile, nullable */
  student: StudentProfileFields | null;
}

export interface RegisteredStudentFields {
  /** Created Student profile ID */
  id: UUID;
  /** Given name */
  firstName: string;
  /** Family name */
  lastName: string;
  /** Telephone */
  phone: string | null;
  /** Gender */
  gender: string | null;
}

export interface RegisteredStudent {
  /** User ID */
  id: UUID;
  /** Normalized email */
  email: string;
  /** Always STUDENT */
  role: "STUDENT";
  /** Initially true */
  isActive: boolean;
  /** Initially null */
  lastLoginAt: DateTime | null;
  /** Initially false */
  isDeleted: boolean;
  /** Initially null */
  deletedAt: DateTime | null;
  /** User creation time */
  createdAt: DateTime;
  /** User update time */
  updatedAt: DateTime;
  /** Selected new profile; not full Student model */
  student: RegisteredStudentFields;
}

export interface AuthUser {
  /** User ID */
  id: UUID;
  /** Email */
  email: string;
  /** Current role */
  role: Role;
  /** Role profile firstName + space + lastName, or N/A */
  name: string;
}

export interface AuthTokens {
  /** Access JWT */
  accessToken: string;
  /** Refresh JWT also returned in JSON */
  refreshToken: string;
  /** Access lifetime in seconds */
  expiresIn: number;
  /** Account display identity */
  user: AuthUser;
}

export interface SessionUser {
  /** User ID */
  id: UUID;
  /** Email */
  email: string;
  /** Current role */
  role: Role;
  /** True in successful fresh query */
  isActive: boolean;
}

export interface PasswordChangeResult {
  /** Nested data.message; envelope message remains empty */
  message: "Password changed.";
}

export interface AdminRecord {
  /** Admin profile ID */
  id: UUID;
  /** Linked User ID */
  userId: UUID;
  /** Given name */
  firstName: string;
  /** Family name */
  lastName: string;
  /** Telephone */
  phone: string | null;
  /** Biography */
  bio: string | null;
  /** Profile deletion flag */
  isDeleted: boolean;
  /** Profile deletion time */
  deletedAt: DateTime | null;
  /** Creation time */
  createdAt: DateTime;
  /** Update time */
  updatedAt: DateTime;
}

export interface AdminAccountSummary {
  /** User ID */
  id: UUID;
  /** Email */
  email: string;
  /** Current role */
  role: Role;
  /** User enabled flag */
  isActive: boolean;
  /** User deletion flag */
  isDeleted: boolean;
}

export interface AdminDetail extends AdminRecord {
  /** Required related User; full AdminRecord fields are also present */
  user: AdminAccountSummary;
}

export interface AccountSummary {
  /** User ID */
  id: UUID;
  /** Email */
  email: string;
  /** Current role */
  role: Role;
  /** User enabled flag */
  isActive: boolean;
}

export interface StudentRecord {
  /** Student profile ID */
  id: UUID;
  /** User ID */
  userId: UUID;
  /** Given name */
  firstName: string;
  /** Family name */
  lastName: string;
  /** Telephone */
  phone: string | null;
  /** Biography */
  bio: string | null;
  /** Gender */
  gender: string | null;
  /** Profile creation time */
  createdAt: DateTime;
  /** Profile update time */
  updatedAt: DateTime;
  /** Linked User summary */
  user: AccountSummary;
}

export interface MentorRecord {
  /** Mentor profile ID */
  id: UUID;
  /** User ID */
  userId: UUID;
  /** Given name */
  firstName: string;
  /** Family name */
  lastName: string;
  /** Telephone */
  phone: string | null;
  /** Biography */
  bio: string | null;
  /** Gender */
  gender: string;
  /** Profile creation time */
  createdAt: DateTime;
  /** Profile update time */
  updatedAt: DateTime;
  /** Linked User summary */
  user: AccountSummary;
  /** Creator Admin profile ID; may be null in database */
  createdByAdminId: UUID | null;
}

export interface SubmissionUser {
  /** Student User ID */
  id: UUID;
  /** Student email */
  email: string;
}

export interface SubmissionStudent {
  /** Student profile ID */
  id: UUID;
  /** Student User ID */
  userId: UUID;
  /** Given name */
  firstName: string;
  /** Family name */
  lastName: string;
  /** Limited account fields */
  user: SubmissionUser;
}

export interface SubmissionRecord {
  /** Submission ID */
  id: UUID;
  /** Student profile ID */
  studentId: UUID;
  /** Project title */
  projectName: string;
  /** Trimmed supplied repository URL */
  repoUrl: string;
  /** Normalized lowercase owner/repository */
  repoFullName: string;
  /** Trimmed live application URL */
  liveUrl: string;
  /** Project description */
  description: string;
  /** Current status */
  status: SubmissionStatus;
  /** Creation time */
  createdAt: DateTime;
  /** Update time */
  updatedAt: DateTime;
  /** Student identity; no feedback or other profiles */
  student: SubmissionStudent;
}

export interface SubmissionDeleteResult {
  /** Deleted submission ID */
  id: UUID;
  /** Always true on success */
  isDeleted: true;
}

export interface SubmissionCounts {
  /** Sum of all four status counts */
  total: number;
  /** PENDING count */
  pending: number;
  /** APPROVED count */
  approved: number;
  /** REJECTED count */
  rejected: number;
  /** REVISION_REQUIRED count */
  revisionRequired: number;
}

export interface ReviewerName {
  /** Given name */
  firstName: string;
  /** Family name */
  lastName: string;
}

export interface Reviewer {
  /** Reviewer User ID */
  id: UUID;
  /** Current email */
  email: string;
  /** Current role; can have changed after review */
  role: Role;
  /** Non-deleted Admin profile names */
  admin: ReviewerName | null;
  /** Non-deleted Mentor profile names */
  mentor: ReviewerName | null;
}

export interface ReviewRecord {
  /** Review ID */
  id: UUID;
  /** Submission ID */
  submissionId: UUID;
  /** Reviewer account ID */
  reviewerUserId: UUID;
  /** Stored previous status */
  previousStatus: SubmissionStatus;
  /** Stored decision */
  status: SubmissionStatus;
  /** Feedback */
  feedback: string | null;
  /** Creation time */
  createdAt: DateTime;
  /** Update time */
  updatedAt: DateTime;
  /** Selected current reviewer identity */
  reviewer: Reviewer;
}

export interface Actor {
  /** Actor User ID */
  id: UUID;
  /** Current actor email */
  email: string;
  /** Current actor role */
  role: Role;
}

export interface AuditLogRecord {
  /** Audit ID */
  id: UUID;
  /** Actor User ID */
  actorUserId: UUID | null;
  /** Action; no response enum restriction */
  action: string;
  /** Entity type; no response enum restriction */
  entityType: string;
  /** Related entity ID */
  entityId: UUID | null;
  /** Old snapshot; null allowed; recursively sanitized */
  oldData: JsonValue;
  /** New snapshot; null allowed; recursively sanitized */
  newData: JsonValue;
  /** IP context when recorded */
  ipAddress: string | null;
  /** User-agent context when recorded */
  userAgent: string | null;
  /** Creation time */
  createdAt: DateTime;
  /** Actor relation */
  actor: Actor | null;
}

export interface HealthResult {
  /** Process status literal */
  status: "ok";
  /** Current server time */
  time: DateTime;
}

/** The create route only permits a transition from PENDING to a terminal decision. */
export interface CreatedReview extends ReviewRecord {
  previousStatus: "PENDING";
  status: ReviewDecision;
}

// POST /api/v1/auth/register — Public
export type RegisterParams = NoParams;
export type RegisterQuery = NoQuery;
export interface RegisterBody {
  /** Trim; valid email; max 255 characters; lowercase. Account email, unique even for deleted accounts */
  email: string;
  /** 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim. New account password */
  password: string;
  /** Trim; 1-100 characters. Given name */
  firstName: string;
  /** Trim; 1-100 characters. Family name */
  lastName: string;
  /** Trim; 1-20 characters. Optional telephone; omit to store null */
  phone?: string;
  /** Trim; 1-255 characters; no enum. Free-text gender */
  gender?: string;
}
export type RegisterResponse = Success<RegisteredStudent, 201, "Student registered">;
export type RegisterErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<"Email already in use">;

// POST /api/v1/auth/login — Public
export type LoginParams = NoParams;
export type LoginQuery = NoQuery;
export interface LoginBody {
  /** Trim; valid email; max 255 characters; lowercase. Account email, unique even for deleted accounts */
  email: string;
  /** 1-1024 characters; no trim. Existing password */
  password: string;
}
export type LoginResponse = Success<AuthTokens, 200, "Login successful">;
export type LoginErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<"Not found user" | "Inactive user" | "Invalid credentials">;

// POST /api/v1/auth/refresh-token — Refresh token
export type RefreshTokenParams = NoParams;
export type RefreshTokenQuery = NoQuery;
export interface RefreshTokenBody {
  /** 10-4096 characters; cookie has precedence. Fallback token when refresh cookie absent */
  refreshToken?: string;
}
export type RefreshTokenResponse = Success<AuthTokens, 200, "">;
export type RefreshTokenErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<"Invalid refresh token" | "Malformed refresh token" | "User not found">;

// POST /api/v1/auth/logout — All
export type LogoutParams = NoParams;
export type LogoutQuery = NoQuery;
export type LogoutBody = NoBody;
export type LogoutResponse = Success<null, 200, "Logged out.">;
export type LogoutErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
    >;

// GET /api/v1/auth/session — All
export type SessionParams = NoParams;
export type SessionQuery = NoQuery;
export type SessionBody = NoBody;
export type SessionResponse = Success<SessionUser, 200, "">;
export type SessionErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "User not found"
    >;

// GET /api/v1/auth/profile — All
export type GetAuthProfileParams = NoParams;
export type GetAuthProfileQuery = NoQuery;
export type GetAuthProfileBody = NoBody;
export type GetAuthProfileResponse = Success<UserProfile, 200, "">;
export type GetAuthProfileErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "User not found"
    >;

// POST /api/v1/auth/change-password — All
export type ChangePasswordLegacyParams = NoParams;
export type ChangePasswordLegacyQuery = NoQuery;
export interface ChangePasswordLegacyBody {
  /** 1-1024 characters; no trim. Current password */
  currentPassword: string;
  /** 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim. Replacement password */
  newPassword: string;
}
export type ChangePasswordLegacyResponse = Success<PasswordChangeResult, 200, "">;
export type ChangePasswordLegacyErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "User not found"
      | "Current password is incorrect"
    >;

// GET /api/v1/users/profile — All
export type GetOwnProfileParams = NoParams;
export type GetOwnProfileQuery = NoQuery;
export type GetOwnProfileBody = NoBody;
export type GetOwnProfileResponse = Success<UserProfile, 200, "">;
export type GetOwnProfileErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "User not found"
    >;

// PATCH /api/v1/users/profile — All
export type UpdateOwnProfileParams = NoParams;
export type UpdateOwnProfileQuery = NoQuery;
/** Runtime requires at least one listed field. */
export interface UpdateOwnProfileBody {
  /** Trim; 1-100 characters. Given name */
  firstName?: string;
  /** Trim; 1-100 characters. Family name */
  lastName?: string;
  /** Trim; 1-20 characters. Profile telephone; null clears it */
  phone?: string | null;
  /** Trim; max 10000 characters; empty string accepted. Profile biography; null clears it */
  bio?: string | null;
}
export type UpdateOwnProfileResponse = Success<UserProfile, 200, "">;
export type UpdateOwnProfileErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
    >;

// PATCH /api/v1/users/change-password — All
export type ChangePasswordParams = NoParams;
export type ChangePasswordQuery = NoQuery;
export interface ChangePasswordBody {
  /** 1-1024 characters; no trim. Current password */
  currentPassword: string;
  /** 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim. Replacement password */
  newPassword: string;
}
export type ChangePasswordResponse = Success<PasswordChangeResult, 200, "">;
export type ChangePasswordErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "User not found"
      | "Current password is incorrect"
    >;

// PATCH /api/v1/users/:id/status — ADMIN, MENTOR
export type UpdateUserStatusParams = { id: UUID };
export type UpdateUserStatusQuery = NoQuery;
export interface UpdateUserStatusBody {
  /** JSON boolean; no string coercion. Enable or disable target account */
  isActive: boolean;
}
export type UpdateUserStatusResponse = Success<UserRecord, 200, "">;
export type UpdateUserStatusErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "User not found"
      | "You cannot manage this account"
      | "You cannot deactivate your own account"
    >;

// GET /api/v1/users — ADMIN, MENTOR
export type ListUsersParams = NoParams;
export interface ListUsersQuery {
  /** Trim; <= 100 characters; default Absent. Case-insensitive literal substring */
  search?: string;
  /** Trim; <= 100 characters; default Absent. Case-insensitive literal substring */
  searchTerm?: string;
  /** Coerced positive integer <= 1000000; default 1. 1-based page */
  page?: number | `${number}`;
  /** Coerced positive integer <= 100; default 10. Rows per page */
  limit?: number | `${number}`;
  /** id / email / role / isActive / isDeleted / deletedAt / createdAt / updatedAt; default createdAt. Primary sort field; id asc breaks ties */
  sortBy?:
    "id" | "email" | "role" | "isActive" | "isDeleted" | "deletedAt" | "createdAt" | "updatedAt";
  /** asc / desc; default desc. Primary sort direction */
  sortOrder?: "asc" | "desc";
  /** Valid YYYY-MM-DD; default Absent. createdAt >= 00:00:00.000Z */
  fromDate?: string;
  /** Valid YYYY-MM-DD; >= fromDate; default Absent. createdAt <= 23:59:59.999Z */
  toDate?: string;
  /** ADMIN / MENTOR / STUDENT; default Absent. Exact role; mentors additionally restricted to STUDENT */
  role?: Role;
  /** Literal true / false query strings; default Absent. Transformed to boolean after validation */
  isActive?: "true" | "false";
  /** Comma-separated UUIDs; each trimmed; at least one; no specified maximum; default Absent. Exact ID inclusion filter; one comma-delimited value */
  ids?: string;
}
export type ListUsersBody = NoBody;
export type ListUsersResponse = PageSuccess<UserListItem>;
export type ListUsersErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
    >;

// GET /api/v1/users/:id — ADMIN, MENTOR
export type GetUserParams = { id: UUID };
export type GetUserQuery = NoQuery;
export type GetUserBody = NoBody;
export type GetUserResponse = Success<UserRecord, 200, "">;
export type GetUserErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "User not found"
      | "You cannot manage this account"
    >;

// PATCH /api/v1/users/:id — ADMIN, MENTOR
export type UpdateUserParams = { id: UUID };
export type UpdateUserQuery = NoQuery;
/** Empty object is accepted; role is administrator-only. */
export interface UpdateUserBody {
  /** Trim; valid email; max 255 characters; lowercase. Account email, unique even for deleted accounts */
  email?: string;
  /** 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim. Replace password without current password */
  password?: string;
  /** ADMIN / MENTOR / STUDENT; administrator only. Changes role without creating a profile */
  role?: Role;
  /** JSON boolean. Enable/disable; this route writes no audit log */
  isActive?: boolean;
}
export type UpdateUserResponse = Success<UserRecord, 200, "User updated">;
export type UpdateUserErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "User not found"
      | "You cannot manage this account"
      | "Administrator access required"
      | "You cannot deactivate your own account"
    >;

// DELETE /api/v1/users/:id — ADMIN, MENTOR
export type DeleteUserParams = { id: UUID };
export type DeleteUserQuery = NoQuery;
export type DeleteUserBody = NoBody;
export type DeleteUserResponse = Success<null, 200, "User deleted">;
export type DeleteUserErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "User not found"
      | "You cannot manage this account"
    >;

// POST /api/v1/admins — ADMIN
export type CreateAdminParams = NoParams;
export type CreateAdminQuery = NoQuery;
export interface CreateAdminBody {
  /** Trim; valid email; max 255 characters; lowercase. Account email, unique even for deleted accounts */
  email: string;
  /** 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim. New account password */
  password: string;
  /** Trim; 1-100 characters. Given name */
  firstName: string;
  /** Trim; 1-100 characters. Family name */
  lastName: string;
  /** No trim or length bound in Zod; empty accepted. Admin biography */
  bio?: string | null;
  /** Trim; max 20 characters; empty accepted. Admin telephone */
  phone?: string | null;
}
export type CreateAdminResponse = Success<AdminRecord, 201, "Admin created">;
export type CreateAdminErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Email already in use"
    >;

// GET /api/v1/admins — ADMIN
export type ListAdminsParams = NoParams;
export interface ListAdminsQuery {
  /** Trim; <= 100 characters; default Absent. Case-insensitive literal substring */
  search?: string;
  /** Trim; <= 100 characters; default Absent. Case-insensitive literal substring */
  searchTerm?: string;
  /** Coerced positive integer <= 1000000; default 1. 1-based page */
  page?: number | `${number}`;
  /** Coerced positive integer <= 100; default 10. Rows per page */
  limit?: number | `${number}`;
  /** id / firstName / lastName / phone / createdAt / updatedAt; default createdAt. Primary sort field; id asc breaks ties */
  sortBy?: "id" | "firstName" | "lastName" | "phone" | "createdAt" | "updatedAt";
  /** asc / desc; default desc. Primary sort direction */
  sortOrder?: "asc" | "desc";
  /** Valid YYYY-MM-DD; default Absent. createdAt >= 00:00:00.000Z */
  fromDate?: string;
  /** Valid YYYY-MM-DD; >= fromDate; default Absent. createdAt <= 23:59:59.999Z */
  toDate?: string;
  /** UUID; default Absent. Exact associated User ID */
  userId?: UUID;
}
export type ListAdminsBody = NoBody;
export type ListAdminsResponse = PageSuccess<AdminRecord>;
export type ListAdminsErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
    >;

// GET /api/v1/admins/:id — ADMIN
export type GetAdminParams = { id: UUID };
export type GetAdminQuery = NoQuery;
export type GetAdminBody = NoBody;
export type GetAdminResponse = Success<AdminDetail, 200, "">;
export type GetAdminErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Admin not found"
    >;

// PATCH /api/v1/admins/:id — ADMIN
export type UpdateAdminParams = { id: UUID };
export type UpdateAdminQuery = NoQuery;
/** Runtime requires at least one listed field. */
export interface UpdateAdminBody {
  /** Trim; 1-100 characters. Given name */
  firstName?: string;
  /** Trim; 1-100 characters. Family name */
  lastName?: string;
  /** No trim or length bound in Zod; empty accepted. Admin biography */
  bio?: string | null;
  /** Trim; max 20 characters; empty accepted. Admin telephone */
  phone?: string | null;
}
export type UpdateAdminResponse = Success<AdminRecord, 200, "Admin updated">;
export type UpdateAdminErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Admin not found"
    >;

// DELETE /api/v1/admins/:id — ADMIN
export type DeleteAdminParams = { id: UUID };
export type DeleteAdminQuery = NoQuery;
export type DeleteAdminBody = NoBody;
export type DeleteAdminResponse = Success<AdminRecord, 200, "Admin deleted">;
export type DeleteAdminErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Admin not found"
    >;

// GET /api/v1/mentors — ADMIN
export type ListMentorsParams = NoParams;
export interface ListMentorsQuery {
  /** Trim; <= 100 characters; default Absent. Case-insensitive literal substring */
  searchTerm?: string;
  /** Trim; <= 100 characters; default Absent. Case-insensitive literal substring */
  search?: string;
  /** Coerced positive integer <= 1000000; default 1. 1-based page */
  page?: number | `${number}`;
  /** Coerced positive integer <= 100; default 10. Rows per page */
  limit?: number | `${number}`;
  /** id / createdAt / firstName / lastName; default createdAt. Primary sort field; id asc breaks ties */
  sortBy?: "id" | "createdAt" | "firstName" | "lastName";
  /** asc / desc; default desc. Primary sort direction */
  sortOrder?: "asc" | "desc";
}
export type ListMentorsBody = NoBody;
export type ListMentorsResponse = PageSuccess<MentorRecord>;
export type ListMentorsErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
    >;

// POST /api/v1/mentors — ADMIN
export type CreateMentorParams = NoParams;
export type CreateMentorQuery = NoQuery;
export interface CreateMentorBody {
  /** Trim; valid email; max 255 characters; lowercase. Account email, unique even for deleted accounts */
  email: string;
  /** 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim. New account password */
  password: string;
  /** Trim; 1-100 characters. Given name */
  firstName: string;
  /** Trim; 1-100 characters. Family name */
  lastName: string;
  /** Trim; 1-20 characters. Profile telephone; null clears it */
  phone?: string | null;
  /** Trim; max 10000 characters; empty string accepted. Profile biography; null clears it */
  bio?: string | null;
  /** Trim; 1-255 characters; no enum. Required free-text gender */
  gender: string;
}
export type CreateMentorResponse = Success<MentorRecord, 201, "Mentor created">;
export type CreateMentorErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Active administrator profile required"
      | "Email already in use"
    >;

// GET /api/v1/students — ADMIN, MENTOR
export type ListStudentsParams = NoParams;
export interface ListStudentsQuery {
  /** Trim; <= 100 characters; default Absent. Case-insensitive literal substring */
  searchTerm?: string;
  /** Trim; <= 100 characters; default Absent. Case-insensitive literal substring */
  search?: string;
  /** Coerced positive integer <= 1000000; default 1. 1-based page */
  page?: number | `${number}`;
  /** Coerced positive integer <= 100; default 10. Rows per page */
  limit?: number | `${number}`;
  /** id / createdAt / firstName / lastName; default createdAt. Primary sort field; id asc breaks ties */
  sortBy?: "id" | "createdAt" | "firstName" | "lastName";
  /** asc / desc; default desc. Primary sort direction */
  sortOrder?: "asc" | "desc";
}
export type ListStudentsBody = NoBody;
export type ListStudentsResponse = PageSuccess<StudentRecord>;
export type ListStudentsErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
    >;

// POST /api/v1/submissions — STUDENT
export type CreateSubmissionParams = NoParams;
export type CreateSubmissionQuery = NoQuery;
export interface CreateSubmissionBody {
  /** Trim; 1-200 characters. Project title */
  projectName: string;
  /** Trim; URL; max 2048 characters; GitHub rules below. GitHub repository URL */
  repoUrl: string;
  /** Trim; URL; max 2048 characters; http: or https:; no username/password. Live application URL */
  liveUrl: string;
  /** Trim; 1-10000 characters. Project description */
  description: string;
}
export type CreateSubmissionResponse = Success<SubmissionRecord, 201, "">;
export type CreateSubmissionErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Active student profile required"
      | "This GitHub repository already has an active submission"
    >;

// GET /api/v1/submissions — ADMIN, MENTOR
export type ListSubmissionsParams = NoParams;
export interface ListSubmissionsQuery {
  /** Coerced positive integer <= 1000000; default 1. 1-based page */
  page?: number | `${number}`;
  /** Coerced positive integer <= 100; default 10. Rows per page */
  limit?: number | `${number}`;
  /** Trim; <= 100 characters; default Absent. Case-insensitive literal substring */
  searchTerm?: string;
  /** PENDING / APPROVED / REJECTED / REVISION_REQUIRED; default Absent. Exact submission status */
  status?: SubmissionStatus;
  /** id / createdAt / updatedAt / projectName / status; default createdAt. Primary sort field; id asc breaks ties */
  sortBy?: "id" | "createdAt" | "updatedAt" | "projectName" | "status";
  /** asc / desc; default desc. Primary sort direction */
  sortOrder?: "asc" | "desc";
}
export type ListSubmissionsBody = NoBody;
export type ListSubmissionsResponse = PageSuccess<SubmissionRecord>;
export type ListSubmissionsErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
    >;

// GET /api/v1/submissions/my — STUDENT
export type ListMySubmissionsParams = NoParams;
export interface ListMySubmissionsQuery {
  /** Coerced positive integer <= 1000000; default 1. 1-based page */
  page?: number | `${number}`;
  /** Coerced positive integer <= 100; default 10. Rows per page */
  limit?: number | `${number}`;
  /** PENDING / APPROVED / REJECTED / REVISION_REQUIRED; default Absent. Exact submission status */
  status?: SubmissionStatus;
}
export type ListMySubmissionsBody = NoBody;
export type ListMySubmissionsResponse = PageSuccess<SubmissionRecord>;
export type ListMySubmissionsErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Active student profile required"
    >;

// GET /api/v1/submissions/statistics — ADMIN, MENTOR
export type SubmissionStatisticsParams = NoParams;
export type SubmissionStatisticsQuery = NoQuery;
export type SubmissionStatisticsBody = NoBody;
export type SubmissionStatisticsResponse = Success<SubmissionCounts, 200, "">;
export type SubmissionStatisticsErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
    >;

// GET /api/v1/submissions/:id — ADMIN, MENTOR, STUDENT
export type GetSubmissionParams = { id: UUID };
export type GetSubmissionQuery = NoQuery;
export type GetSubmissionBody = NoBody;
export type GetSubmissionResponse = Success<SubmissionRecord, 200, "">;
export type GetSubmissionErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Submission not found"
      | "You cannot access another student's submission"
    >;

// PATCH /api/v1/submissions/:id — STUDENT
export type UpdateSubmissionParams = { id: UUID };
export type UpdateSubmissionQuery = NoQuery;
/** Runtime requires at least one listed field. */
export interface UpdateSubmissionBody {
  /** Trim; 1-200 characters. Project title */
  projectName?: string;
  /** Trim; URL; max 2048 characters; GitHub rules below. GitHub repository URL */
  repoUrl?: string;
  /** Trim; URL; max 2048 characters; http: or https:; no username/password. Live application URL */
  liveUrl?: string;
  /** Trim; 1-10000 characters. Project description */
  description?: string;
}
export type UpdateSubmissionResponse = Success<SubmissionRecord, 200, "">;
export type UpdateSubmissionErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Active student profile required"
      | "Submission not found"
      | "You cannot access another student's submission"
      | "Only PENDING submissions can be updated"
      | "This GitHub repository already has an active submission"
      | "Submission changed; please reload"
    >;

// DELETE /api/v1/submissions/:id — STUDENT
export type DeleteSubmissionParams = { id: UUID };
export type DeleteSubmissionQuery = NoQuery;
export type DeleteSubmissionBody = NoBody;
export type DeleteSubmissionResponse = Success<SubmissionDeleteResult, 200, "">;
export type DeleteSubmissionErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Active student profile required"
      | "Submission not found"
      | "You cannot access another student's submission"
      | "Only PENDING submissions can be deleted"
      | "Submission changed; please reload"
    >;

// POST /api/v1/submissions/:id/reviews — ADMIN, MENTOR
export type CreateReviewParams = { id: UUID };
export type CreateReviewQuery = NoQuery;
export interface CreateReviewBody {
  /** APPROVED / REJECTED only. Terminal review decision */
  status: ReviewDecision;
  /** Trim; max 10000 characters; empty accepted. Feedback; null or omission stores null */
  feedback?: string | null;
}
export type CreateReviewResponse = Success<CreatedReview, 201, "Submission reviewed">;
export type CreateReviewErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Active reviewer account required"
      | "Submission not found"
      | "Only PENDING submissions can be reviewed"
      | "Submission already reviewed or changed"
    >;

// GET /api/v1/submissions/:id/reviews — ADMIN, MENTOR
export type ListReviewsParams = { id: UUID };
export interface ListReviewsQuery {
  /** Coerced positive integer <= 1000000; default 1. 1-based page */
  page?: number | `${number}`;
  /** Coerced positive integer <= 100; default 10. Rows per page */
  limit?: number | `${number}`;
}
export type ListReviewsBody = NoBody;
export type ListReviewsResponse = PageSuccess<ReviewRecord>;
export type ListReviewsErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Submission not found"
    >;

// GET /api/v1/audit-logs — ADMIN, MENTOR
export type ListAuditLogsParams = NoParams;
export interface ListAuditLogsQuery {
  /** Coerced positive integer <= 1000000; default 1. 1-based page */
  page?: number | `${number}`;
  /** Coerced positive integer <= 100; default 10. Rows per page */
  limit?: number | `${number}`;
  /** createdAt; default createdAt. Primary sort field; id asc breaks ties */
  sortBy?: "createdAt";
  /** asc / desc; default desc. Primary sort direction */
  sortOrder?: "asc" | "desc";
  /** Trim; 1-100 characters; default Absent. Exact case-sensitive action */
  action?: string;
  /** Trim; 1-100 characters; default Absent. Exact case-sensitive entity type */
  entityType?: string;
  /** UUID; default Absent. Exact entity ID */
  entityId?: UUID;
  /** UUID; default Absent. Exact actor User ID */
  actorUserId?: UUID;
  /** Valid YYYY-MM-DD; default Absent. createdAt >= 00:00:00.000Z */
  fromDate?: string;
  /** Valid YYYY-MM-DD; >= fromDate; default Absent. createdAt <= 23:59:59.999Z */
  toDate?: string;
}
export type ListAuditLogsBody = NoBody;
export type ListAuditLogsResponse = PageSuccess<AuditLogRecord>;
export type ListAuditLogsErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
    >;

// GET /api/v1/audit-logs/:id — ADMIN, MENTOR
export type GetAuditLogParams = { id: UUID };
export type GetAuditLogQuery = NoQuery;
export type GetAuditLogBody = NoBody;
export type GetAuditLogResponse = Success<AuditLogRecord, 200, "">;
export type GetAuditLogErrorResponse =
  | RateLimitFailure
  | InternalFailure
  | PrismaFailure
  | ValidationFailure
  | ApiFailure<
      | "Unauthorized access"
      | "Invalid authorization header"
      | "Token expired"
      | "Malformed token payload"
      | "User no longer exists"
      | "Account is inactive"
      | "Forbidden access"
      | "Audit log not found"
      | "You cannot access this audit log"
    >;

// GET /health — Public
export type HealthParams = NoParams;
export type HealthQuery = NoQuery;
export type HealthBody = NoBody;
export type HealthResponse = HealthResult;
export type HealthErrorResponse = RateLimitFailure | InternalFailure;
