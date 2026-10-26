# Frontend integration guide

This guide covers every current backend operation. Read [API_REFERENCE.md](API_REFERENCE.md) for the definitive per-endpoint contract and import the dependency-free wire types from [API_CONTRACTS.ts](API_CONTRACTS.ts). Contract IDs below are the type prefixes: for example `CreateSubmissionBody` and `CreateSubmissionResponse`. Examples in these documents are representative source-derived values, not captured production responses.

## A. Frontend architecture overview

The backend supports student registration, shared login/refresh/session/profile/password flows, student-owned project submission, management review/statistics, administrator/mentor/student directories, user account management and scoped audit history. Configure an origin (local default http://localhost:5000; Docker host http://localhost:5062) and append the complete paths in the mapping. Do not append /api/v1 to health or duplicate that prefix.

Use the API client/cache/state libraries already appropriate for the frontend; no special frontend framework is required. Keep User IDs separate from Admin/Mentor/Student profile IDs and Submission/Review/Audit IDs. Preserve the difference between null and omitted request fields. A success envelope contains data, not an assumed result/user root; lists include meta separately. Health has its own plain shape. Do not build unsupported upload, password reset, repository browsing, student review-history, re-review, reopening or account restoration flows.

## B. Authentication integration

1. Register via Register with email/password/firstName/lastName, optionally phone/gender. It creates STUDENT and profile, returning account/profile data but no session. Follow with Login.
2. Login sets an HttpOnly refreshToken cookie and returns accessToken, refreshToken, expiresIn (seconds) and user {id,email,role,name}. Send JSON with credentials included. Keep access token/user in session state. Storage persistence beyond memory is the frontend's choice; backend does not prescribe localStorage or require it. HttpOnly cookie cannot be read by browser JavaScript.
3. On reload, if using cookie persistence, call RefreshToken with `{}` and credentials included, then Session and GetOwnProfile. Cookie path is /api/v1/auth, SameSite=Lax, Secure only in production, host-only by default. Cross-site POST might not carry a Lax cookie; verify deployment. If using returned refresh tokens explicitly, the same route accepts body.refreshToken, but a present cookie wins, including an invalid cookie. Body is strictly validated even with cookie present.
4. Protected operations send Authorization: Bearer <accessToken>. Access cookies are not supported. Middleware checks JWT role and cached/current account role; account cache is per process for 300 seconds. Session reloads active identity; GetOwnProfile reloads active account/profile. Refresh also reloads the account and current role.
5. Coordinate concurrent 401 recovery through one pending refresh operation, replace the pair/user from response, and retry each failed protected request at most once. Never recursively refresh the refresh endpoint or login failures. A role edit can leave existing JWT claims stale; renew tokens/re-login before expecting new role access. A 403 may be scope/inactive state rather than token expiry.
6. Logout requires an access token and clears refresh cookie; clear frontend tokens/session/user caches too. Expired access can prevent server logout, so clear local state and report transport outcome. Logout and both password-change routes do not revoke JWTs. No token revocation/password-reset endpoint exists.

Example login and profile read (replace baseURL with your environment; no actual credentials are embedded):

```ts
import type { LoginBody, LoginResponse, GetOwnProfileResponse } from "./API_CONTRACTS";

const baseURL = "http://localhost:5000";
async function login(body: LoginBody): Promise<LoginResponse> {
  const response = await fetch(`${baseURL}/api/v1/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json();
  if (!response.ok) throw { status: response.status, payload };
  return payload as LoginResponse; // Static wire contract, not runtime validation.
}

async function getProfile(accessToken: string): Promise<GetOwnProfileResponse> {
  const response = await fetch(`${baseURL}/api/v1/users/profile`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload: unknown = await response.json();
  if (!response.ok) throw { status: response.status, payload };
  return payload as GetOwnProfileResponse;
}
```

CORS reflects allowed origins with credentials enabled. CORS_ORIGIN is comma-separated or exactly `*`; http://localhost:3000 is always additionally allowed. Requests with no Origin are allowed. Supported CORS methods include PUT/OPTIONS but no PUT business route exists. Allowed headers do not imply corresponding application features. A rejected browser Origin may appear as a network error; inspect deployed CORS configuration and preflight.

## C. Role-based frontend features

| Feature/action                                    | ADMIN                                         | MENTOR                                       | STUDENT                    |
| ------------------------------------------------- | --------------------------------------------- | -------------------------------------------- | -------------------------- |
| Session, own profile/edit, password/logout        | Own                                           | Own                                          | Own                        |
| Admin directory/create/detail/edit/profile-delete | Yes                                           | No                                           | No                         |
| Mentor directory/create                           | Yes; creation also needs active Admin profile | No                                           | No                         |
| Student directory                                 | Yes                                           | Yes                                          | No                         |
| Users list/detail/edit/status/account-delete      | Any non-deleted account                       | STUDENT targets only                         | No                         |
| Set role in user PATCH                            | Yes; profiles not synchronized                | No, even unchanged role forbidden            | No                         |
| Create/list my project                            | No                                            | No                                           | Active own Student profile |
| Project management queue/statistics               | Yes                                           | Yes                                          | No                         |
| Project detail                                    | All visible                                   | All visible                                  | Own visible                |
| Project edit/delete                               | No                                            | No                                           | Own PENDING only           |
| Approve/reject/history                            | Yes                                           | Yes                                          | No                         |
| Audit list/detail                                 | All non-deleted logs                          | Own Submission/SUBMISSION_REVIEWED logs only | No                         |

Hide/disable controls according to both role and record ownership/status, and still handle server denial. Mentors cannot promote users or manage staff. Self-deactivation is blocked, while account and admin-profile self-deletion are currently permitted. User deletion and Admin profile deletion have different effects. Missing role profiles after role reassignment are supported response states, not valid evidence for inventing a profile-creation route.

## D. Complete module-based API integration map

| Contract / frontend feature                                                                            | HTTP method | Complete endpoint               | Required access        | Trigger / purpose                                                                           |
| ------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| [Register](API_REFERENCE.md#endpoint-register) — Student registration                                  | POST        | /api/v1/auth/register           | Public                 | Create a STUDENT account and Student profile in one transaction.                            |
| [Login](API_REFERENCE.md#endpoint-login) — Sign in                                                     | POST        | /api/v1/auth/login              | Public                 | Validate credentials, update lastLoginAt, issue access/refresh JWTs and set refresh cookie. |
| [RefreshToken](API_REFERENCE.md#endpoint-refreshtoken) — Session renewal                               | POST        | /api/v1/auth/refresh-token      | Refresh token          | Issue a new token pair after verifying a refresh token and reloading the current account.   |
| [Logout](API_REFERENCE.md#endpoint-logout) — Sign out                                                  | POST        | /api/v1/auth/logout             | All                    | Clear the refresh cookie for the authenticated client.                                      |
| [Session](API_REFERENCE.md#endpoint-session) — Session bootstrap                                       | GET         | /api/v1/auth/session            | All                    | Return the current active account identity.                                                 |
| [GetAuthProfile](API_REFERENCE.md#endpoint-getauthprofile) — Compatibility profile read                | GET         | /api/v1/auth/profile            | All                    | Read the authenticated account with its non-deleted role profiles.                          |
| [ChangePasswordLegacy](API_REFERENCE.md#endpoint-changepasswordlegacy) — Compatibility password change | POST        | /api/v1/auth/change-password    | All                    | Change the authenticated user password after checking current password.                     |
| [GetOwnProfile](API_REFERENCE.md#endpoint-getownprofile) — My profile                                  | GET         | /api/v1/users/profile           | All                    | Read the authenticated active account and its non-deleted role profiles.                    |
| [UpdateOwnProfile](API_REFERENCE.md#endpoint-updateownprofile) — Edit my profile                       | PATCH       | /api/v1/users/profile           | All                    | Update only firstName, lastName, phone and bio in the authenticated role profile.           |
| [ChangePassword](API_REFERENCE.md#endpoint-changepassword) — Change my password                        | PATCH       | /api/v1/users/change-password   | All                    | Change the authenticated user password after checking current password.                     |
| [UpdateUserStatus](API_REFERENCE.md#endpoint-updateuserstatus) — Enable/disable account                | PATCH       | /api/v1/users/:id/status        | ADMIN, MENTOR          | Set target User.isActive and atomically write USER_STATUS_CHANGED audit entry.              |
| [ListUsers](API_REFERENCE.md#endpoint-listusers) — Account directory                                   | GET         | /api/v1/users                   | ADMIN, MENTOR          | List non-deleted user accounts with database pagination.                                    |
| [GetUser](API_REFERENCE.md#endpoint-getuser) — Account details                                         | GET         | /api/v1/users/:id               | ADMIN, MENTOR          | Read target account scalar fields excluding password.                                       |
| [UpdateUser](API_REFERENCE.md#endpoint-updateuser) — Edit account / admin role assignment              | PATCH       | /api/v1/users/:id               | ADMIN, MENTOR          | Update target email, password, role or active status.                                       |
| [DeleteUser](API_REFERENCE.md#endpoint-deleteuser) — Delete account                                    | DELETE      | /api/v1/users/:id               | ADMIN, MENTOR          | Soft-delete User; return null data.                                                         |
| [CreateAdmin](API_REFERENCE.md#endpoint-createadmin) — Create administrator                            | POST        | /api/v1/admins                  | ADMIN                  | Create ADMIN account and Admin profile atomically.                                          |
| [ListAdmins](API_REFERENCE.md#endpoint-listadmins) — Administrator directory                           | GET         | /api/v1/admins                  | ADMIN                  | List non-deleted Admin profiles with pagination.                                            |
| [GetAdmin](API_REFERENCE.md#endpoint-getadmin) — Administrator profile detail                          | GET         | /api/v1/admins/:id              | ADMIN                  | Read non-deleted Admin profile with limited User relation.                                  |
| [UpdateAdmin](API_REFERENCE.md#endpoint-updateadmin) — Edit administrator profile                      | PATCH       | /api/v1/admins/:id              | ADMIN                  | Update Admin profile names, phone and bio.                                                  |
| [DeleteAdmin](API_REFERENCE.md#endpoint-deleteadmin) — Delete administrator profile                    | DELETE      | /api/v1/admins/:id              | ADMIN                  | Soft-delete only Admin profile; return all profile scalars.                                 |
| [ListMentors](API_REFERENCE.md#endpoint-listmentors) — Mentor directory                                | GET         | /api/v1/mentors                 | ADMIN                  | List non-deleted Mentor profiles whose Users are non-deleted and still MENTOR.              |
| [CreateMentor](API_REFERENCE.md#endpoint-creatementor) — Create mentor                                 | POST        | /api/v1/mentors                 | ADMIN                  | Atomically create MENTOR User/profile with creator Admin profile ID.                        |
| [ListStudents](API_REFERENCE.md#endpoint-liststudents) — Student directory                             | GET         | /api/v1/students                | ADMIN, MENTOR          | List non-deleted Student profiles whose Users are non-deleted and still STUDENT.            |
| [CreateSubmission](API_REFERENCE.md#endpoint-createsubmission) — Submit project                        | POST        | /api/v1/submissions             | STUDENT                | Create owned PENDING project after canonical repository duplicate check.                    |
| [ListSubmissions](API_REFERENCE.md#endpoint-listsubmissions) — Submission review queue                 | GET         | /api/v1/submissions             | ADMIN, MENTOR          | List visible submissions across students.                                                   |
| [ListMySubmissions](API_REFERENCE.md#endpoint-listmysubmissions) — My projects                         | GET         | /api/v1/submissions/my          | STUDENT                | List authenticated Student profile submissions.                                             |
| [SubmissionStatistics](API_REFERENCE.md#endpoint-submissionstatistics) — Submission dashboard          | GET         | /api/v1/submissions/statistics  | ADMIN, MENTOR          | Count visible submissions by status and total.                                              |
| [GetSubmission](API_REFERENCE.md#endpoint-getsubmission) — Project details                             | GET         | /api/v1/submissions/:id         | ADMIN, MENTOR, STUDENT | Read visible submission with student identity.                                              |
| [UpdateSubmission](API_REFERENCE.md#endpoint-updatesubmission) — Edit my project                       | PATCH       | /api/v1/submissions/:id         | STUDENT                | Update owned visible PENDING submission with conditional ownership/status write.            |
| [DeleteSubmission](API_REFERENCE.md#endpoint-deletesubmission) — Delete my project                     | DELETE      | /api/v1/submissions/:id         | STUDENT                | Soft-delete owned visible PENDING submission.                                               |
| [CreateReview](API_REFERENCE.md#endpoint-createreview) — Approve/reject project                        | POST        | /api/v1/submissions/:id/reviews | ADMIN, MENTOR          | Atomically transition PENDING to APPROVED/REJECTED, create review and audit.                |
| [ListReviews](API_REFERENCE.md#endpoint-listreviews) — Review history                                  | GET         | /api/v1/submissions/:id/reviews | ADMIN, MENTOR          | List non-deleted reviews after checking visible parent submission.                          |
| [ListAuditLogs](API_REFERENCE.md#endpoint-listauditlogs) — Audit history                               | GET         | /api/v1/audit-logs              | ADMIN, MENTOR          | List visible non-deleted audit entries with exact/date filters.                             |
| [GetAuditLog](API_REFERENCE.md#endpoint-getauditlog) — Audit entry detail                              | GET         | /api/v1/audit-logs/:id          | ADMIN, MENTOR          | Read visible non-deleted audit entry.                                                       |
| [Health](API_REFERENCE.md#endpoint-health) — Service status / diagnostics                              | GET         | /health                         | Public                 | Return process health/time without querying database.                                       |

## E. Forms and field requirements

Each form below lists every accepted body field. Unknown keys fail validation. Payload examples contain all required fields and can omit optional fields. Omit unchanged optional fields on PATCH; use null only when explicitly allowed. No form accepts uploads, nested input objects, client-selected owner IDs or timestamps. Send real JSON booleans for isActive. New passwords are 8-72 characters, upper/lowercase plus a digit, at most 72 UTF-8 bytes and are not trimmed. Email is trimmed, validated and lowercased by backend.

### Register — POST /api/v1/auth/register

| Field     | Type   | Required | Nullable | Validation / default                                                             | Description                                     |
| --------- | ------ | -------- | -------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| email     | string | Yes      | No       | Trim; valid email; max 255 characters; lowercase                                 | Account email, unique even for deleted accounts |
| password  | string | Yes      | No       | 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim | New account password                            |
| firstName | string | Yes      | No       | Trim; 1-100 characters                                                           | Given name                                      |
| lastName  | string | Yes      | No       | Trim; 1-100 characters                                                           | Family name                                     |
| phone     | string | No       | No       | Trim; 1-20 characters                                                            | Optional telephone; omit to store null          |
| gender    | string | No       | No       | Trim; 1-255 characters; no enum                                                  | Free-text gender                                |

Expected payload:

```json
{
  "email": "student@example.com",
  "password": "Student2026!",
  "firstName": "Nadia",
  "lastName": "Rahman"
}
```

On success: Navigate to login; registration does not create a logged-in session.

### Login — POST /api/v1/auth/login

| Field    | Type   | Required | Nullable | Validation / default                             | Description                                     |
| -------- | ------ | -------- | -------- | ------------------------------------------------ | ----------------------------------------------- |
| email    | string | Yes      | No       | Trim; valid email; max 255 characters; lowercase | Account email, unique even for deleted accounts |
| password | string | Yes      | No       | 1-1024 characters; no trim                       | Existing password                               |

Expected payload:

```json
{
  "email": "student@example.com",
  "password": "Student2026!"
}
```

On success: Store returned user/access token in session state and load Session and GetOwnProfile.

### RefreshToken — POST /api/v1/auth/refresh-token

| Field        | Type   | Required | Nullable | Validation / default                      | Description                               |
| ------------ | ------ | -------- | -------- | ----------------------------------------- | ----------------------------------------- |
| refreshToken | string | No       | No       | 10-4096 characters; cookie has precedence | Fallback token when refresh cookie absent |

Session refresh has no visible form; use cookie with {} or the fallback token.

Expected payload:

```json
{}
```

On success: Replace stored tokens/user, retry failed request at most once; clear session on refresh failure.

### ChangePasswordLegacy — POST /api/v1/auth/change-password

| Field           | Type   | Required | Nullable | Validation / default                                                             | Description          |
| --------------- | ------ | -------- | -------- | -------------------------------------------------------------------------------- | -------------------- |
| currentPassword | string | Yes      | No       | 1-1024 characters; no trim                                                       | Current password     |
| newPassword     | string | Yes      | No       | 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim | Replacement password |

Expected payload:

```json
{
  "currentPassword": "Student2026!",
  "newPassword": "NewStudent2026!"
}
```

On success: Clear password form on success; backend does not log the user out.

### UpdateOwnProfile — PATCH /api/v1/users/profile

| Field     | Type   | Required | Nullable | Validation / default                              | Description                       |
| --------- | ------ | -------- | -------- | ------------------------------------------------- | --------------------------------- |
| firstName | string | No       | No       | Trim; 1-100 characters                            | Given name                        |
| lastName  | string | No       | No       | Trim; 1-100 characters                            | Family name                       |
| phone     | string | No       | Yes      | Trim; 1-20 characters                             | Profile telephone; null clears it |
| bio       | string | No       | Yes      | Trim; max 10000 characters; empty string accepted | Profile biography; null clears it |

Require at least one changed field.

Expected payload:

```json
{
  "bio": "Frontend developer."
}
```

On success: Replace profile cache; update displayed name from profile locally or after next token response.

### ChangePassword — PATCH /api/v1/users/change-password

| Field           | Type   | Required | Nullable | Validation / default                                                             | Description          |
| --------------- | ------ | -------- | -------- | -------------------------------------------------------------------------------- | -------------------- |
| currentPassword | string | Yes      | No       | 1-1024 characters; no trim                                                       | Current password     |
| newPassword     | string | Yes      | No       | 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim | Replacement password |

Expected payload:

```json
{
  "currentPassword": "Student2026!",
  "newPassword": "NewStudent2026!"
}
```

On success: Clear sensitive form fields after success.

### UpdateUserStatus — PATCH /api/v1/users/:id/status

| Field    | Type    | Required | Nullable | Validation / default             | Description                      |
| -------- | ------- | -------- | -------- | -------------------------------- | -------------------------------- |
| isActive | boolean | Yes      | No       | JSON boolean; no string coercion | Enable or disable target account |

Dependency: choose a User record and pass its UUID in `:id`.

Expected payload:

```json
{
  "isActive": false
}
```

On success: Refetch users, related student/mentor directory, target detail and visible audit logs.

### UpdateUser — PATCH /api/v1/users/:id

| Field    | Type    | Required | Nullable | Validation / default                                                             | Description                                     |
| -------- | ------- | -------- | -------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| email    | string  | No       | No       | Trim; valid email; max 255 characters; lowercase                                 | Account email, unique even for deleted accounts |
| password | string  | No       | No       | 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim | Replace password without current password       |
| role     | Role    | No       | No       | ADMIN / MENTOR / STUDENT; administrator only                                     | Changes role without creating a profile         |
| isActive | boolean | No       | No       | JSON boolean                                                                     | Enable/disable; this route writes no audit log  |

Dependency: choose a User record and pass its UUID in `:id`. Empty object accepted; only administrators may include role. Account role changes do not provision the corresponding profile.

Expected payload:

```json
{
  "email": "nadia@example.com"
}
```

On success: Refetch users/detail and profile-dependent directories; prefer UpdateUserStatus for auditable status actions.

### CreateAdmin — POST /api/v1/admins

| Field     | Type   | Required | Nullable | Validation / default                                                             | Description                                     |
| --------- | ------ | -------- | -------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| email     | string | Yes      | No       | Trim; valid email; max 255 characters; lowercase                                 | Account email, unique even for deleted accounts |
| password  | string | Yes      | No       | 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim | New account password                            |
| firstName | string | Yes      | No       | Trim; 1-100 characters                                                           | Given name                                      |
| lastName  | string | Yes      | No       | Trim; 1-100 characters                                                           | Family name                                     |
| bio       | string | No       | Yes      | No trim or length bound in Zod; empty accepted                                   | Admin biography                                 |
| phone     | string | No       | Yes      | Trim; max 20 characters; empty accepted                                          | Admin telephone                                 |

Expected payload:

```json
{
  "email": "admin@example.com",
  "password": "Admin2026!",
  "firstName": "Project",
  "lastName": "Administrator"
}
```

On success: Refetch admins/users; use returned userId for account operations.

### UpdateAdmin — PATCH /api/v1/admins/:id

| Field     | Type   | Required | Nullable | Validation / default                           | Description     |
| --------- | ------ | -------- | -------- | ---------------------------------------------- | --------------- |
| firstName | string | No       | No       | Trim; 1-100 characters                         | Given name      |
| lastName  | string | No       | No       | Trim; 1-100 characters                         | Family name     |
| bio       | string | No       | Yes      | No trim or length bound in Zod; empty accepted | Admin biography |
| phone     | string | No       | Yes      | Trim; max 20 characters; empty accepted        | Admin telephone |

Dependency: choose a Admin profile record and pass its UUID in `:id`. Require at least one changed field.

Expected payload:

```json
{
  "bio": "Project coordinator."
}
```

On success: Refetch admins/detail and own profile if editing self.

### CreateMentor — POST /api/v1/mentors

| Field     | Type   | Required | Nullable | Validation / default                                                             | Description                                     |
| --------- | ------ | -------- | -------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| email     | string | Yes      | No       | Trim; valid email; max 255 characters; lowercase                                 | Account email, unique even for deleted accounts |
| password  | string | Yes      | No       | 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim | New account password                            |
| firstName | string | Yes      | No       | Trim; 1-100 characters                                                           | Given name                                      |
| lastName  | string | Yes      | No       | Trim; 1-100 characters                                                           | Family name                                     |
| phone     | string | No       | Yes      | Trim; 1-20 characters                                                            | Profile telephone; null clears it               |
| bio       | string | No       | Yes      | Trim; max 10000 characters; empty string accepted                                | Profile biography; null clears it               |
| gender    | string | Yes      | No       | Trim; 1-255 characters; no enum                                                  | Required free-text gender                       |

Expected payload:

```json
{
  "email": "mentor@example.com",
  "password": "Mentor2026!",
  "firstName": "Amina",
  "lastName": "Hasan",
  "gender": "unspecified"
}
```

On success: Refetch mentors/users.

### CreateSubmission — POST /api/v1/submissions

| Field       | Type   | Required | Nullable | Validation / default                                                  | Description           |
| ----------- | ------ | -------- | -------- | --------------------------------------------------------------------- | --------------------- |
| projectName | string | Yes      | No       | Trim; 1-200 characters                                                | Project title         |
| repoUrl     | string | Yes      | No       | Trim; URL; max 2048 characters; GitHub rules below                    | GitHub repository URL |
| liveUrl     | string | Yes      | No       | Trim; URL; max 2048 characters; http: or https:; no username/password | Live application URL  |
| description | string | Yes      | No       | Trim; 1-10000 characters                                              | Project description   |

Require HTTPS github.com URL with two nonempty owner/repository path segments; strip optional .git for identity; use HTTP(S) liveUrl without credentials. See exact normalization exceptions in API reference.

Expected payload:

```json
{
  "projectName": "Learning Portal",
  "repoUrl": "https://github.com/nadia/learning-portal",
  "liveUrl": "https://learning.example.com",
  "description": "A learning portal with project submissions."
}
```

On success: Refetch my projects and any loaded management list/statistics.

### UpdateSubmission — PATCH /api/v1/submissions/:id

| Field       | Type   | Required | Nullable | Validation / default                                                  | Description           |
| ----------- | ------ | -------- | -------- | --------------------------------------------------------------------- | --------------------- |
| projectName | string | No       | No       | Trim; 1-200 characters                                                | Project title         |
| repoUrl     | string | No       | No       | Trim; URL; max 2048 characters; GitHub rules below                    | GitHub repository URL |
| liveUrl     | string | No       | No       | Trim; URL; max 2048 characters; http: or https:; no username/password | Live application URL  |
| description | string | No       | No       | Trim; 1-10000 characters                                              | Project description   |

Dependency: choose a Submission record and pass its UUID in `:id`. Require at least one changed field. Require HTTPS github.com URL with two nonempty owner/repository path segments; strip optional .git for identity; use HTTP(S) liveUrl without credentials. See exact normalization exceptions in API reference.

Expected payload:

```json
{
  "description": "Updated learning portal description."
}
```

On success: Replace detail; refetch my list and any management list/statistics.

### CreateReview — POST /api/v1/submissions/:id/reviews

| Field    | Type           | Required | Nullable | Validation / default                       | Description                            |
| -------- | -------------- | -------- | -------- | ------------------------------------------ | -------------------------------------- |
| status   | ReviewDecision | Yes      | No       | APPROVED / REJECTED only                   | Terminal review decision               |
| feedback | string         | No       | Yes      | Trim; max 10000 characters; empty accepted | Feedback; null or omission stores null |

Dependency: choose a Submission record and pass its UUID in `:id`. Decision buttons supply APPROVED or REJECTED. No REVISION_REQUIRED/PENDING option; require current submission PENDING.

Expected payload:

```json
{
  "status": "APPROVED",
  "feedback": "The project meets the requirements."
}
```

On success: Refetch detail/queue/statistics/history/visible audits; disable decisions once not PENDING.

No-body mutations: Logout is a session action; DeleteUser, DeleteAdmin and DeleteSubmission use only their selected record UUID. Do not submit a body. DeleteUser returns null; DeleteAdmin returns the deleted profile scalar record; DeleteSubmission returns {id,isDeleted:true}. All return HTTP 200. There is no dedicated student/mentor profile edit form; those users edit their own profile through UpdateOwnProfile, and permitted managers edit account scalars through UpdateUser.

## F. Tables, search, filters and pagination

All eight lists use data arrays and meta {page,limit,total}; no totalPages field. Set page=1 when filters change. Send limit <=100 and page <=1000000, both positive integers. Empty results are successful and an out-of-range page may be empty despite positive total. Default page/limit 1/10. Unlisted query keys fail validation; do not add a generic search/sort control to an endpoint that does not support it. Dates are inclusive UTC createdAt days, not browser-local day bounds. See API reference for field limits and exact enums.

### ListUsers — GET /api/v1/users

- Table/detail row data: id, email, role, isActive, isDeleted, deletedAt, createdAt, updatedAt; no names/lastLoginAt.
- Search: email only; search > searchTerm.
- Filters: role, isActive (query strings true/false), ids (one comma-delimited UUID string), fromDate, toDate.
- Sorting: id/email/role/isActive/isDeleted/deletedAt/createdAt/updatedAt.
- Access/scope: ADMIN, MENTOR. ADMIN sees all roles; MENTOR only STUDENT. role=ADMIN for mentor returns empty list. Search email only; search takes precedence over searchTerm even when empty. Inactive accounts included unless filtered.
- Query keys: `search`, `searchTerm`, `page`, `limit`, `sortBy`, `sortOrder`, `fromDate`, `toDate`, `role`, `isActive`, `ids`.
- Pagination metadata: numeric page, limit, total on envelope; data is array.

### ListAdmins — GET /api/v1/admins

- Table/detail row data: id, userId, firstName, lastName, phone, bio, isDeleted, deletedAt, createdAt, updatedAt; no user/email.
- Search: firstName, lastName, phone; search > searchTerm.
- Filters: userId, fromDate, toDate.
- Sorting: id/firstName/lastName/phone/createdAt/updatedAt.
- Access/scope: ADMIN. Search firstName, lastName, phone only; search precedes searchTerm. No email search or user object. Does not exclude inactive/deleted/role-changed parent Users.
- Query keys: `search`, `searchTerm`, `page`, `limit`, `sortBy`, `sortOrder`, `fromDate`, `toDate`, `userId`.
- Pagination metadata: numeric page, limit, total on envelope; data is array.

### ListMentors — GET /api/v1/mentors

- Table/detail row data: id, userId, firstName, lastName, phone, bio, gender, createdAt, updatedAt, createdByAdminId; user {id,email,role,isActive}.
- Search: firstName, lastName, phone, user.email; searchTerm > search.
- Filters: None.
- Sorting: id/createdAt/firstName/lastName.
- Access/scope: ADMIN. Search names, phone, user email; searchTerm precedes search even when empty. Inactive accounts included; no isActive filter.
- Query keys: `searchTerm`, `search`, `page`, `limit`, `sortBy`, `sortOrder`.
- Pagination metadata: numeric page, limit, total on envelope; data is array.

### ListStudents — GET /api/v1/students

- Table/detail row data: id, userId, firstName, lastName, phone, bio, gender, createdAt, updatedAt; user {id,email,role,isActive}.
- Search: firstName, lastName, phone, user.email; searchTerm > search.
- Filters: None.
- Sorting: id/createdAt/firstName/lastName.
- Access/scope: ADMIN, MENTOR. Search names, phone, user email; searchTerm precedes search. Inactive included; no isActive filter. No student create API beyond registration, and no student detail/update/delete API.
- Query keys: `searchTerm`, `search`, `page`, `limit`, `sortBy`, `sortOrder`.
- Pagination metadata: numeric page, limit, total on envelope; data is array.

### ListSubmissions — GET /api/v1/submissions

- Table/detail row data: id, studentId, projectName, repoUrl, repoFullName, liveUrl, description, status, createdAt, updatedAt; student {id,userId,firstName,lastName,user:{id,email}}.
- Search: projectName, repoFullName, description, student.firstName/lastName; searchTerm only.
- Filters: status.
- Sorting: id/createdAt/updatedAt/projectName/status.
- Access/scope: ADMIN, MENTOR. Search projectName, repoFullName, description, student.firstName/lastName. Excludes deleted submissions and deleted parent Student/User, but not inactive or role-changed parent Users.
- Query keys: `page`, `limit`, `searchTerm`, `status`, `sortBy`, `sortOrder`.
- Pagination metadata: numeric page, limit, total on envelope; data is array.

### ListMySubmissions — GET /api/v1/submissions/my

- Table/detail row data: id, studentId, projectName, repoUrl, repoFullName, liveUrl, description, status, createdAt, updatedAt; student {id,userId,firstName,lastName,user:{id,email}}; own rows only.
- Search: None.
- Filters: status.
- Sorting: Fixed createdAt desc/id asc; sort parameters rejected.
- Access/scope: STUDENT. Only page, limit, status accepted. Fixed createdAt desc, id asc ties. Do not send searchTerm or sorting. Deleted submissions/parents excluded.
- Query keys: `page`, `limit`, `status`.
- Pagination metadata: numeric page, limit, total on envelope; data is array.

### ListReviews — GET /api/v1/submissions/:id/reviews

- Table/detail row data: id, submissionId, reviewerUserId, previousStatus, status, feedback, createdAt, updatedAt; reviewer {id,email,role,admin:{firstName,lastName} or null,mentor:{firstName,lastName} or null}.
- Search: None.
- Filters: None; parent :id required.
- Sorting: Fixed createdAt asc/id asc; sort parameters rejected.
- Access/scope: ADMIN, MENTOR. Fixed createdAt asc, id asc; page/limit only. No student access, including owner. Reviewer name relations exclude deleted profiles independently; account email/role current.
- Query keys: `page`, `limit`.
- Pagination metadata: numeric page, limit, total on envelope; data is array.

### ListAuditLogs — GET /api/v1/audit-logs

- Table/detail row data: id, actorUserId, action, entityType, entityId, oldData, newData, ipAddress, userAgent, createdAt; actor {id,email,role} or null.
- Search: None.
- Filters: action, entityType, entityId, actorUserId, fromDate, toDate.
- Sorting: createdAt only.
- Access/scope: ADMIN, MENTOR. ADMIN sees all non-deleted logs. MENTOR only own SUBMISSION_REVIEWED logs with entityType=Submission. Filters intersect scope. oldData/newData recursively redact credential-like keys; other selected metadata is not recursively sanitized.
- Query keys: `page`, `limit`, `sortBy`, `sortOrder`, `action`, `entityType`, `entityId`, `actorUserId`, `fromDate`, `toDate`.
- Pagination metadata: numeric page, limit, total on envelope; data is array.

Detail screens use GetUser for account scalars including lastLoginAt, GetAdmin for profile plus limited user flags, GetSubmission for project plus student identity (no reviews), GetAuditLog for audit metadata/snapshots and GetOwnProfile/GetAuthProfile for independent nullable profile relations. All exact fields and nested nullability are in the reference catalogue and types. Audit action/entityType are strings, not closed enums; current writers use USER_STATUS_CHANGED/User and SUBMISSION_REVIEWED/Submission. Render snapshots as JSON with redaction support. Statistics has total, pending, approved, rejected, revisionRequired; no date/status query filters.

Example query serialization:

```ts
import type { ListUsersQuery, ListSubmissionsQuery } from "./API_CONTRACTS";

const usersQuery: ListUsersQuery = { page: 1, limit: 20, isActive: "true", role: "STUDENT" };
const usersParams = new URLSearchParams();
for (const [key, value] of Object.entries(usersQuery)) {
  if (value !== undefined) usersParams.set(key, String(value));
}
const submissionsQuery: ListSubmissionsQuery = {
  page: 1,
  limit: 10,
  status: "PENDING",
  sortBy: "createdAt",
  sortOrder: "desc",
};
// Never send this sorting/search object to /submissions/my; that schema rejects it.
```

## G. Integration sequence and dependent workflows

1. Implement the base URL, success-envelope parsing, transport status/error normalization and standalone contract imports. Add health diagnostic separately.
2. Implement Login, RefreshToken, Session and Logout; then Register. Refresh produces tokens before protected data calls; registration alone does not. Keep cache keys/session state isolated by User ID.
3. Implement GetOwnProfile, UpdateOwnProfile and ChangePassword. Support GetAuthProfile/ChangePasswordLegacy only as compatibility aliases with their documented method differences. GetAuthProfile does not fresh-check isActive while GetOwnProfile does.
4. Apply the verified role matrix. ADMIN/MENTOR should not call student-only creation/my endpoints. STUDENT detail ownership uses submission.student.userId; edit/delete require both ownership and PENDING. Backend still authorizes every call.
5. Build student submissions: CreateSubmission → ListMySubmissions → GetSubmission → UpdateSubmission/DeleteSubmission. Actor's Student profile is server-derived. New submissions cannot specify status; a canonical repository cannot duplicate an existing non-deleted row in the ordinary sequential path. Do not assume concurrent uniqueness is guaranteed.
6. Build management dashboard: ListSubmissions + SubmissionStatistics → GetSubmission + ListReviews → CreateReview. APPROVED/REJECTED are terminal for these APIs. Refetch after 409 and after mutation success. Student cannot access separate history/feedback; do not invent a workaround API.
7. Build directories/account management: ListUsers/GetUser/UpdateUser/UpdateUserStatus/DeleteUser; ListStudents for student names; ListAdmins/GetAdmin/CreateAdmin/UpdateAdmin/DeleteAdmin; ListMentors/CreateMentor. Mentor only manages STUDENT targets. Profile IDs differ from User IDs. Actor's Admin profile must be active/non-deleted for mentor creation. User role changes do not complete profile conversion.
8. Build ListAuditLogs/GetAuditLog. ADMIN gets complete visible audit scope; MENTOR only its own review logs. Filters intersect scope; unauthorized detail returns 403. Review/status writes are atomic with audit, but no public audit writer exists.

Mutation cache/dependency map (IDs refer to contract names in section D):

| Mutation contract / HTTP path                            | Prerequisite                    | Update/refetch after success                                                                                   |
| -------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Register — POST /api/v1/auth/register                    | User form / refresh credentials | Navigate to login; registration does not create a logged-in session.                                           |
| Login — POST /api/v1/auth/login                          | User form / refresh credentials | Store returned user/access token in session state and load Session and GetOwnProfile.                          |
| RefreshToken — POST /api/v1/auth/refresh-token           | User form / refresh credentials | Replace stored tokens/user, retry failed request at most once; clear session on refresh failure.               |
| Logout — POST /api/v1/auth/logout                        | Valid session                   | Clear local tokens/user and all user-specific caches; clear local state even if access expiry prevents logout. |
| ChangePasswordLegacy — POST /api/v1/auth/change-password | Valid session                   | Clear password form on success; backend does not log the user out.                                             |
| UpdateOwnProfile — PATCH /api/v1/users/profile           | Valid session                   | Replace profile cache; update displayed name from profile locally or after next token response.                |
| ChangePassword — PATCH /api/v1/users/change-password     | Valid session                   | Clear sensitive form fields after success.                                                                     |
| UpdateUserStatus — PATCH /api/v1/users/:id/status        | Selected User UUID              | Refetch users, related student/mentor directory, target detail and visible audit logs.                         |
| UpdateUser — PATCH /api/v1/users/:id                     | Selected User UUID              | Refetch users/detail and profile-dependent directories; prefer UpdateUserStatus for auditable status actions.  |
| DeleteUser — DELETE /api/v1/users/:id                    | Selected User UUID              | Remove account from lists; refetch submissions/statistics/directories; clear own session after self-delete.    |
| CreateAdmin — POST /api/v1/admins                        | Valid session                   | Refetch admins/users; use returned userId for account operations.                                              |
| UpdateAdmin — PATCH /api/v1/admins/:id                   | Selected Admin profile UUID     | Refetch admins/detail and own profile if editing self.                                                         |
| DeleteAdmin — DELETE /api/v1/admins/:id                  | Selected Admin profile UUID     | Remove profile from admins; refetch own profile if relevant; User may remain in account directory.             |
| CreateMentor — POST /api/v1/mentors                      | Valid session                   | Refetch mentors/users.                                                                                         |
| CreateSubmission — POST /api/v1/submissions              | Valid session                   | Refetch my projects and any loaded management list/statistics.                                                 |
| UpdateSubmission — PATCH /api/v1/submissions/:id         | Selected Submission UUID        | Replace detail; refetch my list and any management list/statistics.                                            |
| DeleteSubmission — DELETE /api/v1/submissions/:id        | Selected Submission UUID        | Remove detail/row; refetch lists/statistics. Response is 200, not 204.                                         |
| CreateReview — POST /api/v1/submissions/:id/reviews      | Selected Submission UUID        | Refetch detail/queue/statistics/history/visible audits; disable decisions once not PENDING.                    |

## H. Frontend error handling

Parse response JSON defensively (proxy/network failures may have no JSON). Use HTTP status first. The backend has three error shapes: global handler with singular errorMessage array and optional errorCode; rate limit with statusCode:429 and no error array; unmatched-route handler with plural errorMessages and no statusCode. No normal global error includes data/statusCode. Success message can be empty and password change success text is inside data.message.

| HTTP / situation           | Actual behavior                                                                                                                                                         | Frontend response                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 400 Zod                    | message begins Validation Error:->; errorMessage items contain last path segment and message; root path can be absent                                                   | Map known field names; show general form error for body/query/root/unknown keys. Do not depend on full dotted paths.                      |
| 400 password check         | Current password is incorrect                                                                                                                                           | Mark currentPassword; preserve nonsensitive context.                                                                                      |
| 401 protected route        | Unauthorized access, Invalid authorization header, Token expired, Malformed token payload, User no longer exists                                                        | For failed protected session, attempt one coordinated refresh as appropriate; otherwise clear state and return to login.                  |
| 401 login/refresh          | Invalid credentials / Inactive user; Invalid refresh token / Malformed refresh token / User not found                                                                   | Do not loop refreshing these operations. Show sign-in error or clear expired session. Login unknown email is 404 Not found user.          |
| 403 role/ownership/account | Forbidden access, Account is inactive, You cannot manage this account, Administrator access required; active-profile/reviewer errors; submission/audit ownership errors | Disable unavailable action and refresh session/record as appropriate; do not retry indefinitely.                                          |
| 404 resource               | User/Admin/Submission/Audit log not found, or Prisma Record not found                                                                                                   | Show missing record or unavailable nested profile; invalidate stale detail/list state.                                                    |
| 409 duplicate              | Email already in use; This GitHub repository already has an active submission; Prisma Duplicate email value or another reported field                                   | Attach conflict to email/repository when identifiable. No guarantee a race always yields 409 for repositories.                            |
| 409 status/concurrency     | Only PENDING ...; Submission changed; please reload; Submission already reviewed or changed; Concurrent change; please retry                                            | Reload current detail/list/history; stop optimistic decision/edit UI and let user reassess.                                               |
| 409 self-disable           | You cannot deactivate your own account                                                                                                                                  | Keep current account enabled in UI; show server message.                                                                                  |
| 429                        | Too many requests, please try again later.; statusCode 429 body                                                                                                         | Stop rapid retries; use available rate-limit/retry headers; endpoint/global windows differ.                                               |
| 500                        | Unexpected server error outside production, generic production message and INTERNAL_SERVER_ERROR; Prisma may instead use Something went wrong                           | Show retryable service failure, preserve editable nonsensitive data. Malformed/oversized JSON and rejected CORS can currently become 500. |
| Network/CORS               | Browser can hide rejected cross-origin response body                                                                                                                    | Check connection/base URL/CORS and credentials deployment; do not assume a validation failure.                                            |

Do not key frontend behavior solely on errorCode: ApiErrors/validation/Prisma errors normally have none. Do not render error details or audit JSON as HTML. Reconcile optimistic changes on every failed mutation. Password hashes are excluded; tokens are intentionally returned by auth and should not be logged.

## I. Complete integration checklist

Each of the 35 explicit endpoints appears once below. Compatibility/operational routes can be classified by the frontend as such, but are included in coverage.

- [ ] **Register** — `POST /api/v1/auth/register`: Student registration; Public; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **Login** — `POST /api/v1/auth/login`: Sign in; Public; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **RefreshToken** — `POST /api/v1/auth/refresh-token`: Session renewal; Refresh token; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **Logout** — `POST /api/v1/auth/logout`: Sign out; All; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **Session** — `GET /api/v1/auth/session`: Session bootstrap; All; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **GetAuthProfile** — `GET /api/v1/auth/profile`: Compatibility profile read; All; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **ChangePasswordLegacy** — `POST /api/v1/auth/change-password`: Compatibility password change; All; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **GetOwnProfile** — `GET /api/v1/users/profile`: My profile; All; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **UpdateOwnProfile** — `PATCH /api/v1/users/profile`: Edit my profile; All; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **ChangePassword** — `PATCH /api/v1/users/change-password`: Change my password; All; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **UpdateUserStatus** — `PATCH /api/v1/users/:id/status`: Enable/disable account; ADMIN, MENTOR; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **ListUsers** — `GET /api/v1/users`: Account directory; ADMIN, MENTOR; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **GetUser** — `GET /api/v1/users/:id`: Account details; ADMIN, MENTOR; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **UpdateUser** — `PATCH /api/v1/users/:id`: Edit account / admin role assignment; ADMIN, MENTOR; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **DeleteUser** — `DELETE /api/v1/users/:id`: Delete account; ADMIN, MENTOR; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **CreateAdmin** — `POST /api/v1/admins`: Create administrator; ADMIN; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **ListAdmins** — `GET /api/v1/admins`: Administrator directory; ADMIN; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **GetAdmin** — `GET /api/v1/admins/:id`: Administrator profile detail; ADMIN; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **UpdateAdmin** — `PATCH /api/v1/admins/:id`: Edit administrator profile; ADMIN; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **DeleteAdmin** — `DELETE /api/v1/admins/:id`: Delete administrator profile; ADMIN; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **ListMentors** — `GET /api/v1/mentors`: Mentor directory; ADMIN; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **CreateMentor** — `POST /api/v1/mentors`: Create mentor; ADMIN; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **ListStudents** — `GET /api/v1/students`: Student directory; ADMIN, MENTOR; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **CreateSubmission** — `POST /api/v1/submissions`: Submit project; STUDENT; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **ListSubmissions** — `GET /api/v1/submissions`: Submission review queue; ADMIN, MENTOR; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **ListMySubmissions** — `GET /api/v1/submissions/my`: My projects; STUDENT; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **SubmissionStatistics** — `GET /api/v1/submissions/statistics`: Submission dashboard; ADMIN, MENTOR; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **GetSubmission** — `GET /api/v1/submissions/:id`: Project details; ADMIN, MENTOR, STUDENT; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **UpdateSubmission** — `PATCH /api/v1/submissions/:id`: Edit my project; STUDENT; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **DeleteSubmission** — `DELETE /api/v1/submissions/:id`: Delete my project; STUDENT; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **CreateReview** — `POST /api/v1/submissions/:id/reviews`: Approve/reject project; ADMIN, MENTOR; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **ListReviews** — `GET /api/v1/submissions/:id/reviews`: Review history; ADMIN, MENTOR; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **ListAuditLogs** — `GET /api/v1/audit-logs`: Audit history; ADMIN, MENTOR; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **GetAuditLog** — `GET /api/v1/audit-logs/:id`: Audit entry detail; ADMIN, MENTOR; success, applicable validation/auth/scope/conflict/not-found/network errors handled.
- [ ] **Health** — `GET /health`: Service status / diagnostics; Public; success, applicable validation/auth/scope/conflict/not-found/network errors handled.

- [ ] Contract imports preserve nullable/optional fields and DateTime strings; no database models guessed as wire responses.
- [ ] Session bootstrap, single refresh/retry, cookie transport, logout cleanup and role-change renewal verified against the actual deployment.
- [ ] All eight tables implement only documented queries, default pagination, meta.total and empty/out-of-range states.
- [ ] Forms implement field/byte limits and null clearing rules; no role/owner injection or unsupported file fields.
- [ ] Student ownership and PENDING gates applied; terminal/revision-required rows have no unsupported reopening action.
- [ ] User deletion, Admin profile deletion and submission deletion have distinct state/refetch behavior.
- [ ] Mentor student-account scope and own-review audit scope enforced in UI and tested against backend denials.
- [ ] Review/status mutation refetches dependent records/history/statistics/audits; generic account edits do not imply an audit record.
- [ ] Role changes/missing profiles, process-local cache delay, duplicate repository races and non-revoked JWTs are reflected in integration assumptions.

## Verification limits

Source audit covers all mounted routes through repositories/selections and error formatting. No database writes, migration, seed or deployment were performed. **Not verified — runtime confirmation required:** successful end-to-end flows for all 34 business endpoints with their required authenticated/database context, actual stored/applied schema data, deployed cookies/CORS, concurrency and multi-instance cache invalidation. Static DTO validation and dependency-free type compilation cannot establish these behaviors. Existing Jest configuration imports a missing helper and the tests/Postman directories contain no tests/collections; do not infer tested integration coverage from the package scripts. See README for checks actually run during documentation verification.

### Checks executed during this audit

- `pnpm tsc:check` passed for the existing backend.
- `pnpm exec tsc --noEmit --strict --skipLibCheck --target ES2022 docs/API_CONTRACTS.ts` passed for the standalone contracts.
- Instantiated Express-router inspection matched all 35 documented method/path pairs exactly; all 35 five-type contract sets and frontend checklist entries were present.
- Executed real Zod parsing for 45 documented request examples; compared all 14 JSON-body field groups for exact keys, required/optional and nullable behavior, and all eight list query-key sets against mounted schemas.
- Compiled 53 complete success JSON examples and 208 complete error JSON examples against generated types; compared 29 validation-error examples with the actual backend formatter and 13 selected backend response types bidirectionally after Date-to-string serialization (audit JSON accounts for sanitization).
- Parsed every JSON code fence and checked local Markdown file/endpoint-anchor links.
- Supertest checks without database queries passed: health 200; missing/invalid bearer 401; invalid login/registration bodies 400; missing refresh credentials 401; unknown route 404; allowed localhost CORS preflight 204 with credentials enabled. These are targeted checks, not full authenticated/database integration tests.

No build, migration, seed, dependency installation, deployment or database writes were run. Existing Jest suites were not run because this checkout contains no test files and its configured database setup helper is missing. The verification harness was temporary outside the repository; only the four requested documentation artifacts were created/updated. README.md is currently ignored by an existing .gitignore rule; it was still updated locally. Ignore rules were not edited by this audit.
