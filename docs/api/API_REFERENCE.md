# Backend API reference

Audited against the current source on 26 October 2026. This is the implemented contract, including legacy routes and implementation limitations. Examples are representative serialized values derived from source, not captured database responses. **Not verified — runtime confirmation required** for end-to-end database-backed success paths, deployed configuration, cookie transport and concurrency behavior. The final audit notes distinguish local checks from static findings.

## Base URLs and conventions

- Native local origin: `http://localhost:5000` when `PORT` is unchanged. Business API prefix: `/api/v1`. Health is `/health` on the origin, outside the prefix. Docker Compose maps host port `5062` to container `5000`. No production API URL is hardcoded in application routes; configure the frontend origin/base URL for its deployment.
- All business payloads use JSON; send `Content-Type: application/json` for bodies, and optionally `Accept: application/json`. JSON and URL-encoded parsers each have a 1 MB limit. Prefer JSON to preserve booleans/nulls. No route mounts file upload, encrypted-body, `jsonEncoded`, or body-data parsing middleware; there is no supported multipart API or static upload endpoint.
- Protected requests require `Authorization: Bearer <accessToken>`; the scheme is case-insensitive. Cookies cannot replace the access bearer token. `x-client-*`, device and timezone headers are not required by any active endpoint.
- All `:id` values are UUID strings, validated with `z.string().uuid("Invalid UUID")`. Route parameter meaning varies: User ID, Admin profile ID, Submission ID or Audit ID. Do not interchange them.
- All declared request bodies are strict objects: unknown keys produce 400. There are no nested input objects or array body fields in active APIs. All list query objects are strict. Routes validating only params/body ignore unrelated query fields; unvalidated routes ignore query/body entirely. The accepted inputs below describe supported behavior, not a promise that every extraneous value is rejected.
- Required fields must be present; optional does not imply nullable. A body field permits JSON null only when explicitly marked nullable. Missing optional creation fields normally become database null when nullable. Updates preserve omitted fields. All string limits are Zod character counts (JavaScript string length); new passwords also have a 72 UTF-8 byte bound.
- Response UUIDs are strings; Prisma Date values serialize as ISO 8601 UTC strings. Tables use `TIMESTAMPTZ(0)` (second precision). No BigInt response conversions are on the active request path. Booleans/numbers are JSON booleans/numbers, not strings.
- Express supports automatic HEAD for GET routes and CORS middleware handles OPTIONS preflight; inventory counts the 35 explicitly registered method/path contracts, not implicit HEAD, preflight or catch-all handlers. There are zero explicitly registered PUT endpoints. Trailing slash/case handling uses default Express routing.

## Authentication, cookies and permissions

Registration creates STUDENT only and does not log in. Login issues signed access/refresh JWTs containing `userId` and `role` (plus JWT timestamps). `expiresIn` in response JSON is access-token seconds, default 604800; refresh lifetime defaults to 2592000 seconds. Refresh reloads the account and returns a new pair without invalidating previous pairs.

Login/refresh set `refreshToken`: HttpOnly, SameSite=Lax, path `/api/v1/auth`, Secure only when NODE_ENV=production, no Domain override, maxAge = configured refresh seconds × 1000 (Express serializes cookie lifetime). Logout clears the same cookie using matching options. Registration sets no cookie. Refresh accepts cookie or `{ "refreshToken": "..." }`; cookie has nullish precedence. Browser cookie requests need `credentials: "include"` (Axios `withCredentials: true`). HttpOnly prevents JavaScript reading the cookie, but JSON responses also expose the refresh token. No backend mandate specifies localStorage or other frontend storage. Lax cookies can be excluded on cross-site POST; browser/deployment behavior needs runtime confirmation.

Middleware checks the token role first on role-restricted routes, then uses a process-local account cache with 300-second TTL (60-second cleanup period) or loads a non-deleted User. It checks the cached/loaded role and isActive. User account edits, status changes and deletion invalidate the target cache only in this process. External writes and other processes can leave stale authorization until TTL; not every request reloads DB. Session, password change, self-profile changes, student lookup, mentor creation and review creation have additional fresh checks described below. Logout/password changes do not revoke JWTs. No forgot/reset password, email verification, token revocation or public account restore endpoints exist.

| Operation                               | ADMIN                                                | MENTOR                                         | STUDENT                    |
| --------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- | -------------------------- |
| Session, own profiles, password, logout | Own account                                          | Own account                                    | Own account                |
| Admin CRUD and mentor list/create       | Yes; mentor creation also needs active Admin profile | No                                             | No                         |
| Student directory                       | Yes                                                  | Yes                                            | No                         |
| User list/detail/edit/delete/status     | Any non-deleted target; no self-deactivation         | STUDENT targets only; cannot supply role       | No                         |
| Role changes via user edit              | Yes; profiles not synchronized                       | No                                             | No                         |
| Create/list own submission              | No                                                   | No                                             | Own active Student profile |
| Submission management list/statistics   | Yes                                                  | Yes                                            | No                         |
| Submission detail                       | All visible                                          | All visible                                    | Owned visible only         |
| Submission edit/delete                  | No                                                   | No                                             | Owned PENDING only         |
| Review create/history                   | Yes                                                  | Yes                                            | No                         |
| Audit list/detail                       | All visible logs                                     | Own Submission / SUBMISSION_REVIEWED logs only | No                         |

The frontend should use these effective permissions; a route allowing MENTOR does not allow managing other mentors or administrators. Only `/users/:id/status` records status audit data; generic user PATCH does not.

## Pagination, filters, search and sorting

All eight listing endpoints return arrays plus `meta: { page, limit, total }`. Defaults page=1, limit=10; query coercion requires positive integers, page <=1000000, limit <=100. Invalid/excessive values fail validation instead of being silently capped at HTTP level. total counts matching visible rows across pages, not current page length. No totalPages/hasNext/offset/cursor fields exist. Compute totalPages as `Math.ceil(total / limit)`; an out-of-range page succeeds with `data: []` while total can remain positive.

Filters combine with AND. Search terms create OR across the documented fields, then intersect other filters/visibility. Search is case-insensitive substring; `%`, `_` and backslash are escaped as literals. Empty search strings add no search condition; if the preferred alias is present but empty it suppresses the fallback alias. Users/Admins prefer `search`; Mentors/Students prefer `searchTerm`. Submissions accept only `searchTerm`; my submissions and review history accept no search. There are no generic filter operators, dynamic field selections, `include`, relation-expansion queries or arbitrary sorting.

Sortable lists default to createdAt desc, then id asc; sorting id uses only requested id direction. My submissions are fixed createdAt desc/id asc. Reviews are fixed createdAt asc/id asc. Status sorting uses database enum order (PENDING, APPROVED, REJECTED, REVISION_REQUIRED), not alphabetical order. Dates are only supported for Users/Admins/Audit logs: valid `YYYY-MM-DD`, inclusive UTC day bounds on createdAt, with fromDate <= toDate. No timezone query/header changes those bounds.

## Common success and error JSON

All business success responses include `success: true`, HTTP-matching numeric `statusCode`, string `message` (often empty), and `data`. Lists additionally include meta. Non-list meta is absent, not null. Missing controller data serializes as null. Health is the sole plain success JSON response. Exact examples appear per endpoint.

Global error JSON has `success: false`, message, optional errorCode and singular `errorMessage` array; it has no statusCode or data. Read the HTTP status separately. ApiError produces one `{ "path": "", "message": <same user message> }` entry and no errorCode in active services. Validation issues use only the final path segment (string/array index); root refinements can omit path. Do not expect complete dotted paths or an issues array.

Validation example (400, bad UUID):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

Validation summary is constructed as `Validation Error:-> ${lastPathSegment} : ${issueMessage}` with comma-joined issues. Strict-key violations use Zod's actual issue wording. Empty mutation bodies (where disallowed) produce `At least one field is required`. Users/Admins date inversion reports `toDate must be on or after fromDate`; audit date inversion reports `Invalid date range` at query. Different Zod issue messages and multi-issue combinations are possible; do not hardcode the top-level message as a form field identifier.

Prisma known errors preserve the same singular errorMessage envelope:

| HTTP | Prisma code               | Message                         | errorMessage                                              |
| ---- | ------------------------- | ------------------------------- | --------------------------------------------------------- |
| 409  | P2002                     | Duplicate ${field} value        | [{path: field, message: same message}]                    |
| 409  | P2034                     | Concurrent change; please retry | []                                                        |
| 404  | P2025                     | Record not found                | [{path: "", message: "Record not found"}]                 |
| 400  | P2003                     | Invalid reference               | [{path: "", message: "Referenced record does not exist"}] |
| 500  | Other known request error | Something went wrong            | []                                                        |

P2002 uses the first meta.target field or `field`; mapped foreign-key names become camelCase (`userId`, `studentId`, `submissionId`, `reviewerUserId`, `actorUserId`, `createdByAdminId`). Unique email normally yields:

```json
{
  "success": false,
  "message": "Duplicate email value",
  "errorMessage": [
    {
      "path": "email",
      "message": "Duplicate email value"
    }
  ]
}
```

Unexpected Error (including malformed/oversized JSON and rejected CORS Origin in this handler) becomes HTTP 500, message `Unexpected server error` outside production, or `Something went wrong. Please try again later.` in production, errorCode `INTERNAL_SERVER_ERROR`, errorMessage `[]`. The handler does not preserve body-parser 400/413 statuses. Raw JWT errors would map to 401 with INVALID_TOKEN/TOKEN_EXPIRED, but active middleware/refresh catch JWT errors first and issue the explicit ApiError messages shown per endpoint.

Global limiter applies to all requests after parsers (including health). Default 200 requests/60000 ms per IP. Registration adds 10/hour per IP, login 20/15 minutes per IP, submission create 20/minute keyed to authenticated User ID. These are configurable, process-local in-memory counters; middleware order can make rate limiting precede validation/auth. CORS preflight is normally handled before the limiter. Limiter failures use a different envelope (429):

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

Unmatched route (404; plural errorMessages, no statusCode/data):

```json
{
  "success": false,
  "message": "Route not found",
  "errorMessages": [
    {
      "path": "/api/v1/unknown",
      "message": "api not found"
    }
  ]
}
```

## Serialized data field catalogue

Every listed field is present on that selected response object unless the type contains null; nullable means present with null, not omitted. Nested types are expanded in their own tables below. This catalogue and endpoint JSON examples describe actual selected/omitted fields, not unrestricted database models. Password hashes never appear in these success selections. Token strings are returned only by Login and RefreshToken.

`Role = ADMIN | MENTOR | STUDENT`; `SubmissionStatus = PENDING | APPROVED | REJECTED | REVISION_REQUIRED`; `ReviewDecision = APPROVED | REJECTED`. UUID and DateTime are string aliases; JsonValue is JSON primitive/null/array/object recursively. JSON snapshots can contain arbitrary persisted keys; only the two writer shapes below are generated by current public mutations.

### UserRecord

| Field       | Serialized type | Meaning                                  |
| ----------- | --------------- | ---------------------------------------- |
| id          | UUID            | User account ID                          |
| email       | string          | Account email                            |
| role        | Role            | Current account role                     |
| isActive    | boolean         | Account enabled flag                     |
| lastLoginAt | DateTime / null | Last successful login, null before login |
| isDeleted   | boolean         | Soft deletion flag                       |
| deletedAt   | DateTime / null | Soft deletion timestamp                  |
| createdAt   | DateTime        | Creation time                            |
| updatedAt   | DateTime        | Last update time                         |

### UserListItem

| Field     | Serialized type | Meaning            |
| --------- | --------------- | ------------------ |
| id        | UUID            | User account ID    |
| email     | string          | Account email      |
| role      | Role            | Current role       |
| isActive  | boolean         | Enabled flag       |
| isDeleted | boolean         | Soft deletion flag |
| deletedAt | DateTime / null | Deletion time      |
| createdAt | DateTime        | Creation time      |
| updatedAt | DateTime        | Last update time   |

### ProfileFields

| Field     | Serialized type | Meaning                      |
| --------- | --------------- | ---------------------------- |
| id        | UUID            | Role profile ID, not User ID |
| firstName | string          | Given name                   |
| lastName  | string          | Family name                  |
| phone     | string / null   | Telephone                    |
| bio       | string / null   | Biography                    |
| createdAt | DateTime        | Profile creation time        |
| updatedAt | DateTime        | Profile update time          |

### AdminProfileFields

Includes every field from **ProfileFields**, plus the following fields.

No extra fields beyond the inherited ProfileFields.

### MentorProfileFields

Includes every field from **ProfileFields**, plus the following fields.

| Field  | Serialized type | Meaning                                       |
| ------ | --------------- | --------------------------------------------- |
| gender | string          | Required Mentor gender in database; free text |

### StudentProfileFields

Includes every field from **ProfileFields**, plus the following fields.

| Field  | Serialized type | Meaning                 |
| ------ | --------------- | ----------------------- |
| gender | string / null   | Optional Student gender |

### UserProfile

| Field       | Serialized type             | Meaning                               |
| ----------- | --------------------------- | ------------------------------------- |
| id          | UUID                        | User account ID                       |
| email       | string                      | Account email                         |
| role        | Role                        | Current role                          |
| isActive    | boolean                     | Enabled flag                          |
| lastLoginAt | DateTime / null             | Last login                            |
| createdAt   | DateTime                    | User creation time                    |
| updatedAt   | DateTime                    | User update time                      |
| admin       | AdminProfileFields / null   | Non-deleted Admin profile, nullable   |
| mentor      | MentorProfileFields / null  | Non-deleted Mentor profile, nullable  |
| student     | StudentProfileFields / null | Non-deleted Student profile, nullable |

### RegisteredStudentFields

| Field     | Serialized type | Meaning                    |
| --------- | --------------- | -------------------------- |
| id        | UUID            | Created Student profile ID |
| firstName | string          | Given name                 |
| lastName  | string          | Family name                |
| phone     | string / null   | Telephone                  |
| gender    | string / null   | Gender                     |

### RegisteredStudent

| Field       | Serialized type         | Meaning                                      |
| ----------- | ----------------------- | -------------------------------------------- |
| id          | UUID                    | User ID                                      |
| email       | string                  | Normalized email                             |
| role        | 'STUDENT'               | Always STUDENT                               |
| isActive    | boolean                 | Initially true                               |
| lastLoginAt | DateTime / null         | Initially null                               |
| isDeleted   | boolean                 | Initially false                              |
| deletedAt   | DateTime / null         | Initially null                               |
| createdAt   | DateTime                | User creation time                           |
| updatedAt   | DateTime                | User update time                             |
| student     | RegisteredStudentFields | Selected new profile; not full Student model |

### AuthUser

| Field | Serialized type | Meaning                                           |
| ----- | --------------- | ------------------------------------------------- |
| id    | UUID            | User ID                                           |
| email | string          | Email                                             |
| role  | Role            | Current role                                      |
| name  | string          | Role profile firstName + space + lastName, or N/A |

### AuthTokens

| Field        | Serialized type | Meaning                           |
| ------------ | --------------- | --------------------------------- |
| accessToken  | string          | Access JWT                        |
| refreshToken | string          | Refresh JWT also returned in JSON |
| expiresIn    | number          | Access lifetime in seconds        |
| user         | AuthUser        | Account display identity          |

### SessionUser

| Field    | Serialized type | Meaning                        |
| -------- | --------------- | ------------------------------ |
| id       | UUID            | User ID                        |
| email    | string          | Email                          |
| role     | Role            | Current role                   |
| isActive | boolean         | True in successful fresh query |

### PasswordChangeResult

| Field   | Serialized type     | Meaning                                             |
| ------- | ------------------- | --------------------------------------------------- |
| message | 'Password changed.' | Nested data.message; envelope message remains empty |

### AdminRecord

| Field     | Serialized type | Meaning               |
| --------- | --------------- | --------------------- |
| id        | UUID            | Admin profile ID      |
| userId    | UUID            | Linked User ID        |
| firstName | string          | Given name            |
| lastName  | string          | Family name           |
| phone     | string / null   | Telephone             |
| bio       | string / null   | Biography             |
| isDeleted | boolean         | Profile deletion flag |
| deletedAt | DateTime / null | Profile deletion time |
| createdAt | DateTime        | Creation time         |
| updatedAt | DateTime        | Update time           |

### AdminAccountSummary

| Field     | Serialized type | Meaning            |
| --------- | --------------- | ------------------ |
| id        | UUID            | User ID            |
| email     | string          | Email              |
| role      | Role            | Current role       |
| isActive  | boolean         | User enabled flag  |
| isDeleted | boolean         | User deletion flag |

### AdminDetail

Includes every field from **AdminRecord**, plus the following fields.

| Field | Serialized type     | Meaning                                                         |
| ----- | ------------------- | --------------------------------------------------------------- |
| user  | AdminAccountSummary | Required related User; full AdminRecord fields are also present |

### AccountSummary

| Field    | Serialized type | Meaning           |
| -------- | --------------- | ----------------- |
| id       | UUID            | User ID           |
| email    | string          | Email             |
| role     | Role            | Current role      |
| isActive | boolean         | User enabled flag |

### StudentRecord

| Field     | Serialized type | Meaning               |
| --------- | --------------- | --------------------- |
| id        | UUID            | Student profile ID    |
| userId    | UUID            | User ID               |
| firstName | string          | Given name            |
| lastName  | string          | Family name           |
| phone     | string / null   | Telephone             |
| bio       | string / null   | Biography             |
| gender    | string / null   | Gender                |
| createdAt | DateTime        | Profile creation time |
| updatedAt | DateTime        | Profile update time   |
| user      | AccountSummary  | Linked User summary   |

### MentorRecord

| Field            | Serialized type | Meaning                                           |
| ---------------- | --------------- | ------------------------------------------------- |
| id               | UUID            | Mentor profile ID                                 |
| userId           | UUID            | User ID                                           |
| firstName        | string          | Given name                                        |
| lastName         | string          | Family name                                       |
| phone            | string / null   | Telephone                                         |
| bio              | string / null   | Biography                                         |
| gender           | string          | Gender                                            |
| createdAt        | DateTime        | Profile creation time                             |
| updatedAt        | DateTime        | Profile update time                               |
| user             | AccountSummary  | Linked User summary                               |
| createdByAdminId | UUID / null     | Creator Admin profile ID; may be null in database |

### SubmissionUser

| Field | Serialized type | Meaning         |
| ----- | --------------- | --------------- |
| id    | UUID            | Student User ID |
| email | string          | Student email   |

### SubmissionStudent

| Field     | Serialized type | Meaning                |
| --------- | --------------- | ---------------------- |
| id        | UUID            | Student profile ID     |
| userId    | UUID            | Student User ID        |
| firstName | string          | Given name             |
| lastName  | string          | Family name            |
| user      | SubmissionUser  | Limited account fields |

### SubmissionRecord

| Field        | Serialized type   | Meaning                                         |
| ------------ | ----------------- | ----------------------------------------------- |
| id           | UUID              | Submission ID                                   |
| studentId    | UUID              | Student profile ID                              |
| projectName  | string            | Project title                                   |
| repoUrl      | string            | Trimmed supplied repository URL                 |
| repoFullName | string            | Normalized lowercase owner/repository           |
| liveUrl      | string            | Trimmed live application URL                    |
| description  | string            | Project description                             |
| status       | SubmissionStatus  | Current status                                  |
| createdAt    | DateTime          | Creation time                                   |
| updatedAt    | DateTime          | Update time                                     |
| student      | SubmissionStudent | Student identity; no feedback or other profiles |

### SubmissionDeleteResult

| Field     | Serialized type | Meaning                |
| --------- | --------------- | ---------------------- |
| id        | UUID            | Deleted submission ID  |
| isDeleted | true            | Always true on success |

### SubmissionCounts

| Field            | Serialized type | Meaning                       |
| ---------------- | --------------- | ----------------------------- |
| total            | number          | Sum of all four status counts |
| pending          | number          | PENDING count                 |
| approved         | number          | APPROVED count                |
| rejected         | number          | REJECTED count                |
| revisionRequired | number          | REVISION_REQUIRED count       |

### ReviewerName

| Field     | Serialized type | Meaning     |
| --------- | --------------- | ----------- |
| firstName | string          | Given name  |
| lastName  | string          | Family name |

### Reviewer

| Field  | Serialized type     | Meaning                                     |
| ------ | ------------------- | ------------------------------------------- |
| id     | UUID                | Reviewer User ID                            |
| email  | string              | Current email                               |
| role   | Role                | Current role; can have changed after review |
| admin  | ReviewerName / null | Non-deleted Admin profile names             |
| mentor | ReviewerName / null | Non-deleted Mentor profile names            |

### ReviewRecord

| Field          | Serialized type  | Meaning                            |
| -------------- | ---------------- | ---------------------------------- |
| id             | UUID             | Review ID                          |
| submissionId   | UUID             | Submission ID                      |
| reviewerUserId | UUID             | Reviewer account ID                |
| previousStatus | SubmissionStatus | Stored previous status             |
| status         | SubmissionStatus | Stored decision                    |
| feedback       | string / null    | Feedback                           |
| createdAt      | DateTime         | Creation time                      |
| updatedAt      | DateTime         | Update time                        |
| reviewer       | Reviewer         | Selected current reviewer identity |

### Actor

| Field | Serialized type | Meaning             |
| ----- | --------------- | ------------------- |
| id    | UUID            | Actor User ID       |
| email | string          | Current actor email |
| role  | Role            | Current actor role  |

### AuditLogRecord

| Field       | Serialized type | Meaning                                           |
| ----------- | --------------- | ------------------------------------------------- |
| id          | UUID            | Audit ID                                          |
| actorUserId | UUID / null     | Actor User ID                                     |
| action      | string          | Action; no response enum restriction              |
| entityType  | string          | Entity type; no response enum restriction         |
| entityId    | UUID / null     | Related entity ID                                 |
| oldData     | JsonValue       | Old snapshot; null allowed; recursively sanitized |
| newData     | JsonValue       | New snapshot; null allowed; recursively sanitized |
| ipAddress   | string / null   | IP context when recorded                          |
| userAgent   | string / null   | User-agent context when recorded                  |
| createdAt   | DateTime        | Creation time                                     |
| actor       | Actor / null    | Actor relation                                    |

### HealthResult

| Field  | Serialized type | Meaning                |
| ------ | --------------- | ---------------------- |
| status | 'ok'            | Process status literal |
| time   | DateTime        | Current server time    |

### CreatedReview

All ReviewRecord fields, with previousStatus exactly PENDING and status APPROVED or REJECTED. Historical ReviewRecord keeps the full database enum because persisted/imported history can hold other schema statuses. reviewer role/name values are current, not historical snapshots. Foreign keys make reviewer/student/user relations required where selected; nullable profile relations remain null if missing/deleted.

## API inventory and endpoint index

35 active explicit endpoints; 17 GET, 9 POST, 0 PUT, 6 PATCH, 3 DELETE. Four have no access-bearer requirement: Register, Login, Health and RefreshToken. RefreshToken still requires refresh credentials. Thus three are credential-free entry points, one refresh-credential endpoint, and 31 are bearer-protected. Of the protected endpoints, 24 have an explicit route role list; seven accept any authenticated role.

| Module             | Count |
| ------------------ | ----- |
| Authentication     | 7     |
| Users              | 8     |
| Admins             | 5     |
| Mentors            | 2     |
| Students           | 1     |
| Submissions        | 7     |
| Submission reviews | 2     |
| Audit logs         | 2     |
| Operations         | 1     |

| Contract ID                                            | Method | Full path                       | Route access / effective scope | Handler                                 |
| ------------------------------------------------------ | ------ | ------------------------------- | ------------------------------ | --------------------------------------- |
| [Register](#endpoint-register)                         | POST   | /api/v1/auth/register           | Public                         | AuthenticationController.register       |
| [Login](#endpoint-login)                               | POST   | /api/v1/auth/login              | Public                         | AuthenticationController.login          |
| [RefreshToken](#endpoint-refreshtoken)                 | POST   | /api/v1/auth/refresh-token      | Refresh token                  | AuthenticationController.refresh        |
| [Logout](#endpoint-logout)                             | POST   | /api/v1/auth/logout             | All                            | AuthenticationController.logout         |
| [Session](#endpoint-session)                           | GET    | /api/v1/auth/session            | All                            | AuthenticationController.session        |
| [GetAuthProfile](#endpoint-getauthprofile)             | GET    | /api/v1/auth/profile            | All                            | AuthenticationController.profile        |
| [ChangePasswordLegacy](#endpoint-changepasswordlegacy) | POST   | /api/v1/auth/change-password    | All                            | AuthenticationController.changePassword |
| [GetOwnProfile](#endpoint-getownprofile)               | GET    | /api/v1/users/profile           | All                            | UserController.profile                  |
| [UpdateOwnProfile](#endpoint-updateownprofile)         | PATCH  | /api/v1/users/profile           | All                            | UserController.updateProfile            |
| [ChangePassword](#endpoint-changepassword)             | PATCH  | /api/v1/users/change-password   | All                            | AuthenticationController.changePassword |
| [UpdateUserStatus](#endpoint-updateuserstatus)         | PATCH  | /api/v1/users/:id/status        | ADMIN, MENTOR                  | UserController.updateStatus             |
| [ListUsers](#endpoint-listusers)                       | GET    | /api/v1/users                   | ADMIN, MENTOR                  | UserController.findMany                 |
| [GetUser](#endpoint-getuser)                           | GET    | /api/v1/users/:id               | ADMIN, MENTOR                  | UserController.getById                  |
| [UpdateUser](#endpoint-updateuser)                     | PATCH  | /api/v1/users/:id               | ADMIN, MENTOR                  | UserController.update                   |
| [DeleteUser](#endpoint-deleteuser)                     | DELETE | /api/v1/users/:id               | ADMIN, MENTOR                  | UserController.remove                   |
| [CreateAdmin](#endpoint-createadmin)                   | POST   | /api/v1/admins                  | ADMIN                          | AdminController.create                  |
| [ListAdmins](#endpoint-listadmins)                     | GET    | /api/v1/admins                  | ADMIN                          | AdminController.list                    |
| [GetAdmin](#endpoint-getadmin)                         | GET    | /api/v1/admins/:id              | ADMIN                          | AdminController.getById                 |
| [UpdateAdmin](#endpoint-updateadmin)                   | PATCH  | /api/v1/admins/:id              | ADMIN                          | AdminController.update                  |
| [DeleteAdmin](#endpoint-deleteadmin)                   | DELETE | /api/v1/admins/:id              | ADMIN                          | AdminController.remove                  |
| [ListMentors](#endpoint-listmentors)                   | GET    | /api/v1/mentors                 | ADMIN                          | MentorController.list                   |
| [CreateMentor](#endpoint-creatementor)                 | POST   | /api/v1/mentors                 | ADMIN                          | MentorController.create                 |
| [ListStudents](#endpoint-liststudents)                 | GET    | /api/v1/students                | ADMIN, MENTOR                  | StudentController.list                  |
| [CreateSubmission](#endpoint-createsubmission)         | POST   | /api/v1/submissions             | STUDENT                        | SubmissionController.create             |
| [ListSubmissions](#endpoint-listsubmissions)           | GET    | /api/v1/submissions             | ADMIN, MENTOR                  | SubmissionController.list               |
| [ListMySubmissions](#endpoint-listmysubmissions)       | GET    | /api/v1/submissions/my          | STUDENT                        | SubmissionController.mine               |
| [SubmissionStatistics](#endpoint-submissionstatistics) | GET    | /api/v1/submissions/statistics  | ADMIN, MENTOR                  | SubmissionController.statistics         |
| [GetSubmission](#endpoint-getsubmission)               | GET    | /api/v1/submissions/:id         | ADMIN, MENTOR, STUDENT         | SubmissionController.getById            |
| [UpdateSubmission](#endpoint-updatesubmission)         | PATCH  | /api/v1/submissions/:id         | STUDENT                        | SubmissionController.update             |
| [DeleteSubmission](#endpoint-deletesubmission)         | DELETE | /api/v1/submissions/:id         | STUDENT                        | SubmissionController.remove             |
| [CreateReview](#endpoint-createreview)                 | POST   | /api/v1/submissions/:id/reviews | ADMIN, MENTOR                  | SubmissionReviewController.create       |
| [ListReviews](#endpoint-listreviews)                   | GET    | /api/v1/submissions/:id/reviews | ADMIN, MENTOR                  | SubmissionReviewController.list         |
| [ListAuditLogs](#endpoint-listauditlogs)               | GET    | /api/v1/audit-logs              | ADMIN, MENTOR                  | AuditLogController.list                 |
| [GetAuditLog](#endpoint-getauditlog)                   | GET    | /api/v1/audit-logs/:id          | ADMIN, MENTOR                  | AuditLogController.getById              |
| [Health](#endpoint-health)                             | GET    | /health                         | Public                         | inline handler in src/app.ts            |

## Authentication endpoints

<a id="endpoint-register"></a>

### Endpoint: POST /api/v1/auth/register

**Contract ID:** `Register` (entry 1 of 35). TypeScript aliases: `RegisterParams`, `RegisterQuery`, `RegisterBody`, `RegisterResponse`, `RegisterErrorResponse`.

**Overview**

Create a STUDENT account and Student profile in one transaction. Frontend feature: Student registration.

**Authentication & authorization**

- Authentication required: No.
- Allowed roles: No role restriction; Public.
- Required headers: `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field     | Type   | Required | Nullable | Validation / default                                                             | Description                                     |
| --------- | ------ | -------- | -------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| email     | string | Yes      | No       | Trim; valid email; max 255 characters; lowercase                                 | Account email, unique even for deleted accounts |
| password  | string | Yes      | No       | 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim | New account password                            |
| firstName | string | Yes      | No       | Trim; 1-100 characters                                                           | Given name                                      |
| lastName  | string | Yes      | No       | Trim; 1-100 characters                                                           | Family name                                     |
| phone     | string | No       | No       | Trim; 1-20 characters                                                            | Optional telephone; omit to store null          |
| gender    | string | No       | No       | Trim; 1-255 characters; no enum                                                  | Free-text gender                                |

Strict JSON object; unknown fields fail 400. No nested body objects, arrays, files or date inputs.

```json
{
  "email": "student@example.com",
  "password": "Student2026!",
  "firstName": "Nadia",
  "lastName": "Rahman"
}
```

**Request example**

```http
POST /api/v1/auth/register HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "Student2026!",
  "firstName": "Nadia",
  "lastName": "Rahman"
}
```

**Success response**

HTTP **201**. Envelope data type: `RegisteredStudent`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Student registered",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "student@example.com",
    "role": "STUDENT",
    "isActive": true,
    "lastLoginAt": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z",
    "student": {
      "id": "22222222-2222-4222-8222-222222222222",
      "firstName": "Nadia",
      "lastName": "Rahman",
      "phone": null,
      "gender": null
    }
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 409         | Email already in use                                                    | Email already exists, including deleted accounts                                      |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter plus registration limiter                                              |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 409:

```json
{
  "success": false,
  "message": "Email already in use",
  "errorMessage": [
    {
      "path": "",
      "message": "Email already in use"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid body):

```json
{
  "success": false,
  "message": "Validation Error:-> body : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "body",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

No tokens or cookie are issued. Follow with Login. Account/profile creation is atomic; never submit role, studentId, bio or owner IDs.

Navigate to login; registration does not create a logged-in session.

**Source trace**

Handler: `AuthenticationController.register`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/authentication/authentication.route.ts](../src/app/modules/authentication/authentication.route.ts) → [src/app/modules/authentication/authentication.controller.ts](../src/app/modules/authentication/authentication.controller.ts) → [src/app/modules/authentication/authentication.service.ts](../src/app/modules/authentication/authentication.service.ts) → [src/app/modules/authentication/authentication.repository.ts](../src/app/modules/authentication/authentication.repository.ts) → [src/app/modules/authentication/authentication.validation.ts](../src/app/modules/authentication/authentication.validation.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`. Account creation additionally calls `user.service.ts:createAccount` and the relevant profile repository in the same transaction.

---

<a id="endpoint-login"></a>

### Endpoint: POST /api/v1/auth/login

**Contract ID:** `Login` (entry 2 of 35). TypeScript aliases: `LoginParams`, `LoginQuery`, `LoginBody`, `LoginResponse`, `LoginErrorResponse`.

**Overview**

Validate credentials, update lastLoginAt, issue access/refresh JWTs and set refresh cookie. Frontend feature: Sign in.

**Authentication & authorization**

- Authentication required: No.
- Allowed roles: No role restriction; Public.
- Required headers: `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.
- Response cookie: sets `refreshToken` with configured lifetime and common refresh-cookie attributes.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field    | Type   | Required | Nullable | Validation / default                             | Description                                     |
| -------- | ------ | -------- | -------- | ------------------------------------------------ | ----------------------------------------------- |
| email    | string | Yes      | No       | Trim; valid email; max 255 characters; lowercase | Account email, unique even for deleted accounts |
| password | string | Yes      | No       | 1-1024 characters; no trim                       | Existing password                               |

Strict JSON object; unknown fields fail 400. No nested body objects, arrays, files or date inputs.

```json
{
  "email": "student@example.com",
  "password": "Student2026!"
}
```

**Request example**

```http
POST /api/v1/auth/login HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "Student2026!"
}
```

**Success response**

HTTP **200**. Envelope data type: `AuthTokens`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9.example-access.signature",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9.example-refresh.signature",
    "expiresIn": 604800,
    "user": {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "student@example.com",
      "role": "STUDENT",
      "name": "Nadia Rahman"
    }
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 404         | Not found user                                                          | Email missing or deleted                                                              |
| 401         | Inactive user                                                           | User disabled                                                                         |
| 401         | Invalid credentials                                                     | Password mismatch                                                                     |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter plus login limiter                                                     |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 404:

```json
{
  "success": false,
  "message": "Not found user",
  "errorMessage": [
    {
      "path": "",
      "message": "Not found user"
    }
  ]
}
```

HTTP 401:

```json
{
  "success": false,
  "message": "Inactive user",
  "errorMessage": [
    {
      "path": "",
      "message": "Inactive user"
    }
  ]
}
```

HTTP 401:

```json
{
  "success": false,
  "message": "Invalid credentials",
  "errorMessage": [
    {
      "path": "",
      "message": "Invalid credentials"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid body):

```json
{
  "success": false,
  "message": "Validation Error:-> body : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "body",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Names come from the current role profile without a deleted-profile filter; missing profile yields name N/A. expiresIn is configured access-token seconds. Example token strings are illustrative and unusable.

Store returned user/access token in session state and load Session and GetOwnProfile.

**Source trace**

Handler: `AuthenticationController.login`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/authentication/authentication.route.ts](../src/app/modules/authentication/authentication.route.ts) → [src/app/modules/authentication/authentication.controller.ts](../src/app/modules/authentication/authentication.controller.ts) → [src/app/modules/authentication/authentication.service.ts](../src/app/modules/authentication/authentication.service.ts) → [src/app/modules/authentication/authentication.repository.ts](../src/app/modules/authentication/authentication.repository.ts) → [src/app/modules/authentication/authentication.validation.ts](../src/app/modules/authentication/authentication.validation.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-refreshtoken"></a>

### Endpoint: POST /api/v1/auth/refresh-token

**Contract ID:** `RefreshToken` (entry 3 of 35). TypeScript aliases: `RefreshTokenParams`, `RefreshTokenQuery`, `RefreshTokenBody`, `RefreshTokenResponse`, `RefreshTokenErrorResponse`.

**Overview**

Issue a new token pair after verifying a refresh token and reloading the current account. Frontend feature: Session renewal.

**Authentication & authorization**

- Authentication required: Yes — refresh JWT, no access JWT.
- Allowed roles: No role restriction; Refresh token.
- Required headers: `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: `refreshToken` if no body token; otherwise none. Cookie has precedence; HttpOnly/Lax, auth path as documented above.
- Response cookie: sets `refreshToken` with configured lifetime and common refresh-cookie attributes.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field        | Type   | Required | Nullable | Validation / default                      | Description                               |
| ------------ | ------ | -------- | -------- | ----------------------------------------- | ----------------------------------------- |
| refreshToken | string | No       | No       | 10-4096 characters; cookie has precedence | Fallback token when refresh cookie absent |

Strict JSON object; unknown fields fail 400. Body defaults to `{}` when undefined; missing body token is permitted only when a usable cookie exists. No nested body objects, arrays, files or date inputs.

```json
{}
```

Body-token fallback alternative (representative nonfunctional JWT string):

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9.example-refresh.signature"
}
```

**Request example**

```http
POST /api/v1/auth/refresh-token HTTP/1.1
Host: localhost:5000
Cookie: refreshToken=<refreshToken>
Content-Type: application/json

{}
```

**Success response**

HTTP **200**. Envelope data type: `AuthTokens`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9.example-access.signature",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9.example-refresh.signature",
    "expiresIn": 604800,
    "user": {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "student@example.com",
      "role": "STUDENT",
      "name": "Nadia Rahman"
    }
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Invalid refresh token                                                   | No valid-length token, or JWT verification/expiry failure                             |
| 401         | Malformed refresh token                                                 | Decoded userId is not a UUID string                                                   |
| 401         | User not found                                                          | User deleted, missing or inactive                                                     |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Invalid refresh token",
  "errorMessage": [
    {
      "path": "",
      "message": "Invalid refresh token"
    }
  ]
}
```

HTTP 401:

```json
{
  "success": false,
  "message": "Malformed refresh token",
  "errorMessage": [
    {
      "path": "",
      "message": "Malformed refresh token"
    }
  ]
}
```

HTTP 401:

```json
{
  "success": false,
  "message": "User not found",
  "errorMessage": [
    {
      "path": "",
      "message": "User not found"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid body):

```json
{
  "success": false,
  "message": "Validation Error:-> body : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "body",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Cookie refreshToken wins over body.refreshToken using nullish precedence. An invalid present cookie prevents fallback to a valid body token. Body is validated first even when using cookies. Both tokens and cookie are renewed; old tokens remain valid. No bearer required.

Replace stored tokens/user, retry failed request at most once; clear session on refresh failure.

**Source trace**

Handler: `AuthenticationController.refresh`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/authentication/authentication.route.ts](../src/app/modules/authentication/authentication.route.ts) → [src/app/modules/authentication/authentication.controller.ts](../src/app/modules/authentication/authentication.controller.ts) → [src/app/modules/authentication/authentication.service.ts](../src/app/modules/authentication/authentication.service.ts) → [src/app/modules/authentication/authentication.repository.ts](../src/app/modules/authentication/authentication.repository.ts) → [src/app/modules/authentication/authentication.validation.ts](../src/app/modules/authentication/authentication.validation.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-logout"></a>

### Endpoint: POST /api/v1/auth/logout

**Contract ID:** `Logout` (entry 4 of 35). TypeScript aliases: `LogoutParams`, `LogoutQuery`, `LogoutBody`, `LogoutResponse`, `LogoutErrorResponse`.

**Overview**

Clear the refresh cookie for the authenticated client. Frontend feature: Sign out.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR, STUDENT (own identity).
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.
- Response cookie: clears `refreshToken` with matching path and options.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
POST /api/v1/auth/logout HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `null`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out.",
  "data": null
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                 |
| ----------- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token |
| 401         | Invalid authorization header                                            | Malformed bearer header                                   |
| 401         | Token expired                                                           | Expired access JWT                                        |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID            |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                        |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                         |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                          |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared  |
| 400         | Invalid reference                                                       | Prisma P2003                                              |
| 500         | Something went wrong                                                    | Other known Prisma request error                          |
| 429         | Too many requests, please try again later.                              | Global limiter                                            |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message          |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Requires valid access token. No body/query schema; body ignored. No token revocation. Cookie options match login and expiry is cleared.

Clear local tokens/user and all user-specific caches; clear local state even if access expiry prevents logout.

**Source trace**

Handler: `AuthenticationController.logout`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/authentication/authentication.route.ts](../src/app/modules/authentication/authentication.route.ts) → [src/app/modules/authentication/authentication.controller.ts](../src/app/modules/authentication/authentication.controller.ts) → [src/app/modules/authentication/authentication.service.ts](../src/app/modules/authentication/authentication.service.ts) → [src/app/modules/authentication/authentication.repository.ts](../src/app/modules/authentication/authentication.repository.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-session"></a>

### Endpoint: GET /api/v1/auth/session

**Contract ID:** `Session` (entry 5 of 35). TypeScript aliases: `SessionParams`, `SessionQuery`, `SessionBody`, `SessionResponse`, `SessionErrorResponse`.

**Overview**

Return the current active account identity. Frontend feature: Session bootstrap.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR, STUDENT (own identity).
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/auth/session HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `SessionUser`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "student@example.com",
    "role": "STUDENT",
    "isActive": true
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                 |
| ----------- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token |
| 401         | Invalid authorization header                                            | Malformed bearer header                                   |
| 401         | Token expired                                                           | Expired access JWT                                        |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID            |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                        |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                         |
| 401         | User not found                                                          | Fresh query finds no active non-deleted account           |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                          |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared  |
| 400         | Invalid reference                                                       | Prisma P2003                                              |
| 500         | Something went wrong                                                    | Other known Prisma request error                          |
| 429         | Too many requests, please try again later.                              | Global limiter                                            |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message          |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 401:

```json
{
  "success": false,
  "message": "User not found",
  "errorMessage": [
    {
      "path": "",
      "message": "User not found"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Unlike middleware cache lookup, this service checks active/deleted flags directly. Contains no names or profiles.

Use id, email, role, isActive for session state and role gates.

**Source trace**

Handler: `AuthenticationController.session`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/authentication/authentication.route.ts](../src/app/modules/authentication/authentication.route.ts) → [src/app/modules/authentication/authentication.controller.ts](../src/app/modules/authentication/authentication.controller.ts) → [src/app/modules/authentication/authentication.service.ts](../src/app/modules/authentication/authentication.service.ts) → [src/app/modules/authentication/authentication.repository.ts](../src/app/modules/authentication/authentication.repository.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-getauthprofile"></a>

### Endpoint: GET /api/v1/auth/profile

**Contract ID:** `GetAuthProfile` (entry 6 of 35). TypeScript aliases: `GetAuthProfileParams`, `GetAuthProfileQuery`, `GetAuthProfileBody`, `GetAuthProfileResponse`, `GetAuthProfileErrorResponse`.

**Overview**

Read the authenticated account with its non-deleted role profiles. Frontend feature: Compatibility profile read.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR, STUDENT (own identity).
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/auth/profile HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `UserProfile`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "student@example.com",
    "role": "STUDENT",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z",
    "admin": null,
    "mentor": null,
    "student": {
      "id": "22222222-2222-4222-8222-222222222222",
      "firstName": "Nadia",
      "lastName": "Rahman",
      "phone": null,
      "bio": null,
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:00:00.000Z",
      "gender": null
    }
  }
}
```

ADMIN profile variant (same selected relation keys):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "99999999-9999-4999-8999-999999999999",
    "email": "admin@example.com",
    "role": "ADMIN",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z",
    "admin": {
      "id": "55555555-5555-4555-8555-555555555555",
      "firstName": "Project",
      "lastName": "Administrator",
      "phone": null,
      "bio": null,
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:00:00.000Z"
    },
    "mentor": null,
    "student": null
  }
}
```

MENTOR profile variant (same selected relation keys):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "77777777-7777-4777-8777-777777777777",
    "email": "mentor@example.com",
    "role": "MENTOR",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z",
    "admin": null,
    "mentor": {
      "id": "66666666-6666-4666-8666-666666666666",
      "firstName": "Amina",
      "lastName": "Hasan",
      "phone": null,
      "bio": null,
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:00:00.000Z",
      "gender": "unspecified"
    },
    "student": null
  }
}
```

Each admin/mentor/student relation independently becomes null when absent/deleted. The backend does not enforce exactly one non-null relation in these selections. No role-specific userId, deletion fields or createdByAdminId are returned inside profile relations.

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                 |
| ----------- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token |
| 401         | Invalid authorization header                                            | Malformed bearer header                                   |
| 401         | Token expired                                                           | Expired access JWT                                        |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID            |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                        |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                         |
| 404         | User not found                                                          | Account absent or deleted                                 |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                          |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared  |
| 400         | Invalid reference                                                       | Prisma P2003                                              |
| 500         | Something went wrong                                                    | Other known Prisma request error                          |
| 429         | Too many requests, please try again later.                              | Global limiter                                            |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message          |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "User not found",
  "errorMessage": [
    {
      "path": "",
      "message": "User not found"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Compatibility profile URL. Fresh query checks isDeleted but not isActive; middleware may have cached active state. Prefer GetOwnProfile for the main account screen.

Populate profile view; all three relations may be null.

**Source trace**

Handler: `AuthenticationController.profile`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/authentication/authentication.route.ts](../src/app/modules/authentication/authentication.route.ts) → [src/app/modules/authentication/authentication.controller.ts](../src/app/modules/authentication/authentication.controller.ts) → [src/app/modules/authentication/authentication.service.ts](../src/app/modules/authentication/authentication.service.ts) → [src/app/modules/authentication/authentication.repository.ts](../src/app/modules/authentication/authentication.repository.ts) → [src/app/modules/user/user.select.ts](../src/app/modules/user/user.select.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-changepasswordlegacy"></a>

### Endpoint: POST /api/v1/auth/change-password

**Contract ID:** `ChangePasswordLegacy` (entry 7 of 35). TypeScript aliases: `ChangePasswordLegacyParams`, `ChangePasswordLegacyQuery`, `ChangePasswordLegacyBody`, `ChangePasswordLegacyResponse`, `ChangePasswordLegacyErrorResponse`.

**Overview**

Change the authenticated user password after checking current password. Frontend feature: Compatibility password change.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR, STUDENT (own identity).
- Required headers: `Authorization: Bearer <accessToken>`; `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field           | Type   | Required | Nullable | Validation / default                                                             | Description          |
| --------------- | ------ | -------- | -------- | -------------------------------------------------------------------------------- | -------------------- |
| currentPassword | string | Yes      | No       | 1-1024 characters; no trim                                                       | Current password     |
| newPassword     | string | Yes      | No       | 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim | Replacement password |

Strict JSON object; unknown fields fail 400. No nested body objects, arrays, files or date inputs.

```json
{
  "currentPassword": "Student2026!",
  "newPassword": "NewStudent2026!"
}
```

**Request example**

```http
POST /api/v1/auth/change-password HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "Student2026!",
  "newPassword": "NewStudent2026!"
}
```

**Success response**

HTTP **200**. Envelope data type: `PasswordChangeResult`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "message": "Password changed."
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 404         | User not found                                                          | Account absent, deleted or inactive                                                   |
| 400         | Current password is incorrect                                           | Current password mismatch                                                             |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "User not found",
  "errorMessage": [
    {
      "path": "",
      "message": "User not found"
    }
  ]
}
```

HTTP 400:

```json
{
  "success": false,
  "message": "Current password is incorrect",
  "errorMessage": [
    {
      "path": "",
      "message": "Current password is incorrect"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid body):

```json
{
  "success": false,
  "message": "Validation Error:-> body : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "body",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Compatibility password route; shares users/change-password implementation. Issued JWTs remain valid; password changes do not clear cookies or auth cache.

Clear password form on success; backend does not log the user out.

**Source trace**

Handler: `AuthenticationController.changePassword`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/authentication/authentication.route.ts](../src/app/modules/authentication/authentication.route.ts) → [src/app/modules/authentication/authentication.controller.ts](../src/app/modules/authentication/authentication.controller.ts) → [src/app/modules/authentication/authentication.service.ts](../src/app/modules/authentication/authentication.service.ts) → [src/app/modules/authentication/authentication.repository.ts](../src/app/modules/authentication/authentication.repository.ts) → [src/app/modules/authentication/authentication.validation.ts](../src/app/modules/authentication/authentication.validation.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

## Users endpoints

<a id="endpoint-getownprofile"></a>

### Endpoint: GET /api/v1/users/profile

**Contract ID:** `GetOwnProfile` (entry 8 of 35). TypeScript aliases: `GetOwnProfileParams`, `GetOwnProfileQuery`, `GetOwnProfileBody`, `GetOwnProfileResponse`, `GetOwnProfileErrorResponse`.

**Overview**

Read the authenticated active account and its non-deleted role profiles. Frontend feature: My profile.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR, STUDENT (own identity).
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/users/profile HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `UserProfile`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "student@example.com",
    "role": "STUDENT",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z",
    "admin": null,
    "mentor": null,
    "student": {
      "id": "22222222-2222-4222-8222-222222222222",
      "firstName": "Nadia",
      "lastName": "Rahman",
      "phone": null,
      "bio": null,
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:00:00.000Z",
      "gender": null
    }
  }
}
```

ADMIN profile variant (same selected relation keys):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "99999999-9999-4999-8999-999999999999",
    "email": "admin@example.com",
    "role": "ADMIN",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z",
    "admin": {
      "id": "55555555-5555-4555-8555-555555555555",
      "firstName": "Project",
      "lastName": "Administrator",
      "phone": null,
      "bio": null,
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:00:00.000Z"
    },
    "mentor": null,
    "student": null
  }
}
```

MENTOR profile variant (same selected relation keys):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "77777777-7777-4777-8777-777777777777",
    "email": "mentor@example.com",
    "role": "MENTOR",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z",
    "admin": null,
    "mentor": {
      "id": "66666666-6666-4666-8666-666666666666",
      "firstName": "Amina",
      "lastName": "Hasan",
      "phone": null,
      "bio": null,
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:00:00.000Z",
      "gender": "unspecified"
    },
    "student": null
  }
}
```

Each admin/mentor/student relation independently becomes null when absent/deleted. The backend does not enforce exactly one non-null relation in these selections. No role-specific userId, deletion fields or createdByAdminId are returned inside profile relations.

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                     |
| ----------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                     |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                       |
| 401         | Token expired                                                           | Expired access JWT                                                            |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                            |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                             |
| 404         | User not found                                                          | Account missing, deleted, inactive or role no longer matches request identity |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                              |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                      |
| 400         | Invalid reference                                                       | Prisma P2003                                                                  |
| 500         | Something went wrong                                                    | Other known Prisma request error                                              |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                              |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "User not found",
  "errorMessage": [
    {
      "path": "",
      "message": "User not found"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Use profile matching role for editable fields. admin, mentor, student are selected independently; multiple or missing profiles can follow role changes.

Populate form from matching role relation; handle null profiles.

**Source trace**

Handler: `UserController.profile`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/user/user.route.ts](../src/app/modules/user/user.route.ts) → [src/app/modules/user/user.controller.ts](../src/app/modules/user/user.controller.ts) → [src/app/modules/user/user.service.ts](../src/app/modules/user/user.service.ts) → [src/app/modules/user/user.repository.ts](../src/app/modules/user/user.repository.ts) → [src/app/modules/user/user.select.ts](../src/app/modules/user/user.select.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-updateownprofile"></a>

### Endpoint: PATCH /api/v1/users/profile

**Contract ID:** `UpdateOwnProfile` (entry 9 of 35). TypeScript aliases: `UpdateOwnProfileParams`, `UpdateOwnProfileQuery`, `UpdateOwnProfileBody`, `UpdateOwnProfileResponse`, `UpdateOwnProfileErrorResponse`.

**Overview**

Update only firstName, lastName, phone and bio in the authenticated role profile. Frontend feature: Edit my profile.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR, STUDENT (own identity).
- Required headers: `Authorization: Bearer <accessToken>`; `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field     | Type   | Required | Nullable | Validation / default                              | Description                       |
| --------- | ------ | -------- | -------- | ------------------------------------------------- | --------------------------------- |
| firstName | string | No       | No       | Trim; 1-100 characters                            | Given name                        |
| lastName  | string | No       | No       | Trim; 1-100 characters                            | Family name                       |
| phone     | string | No       | Yes      | Trim; 1-20 characters                             | Profile telephone; null clears it |
| bio       | string | No       | Yes      | Trim; max 10000 characters; empty string accepted | Profile biography; null clears it |

Strict JSON object; unknown fields fail 400. At least one listed field is required; `{}` fails `At least one field is required`. No nested body objects, arrays, files or date inputs.

```json
{
  "bio": "Frontend developer."
}
```

**Request example**

```http
PATCH /api/v1/users/profile HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "bio": "Frontend developer."
}
```

**Success response**

HTTP **200**. Envelope data type: `UserProfile`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "student@example.com",
    "role": "STUDENT",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:30:00.000Z",
    "admin": null,
    "mentor": null,
    "student": {
      "id": "22222222-2222-4222-8222-222222222222",
      "firstName": "Nadia",
      "lastName": "Rahman",
      "phone": null,
      "bio": "Frontend developer.",
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:30:00.000Z",
      "gender": null
    }
  }
}
```

ADMIN profile variant (same selected relation keys):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "99999999-9999-4999-8999-999999999999",
    "email": "admin@example.com",
    "role": "ADMIN",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:30:00.000Z",
    "admin": {
      "id": "55555555-5555-4555-8555-555555555555",
      "firstName": "Project",
      "lastName": "Administrator",
      "phone": null,
      "bio": "Frontend developer.",
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:30:00.000Z"
    },
    "mentor": null,
    "student": null
  }
}
```

MENTOR profile variant (same selected relation keys):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "77777777-7777-4777-8777-777777777777",
    "email": "mentor@example.com",
    "role": "MENTOR",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:30:00.000Z",
    "admin": null,
    "mentor": {
      "id": "66666666-6666-4666-8666-666666666666",
      "firstName": "Amina",
      "lastName": "Hasan",
      "phone": null,
      "bio": "Frontend developer.",
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:30:00.000Z",
      "gender": "unspecified"
    },
    "student": null
  }
}
```

Each admin/mentor/student relation independently becomes null when absent/deleted. The backend does not enforce exactly one non-null relation in these selections. No role-specific userId, deletion fields or createdByAdminId are returned inside profile relations.

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid body):

```json
{
  "success": false,
  "message": "Validation Error:-> body : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "body",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

At least one field required. No gender/email/password/role changes here. Nested update needs existing non-deleted matching profile and active non-deleted User with matching role; missing record produces Prisma 404 Record not found. Names cannot be null.

Replace profile cache; update displayed name from profile locally or after next token response.

**Source trace**

Handler: `UserController.updateProfile`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/user/user.route.ts](../src/app/modules/user/user.route.ts) → [src/app/modules/user/user.controller.ts](../src/app/modules/user/user.controller.ts) → [src/app/modules/user/user.service.ts](../src/app/modules/user/user.service.ts) → [src/app/modules/user/user.repository.ts](../src/app/modules/user/user.repository.ts) → [src/app/modules/user/user.validation.ts](../src/app/modules/user/user.validation.ts) → [src/app/modules/user/user.select.ts](../src/app/modules/user/user.select.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-changepassword"></a>

### Endpoint: PATCH /api/v1/users/change-password

**Contract ID:** `ChangePassword` (entry 10 of 35). TypeScript aliases: `ChangePasswordParams`, `ChangePasswordQuery`, `ChangePasswordBody`, `ChangePasswordResponse`, `ChangePasswordErrorResponse`.

**Overview**

Change the authenticated user password after checking current password. Frontend feature: Change my password.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR, STUDENT (own identity).
- Required headers: `Authorization: Bearer <accessToken>`; `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field           | Type   | Required | Nullable | Validation / default                                                             | Description          |
| --------------- | ------ | -------- | -------- | -------------------------------------------------------------------------------- | -------------------- |
| currentPassword | string | Yes      | No       | 1-1024 characters; no trim                                                       | Current password     |
| newPassword     | string | Yes      | No       | 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim | Replacement password |

Strict JSON object; unknown fields fail 400. No nested body objects, arrays, files or date inputs.

```json
{
  "currentPassword": "Student2026!",
  "newPassword": "NewStudent2026!"
}
```

**Request example**

```http
PATCH /api/v1/users/change-password HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "Student2026!",
  "newPassword": "NewStudent2026!"
}
```

**Success response**

HTTP **200**. Envelope data type: `PasswordChangeResult`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "message": "Password changed."
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 404         | User not found                                                          | Account absent, deleted or inactive                                                   |
| 400         | Current password is incorrect                                           | Current password mismatch                                                             |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "User not found",
  "errorMessage": [
    {
      "path": "",
      "message": "User not found"
    }
  ]
}
```

HTTP 400:

```json
{
  "success": false,
  "message": "Current password is incorrect",
  "errorMessage": [
    {
      "path": "",
      "message": "Current password is incorrect"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid body):

```json
{
  "success": false,
  "message": "Validation Error:-> body : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "body",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

No reset/forgot-password API. Does not revoke issued tokens or clear cookies. Passwords are not trimmed.

Clear sensitive form fields after success.

**Source trace**

Handler: `AuthenticationController.changePassword`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/user/user.route.ts](../src/app/modules/user/user.route.ts) → [src/app/modules/authentication/authentication.controller.ts](../src/app/modules/authentication/authentication.controller.ts) → [src/app/modules/authentication/authentication.service.ts](../src/app/modules/authentication/authentication.service.ts) → [src/app/modules/authentication/authentication.repository.ts](../src/app/modules/authentication/authentication.repository.ts) → [src/app/modules/authentication/authentication.validation.ts](../src/app/modules/authentication/authentication.validation.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-updateuserstatus"></a>

### Endpoint: PATCH /api/v1/users/:id/status

**Contract ID:** `UpdateUserStatus` (entry 11 of 35). TypeScript aliases: `UpdateUserStatusParams`, `UpdateUserStatusQuery`, `UpdateUserStatusBody`, `UpdateUserStatusResponse`, `UpdateUserStatusErrorResponse`.

**Overview**

Set target User.isActive and atomically write USER_STATUS_CHANGED audit entry. Frontend feature: Enable/disable account.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR.
- Required headers: `Authorization: Bearer <accessToken>`; `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description | Validation                      |
| ---- | ----------- | -------- | ----------- | ------------------------------- |
| id   | UUID string | Yes      | User ID     | z.string().uuid("Invalid UUID") |

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field    | Type    | Required | Nullable | Validation / default             | Description                      |
| -------- | ------- | -------- | -------- | -------------------------------- | -------------------------------- |
| isActive | boolean | Yes      | No       | JSON boolean; no string coercion | Enable or disable target account |

Strict JSON object; unknown fields fail 400. No nested body objects, arrays, files or date inputs.

```json
{
  "isActive": false
}
```

**Request example**

```http
PATCH /api/v1/users/11111111-1111-4111-8111-111111111111/status HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "isActive": false
}
```

**Success response**

HTTP **200**. Envelope data type: `UserRecord`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "student@example.com",
    "role": "STUDENT",
    "isActive": false,
    "lastLoginAt": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:30:00.000Z"
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 404         | User not found                                                          | Target user missing or deleted                                                        |
| 403         | You cannot manage this account                                          | Mentor targets an ADMIN or MENTOR account                                             |
| 409         | You cannot deactivate your own account                                  | Self-deactivation requested                                                           |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "User not found",
  "errorMessage": [
    {
      "path": "",
      "message": "User not found"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "You cannot manage this account",
  "errorMessage": [
    {
      "path": "",
      "message": "You cannot manage this account"
    }
  ]
}
```

HTTP 409:

```json
{
  "success": false,
  "message": "You cannot deactivate your own account",
  "errorMessage": [
    {
      "path": "",
      "message": "You cannot deactivate your own account"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

ADMIN can target any account; MENTOR only STUDENT. Even a no-op records an audit. Target auth cache is invalidated only in this process after commit. No IP/user-agent context recorded here.

Refetch users, related student/mentor directory, target detail and visible audit logs.

**Source trace**

Handler: `UserController.updateStatus`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/user/user.route.ts](../src/app/modules/user/user.route.ts) → [src/app/modules/user/user.controller.ts](../src/app/modules/user/user.controller.ts) → [src/app/modules/user/user.service.ts](../src/app/modules/user/user.service.ts) → [src/app/modules/user/user.repository.ts](../src/app/modules/user/user.repository.ts) → [src/app/modules/user/user.validation.ts](../src/app/modules/user/user.validation.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-listusers"></a>

### Endpoint: GET /api/v1/users

**Contract ID:** `ListUsers` (entry 12 of 35). TypeScript aliases: `ListUsersParams`, `ListUsersQuery`, `ListUsersBody`, `ListUsersResponse`, `ListUsersErrorResponse`.

**Overview**

List non-deleted user accounts with database pagination. Frontend feature: Account directory.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

| Name       | Wire type                                                                                    | Required | Default   | Accepted values / validation                                                 | Description                                            |
| ---------- | -------------------------------------------------------------------------------------------- | -------- | --------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| search     | string                                                                                       | No       | Absent    | Trim; <= 100 characters                                                      | Case-insensitive literal substring                     |
| searchTerm | string                                                                                       | No       | Absent    | Trim; <= 100 characters                                                      | Case-insensitive literal substring                     |
| page       | number / `${number}`                                                                         | No       | 1         | Coerced positive integer <= 1000000                                          | 1-based page                                           |
| limit      | number / `${number}`                                                                         | No       | 10        | Coerced positive integer <= 100                                              | Rows per page                                          |
| sortBy     | 'id' / 'email' / 'role' / 'isActive' / 'isDeleted' / 'deletedAt' / 'createdAt' / 'updatedAt' | No       | createdAt | id / email / role / isActive / isDeleted / deletedAt / createdAt / updatedAt | Primary sort field; id asc breaks ties                 |
| sortOrder  | 'asc' / 'desc'                                                                               | No       | desc      | asc / desc                                                                   | Primary sort direction                                 |
| fromDate   | string                                                                                       | No       | Absent    | Valid YYYY-MM-DD                                                             | createdAt >= 00:00:00.000Z                             |
| toDate     | string                                                                                       | No       | Absent    | Valid YYYY-MM-DD; >= fromDate                                                | createdAt <= 23:59:59.999Z                             |
| role       | Role                                                                                         | No       | Absent    | ADMIN / MENTOR / STUDENT                                                     | Exact role; mentors additionally restricted to STUDENT |
| isActive   | 'true' / 'false'                                                                             | No       | Absent    | Literal true / false query strings                                           | Transformed to boolean after validation                |
| ids        | string                                                                                       | No       | Absent    | Comma-separated UUIDs; each trimmed; at least one; no specified maximum      | Exact ID inclusion filter; one comma-delimited value   |

All listed query fields are optional and can be combined; unknown query keys fail 400. See global combination, search precedence and inclusive date rules.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/users?page=1&limit=10 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `UserListItem[]`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "student@example.com",
      "role": "STUDENT",
      "isActive": true,
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:00:00.000Z"
    }
  ]
}
```

Empty matching dataset (same status; a page beyond the end can also be empty with a positive total):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0
  },
  "data": []
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid query):

```json
{
  "success": false,
  "message": "Validation Error:-> query : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "query",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

ADMIN sees all roles; MENTOR only STUDENT. role=ADMIN for mentor returns empty list. Search email only; search takes precedence over searchTerm even when empty. Inactive accounts included unless filtered.

Use data rows and meta.total; retain filters in UI state.

**Source trace**

Handler: `UserController.findMany`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/user/user.route.ts](../src/app/modules/user/user.route.ts) → [src/app/modules/user/user.controller.ts](../src/app/modules/user/user.controller.ts) → [src/app/modules/user/user.service.ts](../src/app/modules/user/user.service.ts) → [src/app/modules/user/user.repository.ts](../src/app/modules/user/user.repository.ts) → [src/app/modules/user/user.validation.ts](../src/app/modules/user/user.validation.ts) → [src/app/modules/user/builders/UserQueryBuilder.ts](../src/app/modules/user/builders/UserQueryBuilder.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-getuser"></a>

### Endpoint: GET /api/v1/users/:id

**Contract ID:** `GetUser` (entry 13 of 35). TypeScript aliases: `GetUserParams`, `GetUserQuery`, `GetUserBody`, `GetUserResponse`, `GetUserErrorResponse`.

**Overview**

Read target account scalar fields excluding password. Frontend feature: Account details.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description | Validation                      |
| ---- | ----------- | -------- | ----------- | ------------------------------- |
| id   | UUID string | Yes      | User ID     | z.string().uuid("Invalid UUID") |

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/users/11111111-1111-4111-8111-111111111111 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `UserRecord`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "student@example.com",
    "role": "STUDENT",
    "isActive": true,
    "lastLoginAt": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z"
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 404         | User not found                                                          | Target user missing or deleted                                                        |
| 403         | You cannot manage this account                                          | Mentor targets an ADMIN or MENTOR account                                             |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "User not found",
  "errorMessage": [
    {
      "path": "",
      "message": "User not found"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "You cannot manage this account",
  "errorMessage": [
    {
      "path": "",
      "message": "You cannot manage this account"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

MENTOR may read STUDENT only. No role profiles included. Use permitted directory/profile APIs for names.

Display account fields; target id is User ID, not profile ID.

**Source trace**

Handler: `UserController.getById`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/user/user.route.ts](../src/app/modules/user/user.route.ts) → [src/app/modules/user/user.controller.ts](../src/app/modules/user/user.controller.ts) → [src/app/modules/user/user.service.ts](../src/app/modules/user/user.service.ts) → [src/app/modules/user/user.repository.ts](../src/app/modules/user/user.repository.ts) → [src/app/modules/user/user.validation.ts](../src/app/modules/user/user.validation.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-updateuser"></a>

### Endpoint: PATCH /api/v1/users/:id

**Contract ID:** `UpdateUser` (entry 14 of 35). TypeScript aliases: `UpdateUserParams`, `UpdateUserQuery`, `UpdateUserBody`, `UpdateUserResponse`, `UpdateUserErrorResponse`.

**Overview**

Update target email, password, role or active status. Frontend feature: Edit account / admin role assignment.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR.
- Required headers: `Authorization: Bearer <accessToken>`; `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description | Validation                      |
| ---- | ----------- | -------- | ----------- | ------------------------------- |
| id   | UUID string | Yes      | User ID     | z.string().uuid("Invalid UUID") |

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field    | Type    | Required | Nullable | Validation / default                                                             | Description                                     |
| -------- | ------- | -------- | -------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| email    | string  | No       | No       | Trim; valid email; max 255 characters; lowercase                                 | Account email, unique even for deleted accounts |
| password | string  | No       | No       | 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim | Replace password without current password       |
| role     | Role    | No       | No       | ADMIN / MENTOR / STUDENT; administrator only                                     | Changes role without creating a profile         |
| isActive | boolean | No       | No       | JSON boolean                                                                     | Enable/disable; this route writes no audit log  |

Strict JSON object; unknown fields fail 400. All fields optional; `{}` is valid. No nested body objects, arrays, files or date inputs.

```json
{
  "email": "nadia@example.com"
}
```

**Request example**

```http
PATCH /api/v1/users/11111111-1111-4111-8111-111111111111 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "email": "nadia@example.com"
}
```

**Success response**

HTTP **200**. Envelope data type: `UserRecord`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User updated",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "nadia@example.com",
    "role": "STUDENT",
    "isActive": true,
    "lastLoginAt": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:30:00.000Z"
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 404         | User not found                                                          | Target user missing or deleted                                                        |
| 403         | You cannot manage this account                                          | Mentor targets an ADMIN or MENTOR account                                             |
| 403         | Administrator access required                                           | Mentor supplies any role value, even STUDENT                                          |
| 409         | You cannot deactivate your own account                                  | Self-deactivation requested                                                           |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "User not found",
  "errorMessage": [
    {
      "path": "",
      "message": "User not found"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "You cannot manage this account",
  "errorMessage": [
    {
      "path": "",
      "message": "You cannot manage this account"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Administrator access required",
  "errorMessage": [
    {
      "path": "",
      "message": "Administrator access required"
    }
  ]
}
```

HTTP 409:

```json
{
  "success": false,
  "message": "You cannot deactivate your own account",
  "errorMessage": [
    {
      "path": "",
      "message": "You cannot deactivate your own account"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Empty {} accepted. Mentor targets must be STUDENT. Role changes do not synchronize profiles or revoke tokens; middleware also checks old JWT role. No audit, including isActive changes. Target cache invalidated locally. Duplicate email may yield Prisma 409 Duplicate email value.

Refetch users/detail and profile-dependent directories; prefer UpdateUserStatus for auditable status actions.

**Source trace**

Handler: `UserController.update`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/user/user.route.ts](../src/app/modules/user/user.route.ts) → [src/app/modules/user/user.controller.ts](../src/app/modules/user/user.controller.ts) → [src/app/modules/user/user.service.ts](../src/app/modules/user/user.service.ts) → [src/app/modules/user/user.repository.ts](../src/app/modules/user/user.repository.ts) → [src/app/modules/user/user.validation.ts](../src/app/modules/user/user.validation.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-deleteuser"></a>

### Endpoint: DELETE /api/v1/users/:id

**Contract ID:** `DeleteUser` (entry 15 of 35). TypeScript aliases: `DeleteUserParams`, `DeleteUserQuery`, `DeleteUserBody`, `DeleteUserResponse`, `DeleteUserErrorResponse`.

**Overview**

Soft-delete User; return null data. Frontend feature: Delete account.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description | Validation                      |
| ---- | ----------- | -------- | ----------- | ------------------------------- |
| id   | UUID string | Yes      | User ID     | z.string().uuid("Invalid UUID") |

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
DELETE /api/v1/users/11111111-1111-4111-8111-111111111111 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `null`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User deleted",
  "data": null
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 404         | User not found                                                          | Target user missing or deleted                                                        |
| 403         | You cannot manage this account                                          | Mentor targets an ADMIN or MENTOR account                                             |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "User not found",
  "errorMessage": [
    {
      "path": "",
      "message": "User not found"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "You cannot manage this account",
  "errorMessage": [
    {
      "path": "",
      "message": "You cannot manage this account"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Mentor targets must be STUDENT. No self-delete guard. Only User isDeleted/deletedAt change, not profiles/submissions directly. Invalidates local cache. No HTTP restore endpoint.

Remove account from lists; refetch submissions/statistics/directories; clear own session after self-delete.

**Source trace**

Handler: `UserController.remove`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/user/user.route.ts](../src/app/modules/user/user.route.ts) → [src/app/modules/user/user.controller.ts](../src/app/modules/user/user.controller.ts) → [src/app/modules/user/user.service.ts](../src/app/modules/user/user.service.ts) → [src/app/modules/user/user.repository.ts](../src/app/modules/user/user.repository.ts) → [src/app/modules/user/user.validation.ts](../src/app/modules/user/user.validation.ts) → [prisma/models/user.prisma](../prisma/models/user.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

## Admins endpoints

<a id="endpoint-createadmin"></a>

### Endpoint: POST /api/v1/admins

**Contract ID:** `CreateAdmin` (entry 16 of 35). TypeScript aliases: `CreateAdminParams`, `CreateAdminQuery`, `CreateAdminBody`, `CreateAdminResponse`, `CreateAdminErrorResponse`.

**Overview**

Create ADMIN account and Admin profile atomically. Frontend feature: Create administrator.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN.
- Required headers: `Authorization: Bearer <accessToken>`; `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field     | Type   | Required | Nullable | Validation / default                                                             | Description                                     |
| --------- | ------ | -------- | -------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| email     | string | Yes      | No       | Trim; valid email; max 255 characters; lowercase                                 | Account email, unique even for deleted accounts |
| password  | string | Yes      | No       | 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim | New account password                            |
| firstName | string | Yes      | No       | Trim; 1-100 characters                                                           | Given name                                      |
| lastName  | string | Yes      | No       | Trim; 1-100 characters                                                           | Family name                                     |
| bio       | string | No       | Yes      | No trim or length bound in Zod; empty accepted                                   | Admin biography                                 |
| phone     | string | No       | Yes      | Trim; max 20 characters; empty accepted                                          | Admin telephone                                 |

Strict JSON object; unknown fields fail 400. No nested body objects, arrays, files or date inputs.

```json
{
  "email": "admin@example.com",
  "password": "Admin2026!",
  "firstName": "Project",
  "lastName": "Administrator"
}
```

**Request example**

```http
POST /api/v1/admins HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin2026!",
  "firstName": "Project",
  "lastName": "Administrator"
}
```

**Success response**

HTTP **201**. Envelope data type: `AdminRecord`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Admin created",
  "data": {
    "id": "55555555-5555-4555-8555-555555555555",
    "userId": "99999999-9999-4999-8999-999999999999",
    "firstName": "Project",
    "lastName": "Administrator",
    "phone": null,
    "bio": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z"
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 409         | Email already in use                                                    | Email exists, including deleted accounts                                              |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 409:

```json
{
  "success": false,
  "message": "Email already in use",
  "errorMessage": [
    {
      "path": "",
      "message": "Email already in use"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid body):

```json
{
  "success": false,
  "message": "Validation Error:-> body : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "body",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Returns profile scalars only; userId is account ID, id is Admin profile ID. No tokens/cookie. Actor Admin profile not separately required by this service.

Refetch admins/users; use returned userId for account operations.

**Source trace**

Handler: `AdminController.create`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/admin/admin.route.ts](../src/app/modules/admin/admin.route.ts) → [src/app/modules/admin/admin.controller.ts](../src/app/modules/admin/admin.controller.ts) → [src/app/modules/admin/admin.service.ts](../src/app/modules/admin/admin.service.ts) → [src/app/modules/admin/admin.repository.ts](../src/app/modules/admin/admin.repository.ts) → [src/app/modules/admin/admin.validation.ts](../src/app/modules/admin/admin.validation.ts) → [prisma/models/admin.prisma](../prisma/models/admin.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`. Account creation additionally calls `user.service.ts:createAccount` and the relevant profile repository in the same transaction.

---

<a id="endpoint-listadmins"></a>

### Endpoint: GET /api/v1/admins

**Contract ID:** `ListAdmins` (entry 17 of 35). TypeScript aliases: `ListAdminsParams`, `ListAdminsQuery`, `ListAdminsBody`, `ListAdminsResponse`, `ListAdminsErrorResponse`.

**Overview**

List non-deleted Admin profiles with pagination. Frontend feature: Administrator directory.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

| Name       | Wire type                                                             | Required | Default   | Accepted values / validation                              | Description                            |
| ---------- | --------------------------------------------------------------------- | -------- | --------- | --------------------------------------------------------- | -------------------------------------- |
| search     | string                                                                | No       | Absent    | Trim; <= 100 characters                                   | Case-insensitive literal substring     |
| searchTerm | string                                                                | No       | Absent    | Trim; <= 100 characters                                   | Case-insensitive literal substring     |
| page       | number / `${number}`                                                  | No       | 1         | Coerced positive integer <= 1000000                       | 1-based page                           |
| limit      | number / `${number}`                                                  | No       | 10        | Coerced positive integer <= 100                           | Rows per page                          |
| sortBy     | 'id' / 'firstName' / 'lastName' / 'phone' / 'createdAt' / 'updatedAt' | No       | createdAt | id / firstName / lastName / phone / createdAt / updatedAt | Primary sort field; id asc breaks ties |
| sortOrder  | 'asc' / 'desc'                                                        | No       | desc      | asc / desc                                                | Primary sort direction                 |
| fromDate   | string                                                                | No       | Absent    | Valid YYYY-MM-DD                                          | createdAt >= 00:00:00.000Z             |
| toDate     | string                                                                | No       | Absent    | Valid YYYY-MM-DD; >= fromDate                             | createdAt <= 23:59:59.999Z             |
| userId     | UUID                                                                  | No       | Absent    | UUID                                                      | Exact associated User ID               |

All listed query fields are optional and can be combined; unknown query keys fail 400. See global combination, search precedence and inclusive date rules.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/admins?page=1&limit=10 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `AdminRecord[]`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "data": [
    {
      "id": "55555555-5555-4555-8555-555555555555",
      "userId": "99999999-9999-4999-8999-999999999999",
      "firstName": "Project",
      "lastName": "Administrator",
      "phone": null,
      "bio": null,
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:00:00.000Z"
    }
  ]
}
```

Empty matching dataset (same status; a page beyond the end can also be empty with a positive total):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0
  },
  "data": []
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid query):

```json
{
  "success": false,
  "message": "Validation Error:-> query : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "query",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Search firstName, lastName, phone only; search precedes searchTerm. No email search or user object. Does not exclude inactive/deleted/role-changed parent Users.

Use id for admin profile operations, userId for user management.

**Source trace**

Handler: `AdminController.list`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/admin/admin.route.ts](../src/app/modules/admin/admin.route.ts) → [src/app/modules/admin/admin.controller.ts](../src/app/modules/admin/admin.controller.ts) → [src/app/modules/admin/admin.service.ts](../src/app/modules/admin/admin.service.ts) → [src/app/modules/admin/admin.repository.ts](../src/app/modules/admin/admin.repository.ts) → [src/app/modules/admin/admin.validation.ts](../src/app/modules/admin/admin.validation.ts) → [src/app/modules/admin/builders/AdminQueryBuilder.ts](../src/app/modules/admin/builders/AdminQueryBuilder.ts) → [prisma/models/admin.prisma](../prisma/models/admin.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-getadmin"></a>

### Endpoint: GET /api/v1/admins/:id

**Contract ID:** `GetAdmin` (entry 18 of 35). TypeScript aliases: `GetAdminParams`, `GetAdminQuery`, `GetAdminBody`, `GetAdminResponse`, `GetAdminErrorResponse`.

**Overview**

Read non-deleted Admin profile with limited User relation. Frontend feature: Administrator profile detail.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description      | Validation                      |
| ---- | ----------- | -------- | ---------------- | ------------------------------- |
| id   | UUID string | Yes      | Admin profile ID | z.string().uuid("Invalid UUID") |

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/admins/55555555-5555-4555-8555-555555555555 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `AdminDetail`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "55555555-5555-4555-8555-555555555555",
    "userId": "99999999-9999-4999-8999-999999999999",
    "firstName": "Project",
    "lastName": "Administrator",
    "phone": null,
    "bio": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z",
    "user": {
      "id": "99999999-9999-4999-8999-999999999999",
      "email": "admin@example.com",
      "role": "ADMIN",
      "isActive": true,
      "isDeleted": false
    }
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 404         | Admin not found                                                         | Profile missing or deleted                                                            |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "Admin not found",
  "errorMessage": [
    {
      "path": "",
      "message": "Admin not found"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Includes user.isDeleted/isActive. Parent User need not be active, non-deleted or still ADMIN.

Use user.id for account management and id for profile changes.

**Source trace**

Handler: `AdminController.getById`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/admin/admin.route.ts](../src/app/modules/admin/admin.route.ts) → [src/app/modules/admin/admin.controller.ts](../src/app/modules/admin/admin.controller.ts) → [src/app/modules/admin/admin.service.ts](../src/app/modules/admin/admin.service.ts) → [src/app/modules/admin/admin.repository.ts](../src/app/modules/admin/admin.repository.ts) → [src/app/modules/admin/admin.validation.ts](../src/app/modules/admin/admin.validation.ts) → [prisma/models/admin.prisma](../prisma/models/admin.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-updateadmin"></a>

### Endpoint: PATCH /api/v1/admins/:id

**Contract ID:** `UpdateAdmin` (entry 19 of 35). TypeScript aliases: `UpdateAdminParams`, `UpdateAdminQuery`, `UpdateAdminBody`, `UpdateAdminResponse`, `UpdateAdminErrorResponse`.

**Overview**

Update Admin profile names, phone and bio. Frontend feature: Edit administrator profile.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN.
- Required headers: `Authorization: Bearer <accessToken>`; `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description      | Validation                      |
| ---- | ----------- | -------- | ---------------- | ------------------------------- |
| id   | UUID string | Yes      | Admin profile ID | z.string().uuid("Invalid UUID") |

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field     | Type   | Required | Nullable | Validation / default                           | Description     |
| --------- | ------ | -------- | -------- | ---------------------------------------------- | --------------- |
| firstName | string | No       | No       | Trim; 1-100 characters                         | Given name      |
| lastName  | string | No       | No       | Trim; 1-100 characters                         | Family name     |
| bio       | string | No       | Yes      | No trim or length bound in Zod; empty accepted | Admin biography |
| phone     | string | No       | Yes      | Trim; max 20 characters; empty accepted        | Admin telephone |

Strict JSON object; unknown fields fail 400. At least one listed field is required; `{}` fails `At least one field is required`. No nested body objects, arrays, files or date inputs.

```json
{
  "bio": "Project coordinator."
}
```

**Request example**

```http
PATCH /api/v1/admins/55555555-5555-4555-8555-555555555555 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "bio": "Project coordinator."
}
```

**Success response**

HTTP **200**. Envelope data type: `AdminRecord`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Admin updated",
  "data": {
    "id": "55555555-5555-4555-8555-555555555555",
    "userId": "99999999-9999-4999-8999-999999999999",
    "firstName": "Project",
    "lastName": "Administrator",
    "phone": null,
    "bio": "Project coordinator.",
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:30:00.000Z"
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 404         | Admin not found                                                         | Profile missing or deleted                                                            |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "Admin not found",
  "errorMessage": [
    {
      "path": "",
      "message": "Admin not found"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

At least one field required. No account changes here. Admin bio has no maximum in this validator, unlike self-profile bio. Parent user status/deletion does not block operation.

Refetch admins/detail and own profile if editing self.

**Source trace**

Handler: `AdminController.update`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/admin/admin.route.ts](../src/app/modules/admin/admin.route.ts) → [src/app/modules/admin/admin.controller.ts](../src/app/modules/admin/admin.controller.ts) → [src/app/modules/admin/admin.service.ts](../src/app/modules/admin/admin.service.ts) → [src/app/modules/admin/admin.repository.ts](../src/app/modules/admin/admin.repository.ts) → [src/app/modules/admin/admin.validation.ts](../src/app/modules/admin/admin.validation.ts) → [prisma/models/admin.prisma](../prisma/models/admin.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-deleteadmin"></a>

### Endpoint: DELETE /api/v1/admins/:id

**Contract ID:** `DeleteAdmin` (entry 20 of 35). TypeScript aliases: `DeleteAdminParams`, `DeleteAdminQuery`, `DeleteAdminBody`, `DeleteAdminResponse`, `DeleteAdminErrorResponse`.

**Overview**

Soft-delete only Admin profile; return all profile scalars. Frontend feature: Delete administrator profile.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description      | Validation                      |
| ---- | ----------- | -------- | ---------------- | ------------------------------- |
| id   | UUID string | Yes      | Admin profile ID | z.string().uuid("Invalid UUID") |

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
DELETE /api/v1/admins/55555555-5555-4555-8555-555555555555 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `AdminRecord`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Admin deleted",
  "data": {
    "id": "55555555-5555-4555-8555-555555555555",
    "userId": "99999999-9999-4999-8999-999999999999",
    "firstName": "Project",
    "lastName": "Administrator",
    "phone": null,
    "bio": null,
    "isDeleted": true,
    "deletedAt": "2026-10-26T06:30:00.000Z",
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:30:00.000Z"
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 404         | Admin not found                                                         | Profile missing or deleted                                                            |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "Admin not found",
  "errorMessage": [
    {
      "path": "",
      "message": "Admin not found"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Does not delete/deactivate User; login and ADMIN middleware can continue. No self-delete guard. Deleted Admin profile blocks creating mentors but not other admin-role operations.

Remove profile from admins; refetch own profile if relevant; User may remain in account directory.

**Source trace**

Handler: `AdminController.remove`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/admin/admin.route.ts](../src/app/modules/admin/admin.route.ts) → [src/app/modules/admin/admin.controller.ts](../src/app/modules/admin/admin.controller.ts) → [src/app/modules/admin/admin.service.ts](../src/app/modules/admin/admin.service.ts) → [src/app/modules/admin/admin.repository.ts](../src/app/modules/admin/admin.repository.ts) → [src/app/modules/admin/admin.validation.ts](../src/app/modules/admin/admin.validation.ts) → [prisma/models/admin.prisma](../prisma/models/admin.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

## Mentors endpoints

<a id="endpoint-listmentors"></a>

### Endpoint: GET /api/v1/mentors

**Contract ID:** `ListMentors` (entry 21 of 35). TypeScript aliases: `ListMentorsParams`, `ListMentorsQuery`, `ListMentorsBody`, `ListMentorsResponse`, `ListMentorsErrorResponse`.

**Overview**

List non-deleted Mentor profiles whose Users are non-deleted and still MENTOR. Frontend feature: Mentor directory.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

| Name       | Wire type                                     | Required | Default   | Accepted values / validation          | Description                            |
| ---------- | --------------------------------------------- | -------- | --------- | ------------------------------------- | -------------------------------------- |
| searchTerm | string                                        | No       | Absent    | Trim; <= 100 characters               | Case-insensitive literal substring     |
| search     | string                                        | No       | Absent    | Trim; <= 100 characters               | Case-insensitive literal substring     |
| page       | number / `${number}`                          | No       | 1         | Coerced positive integer <= 1000000   | 1-based page                           |
| limit      | number / `${number}`                          | No       | 10        | Coerced positive integer <= 100       | Rows per page                          |
| sortBy     | 'id' / 'createdAt' / 'firstName' / 'lastName' | No       | createdAt | id / createdAt / firstName / lastName | Primary sort field; id asc breaks ties |
| sortOrder  | 'asc' / 'desc'                                | No       | desc      | asc / desc                            | Primary sort direction                 |

All listed query fields are optional and can be combined; unknown query keys fail 400. See global combination, search precedence and inclusive date rules.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/mentors?page=1&limit=10 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `MentorRecord[]`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "data": [
    {
      "id": "66666666-6666-4666-8666-666666666666",
      "userId": "77777777-7777-4777-8777-777777777777",
      "firstName": "Amina",
      "lastName": "Hasan",
      "phone": null,
      "bio": null,
      "gender": "unspecified",
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:00:00.000Z",
      "user": {
        "id": "77777777-7777-4777-8777-777777777777",
        "email": "mentor@example.com",
        "role": "MENTOR",
        "isActive": true
      },
      "createdByAdminId": "55555555-5555-4555-8555-555555555555"
    }
  ]
}
```

Empty matching dataset (same status; a page beyond the end can also be empty with a positive total):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0
  },
  "data": []
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid query):

```json
{
  "success": false,
  "message": "Validation Error:-> query : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "query",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Search names, phone, user email; searchTerm precedes search even when empty. Inactive accounts included; no isActive filter.

Use userId for account edits; no mentor detail/update/delete endpoints.

**Source trace**

Handler: `MentorController.list`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/mentor/mentor.route.ts](../src/app/modules/mentor/mentor.route.ts) → [src/app/modules/mentor/mentor.controller.ts](../src/app/modules/mentor/mentor.controller.ts) → [src/app/modules/mentor/mentor.service.ts](../src/app/modules/mentor/mentor.service.ts) → [src/app/modules/mentor/mentor.repository.ts](../src/app/modules/mentor/mentor.repository.ts) → [src/app/modules/mentor/mentor.validation.ts](../src/app/modules/mentor/mentor.validation.ts) → [src/app/modules/mentor/builders/MentorQueryBuilder.ts](../src/app/modules/mentor/builders/MentorQueryBuilder.ts) → [src/app/modules/mentor/mentor.constant.ts](../src/app/modules/mentor/mentor.constant.ts) → [prisma/models/mentor.prisma](../prisma/models/mentor.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-creatementor"></a>

### Endpoint: POST /api/v1/mentors

**Contract ID:** `CreateMentor` (entry 22 of 35). TypeScript aliases: `CreateMentorParams`, `CreateMentorQuery`, `CreateMentorBody`, `CreateMentorResponse`, `CreateMentorErrorResponse`.

**Overview**

Atomically create MENTOR User/profile with creator Admin profile ID. Frontend feature: Create mentor.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN.
- Required headers: `Authorization: Bearer <accessToken>`; `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field     | Type   | Required | Nullable | Validation / default                                                             | Description                                     |
| --------- | ------ | -------- | -------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| email     | string | Yes      | No       | Trim; valid email; max 255 characters; lowercase                                 | Account email, unique even for deleted accounts |
| password  | string | Yes      | No       | 8-72 characters; lowercase, uppercase and digit; at most 72 UTF-8 bytes; no trim | New account password                            |
| firstName | string | Yes      | No       | Trim; 1-100 characters                                                           | Given name                                      |
| lastName  | string | Yes      | No       | Trim; 1-100 characters                                                           | Family name                                     |
| phone     | string | No       | Yes      | Trim; 1-20 characters                                                            | Profile telephone; null clears it               |
| bio       | string | No       | Yes      | Trim; max 10000 characters; empty string accepted                                | Profile biography; null clears it               |
| gender    | string | Yes      | No       | Trim; 1-255 characters; no enum                                                  | Required free-text gender                       |

Strict JSON object; unknown fields fail 400. No nested body objects, arrays, files or date inputs.

```json
{
  "email": "mentor@example.com",
  "password": "Mentor2026!",
  "firstName": "Amina",
  "lastName": "Hasan",
  "gender": "unspecified"
}
```

**Request example**

```http
POST /api/v1/mentors HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "email": "mentor@example.com",
  "password": "Mentor2026!",
  "firstName": "Amina",
  "lastName": "Hasan",
  "gender": "unspecified"
}
```

**Success response**

HTTP **201**. Envelope data type: `MentorRecord`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Mentor created",
  "data": {
    "id": "66666666-6666-4666-8666-666666666666",
    "userId": "77777777-7777-4777-8777-777777777777",
    "firstName": "Amina",
    "lastName": "Hasan",
    "phone": null,
    "bio": null,
    "gender": "unspecified",
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z",
    "user": {
      "id": "77777777-7777-4777-8777-777777777777",
      "email": "mentor@example.com",
      "role": "MENTOR",
      "isActive": true
    },
    "createdByAdminId": "55555555-5555-4555-8555-555555555555"
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 403         | Active administrator profile required                                   | Actor lacks non-deleted Admin profile with active non-deleted ADMIN User              |
| 409         | Email already in use                                                    | Email exists, including deleted accounts                                              |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Active administrator profile required",
  "errorMessage": [
    {
      "path": "",
      "message": "Active administrator profile required"
    }
  ]
}
```

HTTP 409:

```json
{
  "success": false,
  "message": "Email already in use",
  "errorMessage": [
    {
      "path": "",
      "message": "Email already in use"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid body):

```json
{
  "success": false,
  "message": "Validation Error:-> body : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "body",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Gender required free text. createdByAdminId resolved server-side; cannot submit it. No tokens/cookie.

Refetch mentors/users.

**Source trace**

Handler: `MentorController.create`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/mentor/mentor.route.ts](../src/app/modules/mentor/mentor.route.ts) → [src/app/modules/mentor/mentor.controller.ts](../src/app/modules/mentor/mentor.controller.ts) → [src/app/modules/mentor/mentor.service.ts](../src/app/modules/mentor/mentor.service.ts) → [src/app/modules/mentor/mentor.repository.ts](../src/app/modules/mentor/mentor.repository.ts) → [src/app/modules/mentor/mentor.validation.ts](../src/app/modules/mentor/mentor.validation.ts) → [src/app/modules/mentor/mentor.constant.ts](../src/app/modules/mentor/mentor.constant.ts) → [prisma/models/mentor.prisma](../prisma/models/mentor.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`. Account creation additionally calls `user.service.ts:createAccount` and the relevant profile repository in the same transaction.

---

## Students endpoints

<a id="endpoint-liststudents"></a>

### Endpoint: GET /api/v1/students

**Contract ID:** `ListStudents` (entry 23 of 35). TypeScript aliases: `ListStudentsParams`, `ListStudentsQuery`, `ListStudentsBody`, `ListStudentsResponse`, `ListStudentsErrorResponse`.

**Overview**

List non-deleted Student profiles whose Users are non-deleted and still STUDENT. Frontend feature: Student directory.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

| Name       | Wire type                                     | Required | Default   | Accepted values / validation          | Description                            |
| ---------- | --------------------------------------------- | -------- | --------- | ------------------------------------- | -------------------------------------- |
| searchTerm | string                                        | No       | Absent    | Trim; <= 100 characters               | Case-insensitive literal substring     |
| search     | string                                        | No       | Absent    | Trim; <= 100 characters               | Case-insensitive literal substring     |
| page       | number / `${number}`                          | No       | 1         | Coerced positive integer <= 1000000   | 1-based page                           |
| limit      | number / `${number}`                          | No       | 10        | Coerced positive integer <= 100       | Rows per page                          |
| sortBy     | 'id' / 'createdAt' / 'firstName' / 'lastName' | No       | createdAt | id / createdAt / firstName / lastName | Primary sort field; id asc breaks ties |
| sortOrder  | 'asc' / 'desc'                                | No       | desc      | asc / desc                            | Primary sort direction                 |

All listed query fields are optional and can be combined; unknown query keys fail 400. See global combination, search precedence and inclusive date rules.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/students?page=1&limit=10 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `StudentRecord[]`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "data": [
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "userId": "11111111-1111-4111-8111-111111111111",
      "firstName": "Nadia",
      "lastName": "Rahman",
      "phone": null,
      "bio": null,
      "gender": null,
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:00:00.000Z",
      "user": {
        "id": "11111111-1111-4111-8111-111111111111",
        "email": "student@example.com",
        "role": "STUDENT",
        "isActive": true
      }
    }
  ]
}
```

Empty matching dataset (same status; a page beyond the end can also be empty with a positive total):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0
  },
  "data": []
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid query):

```json
{
  "success": false,
  "message": "Validation Error:-> query : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "query",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Search names, phone, user email; searchTerm precedes search. Inactive included; no isActive filter. No student create API beyond registration, and no student detail/update/delete API.

Use userId for accounts, id to match submission.studentId.

**Source trace**

Handler: `StudentController.list`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/student/student.route.ts](../src/app/modules/student/student.route.ts) → [src/app/modules/student/student.controller.ts](../src/app/modules/student/student.controller.ts) → [src/app/modules/student/student.service.ts](../src/app/modules/student/student.service.ts) → [src/app/modules/student/student.repository.ts](../src/app/modules/student/student.repository.ts) → [src/app/modules/student/student.validation.ts](../src/app/modules/student/student.validation.ts) → [src/app/modules/student/builders/StudentQueryBuilder.ts](../src/app/modules/student/builders/StudentQueryBuilder.ts) → [src/app/modules/student/student.constant.ts](../src/app/modules/student/student.constant.ts) → [prisma/models/student.prisma](../prisma/models/student.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

## Submissions endpoints

<a id="endpoint-createsubmission"></a>

### Endpoint: POST /api/v1/submissions

**Contract ID:** `CreateSubmission` (entry 24 of 35). TypeScript aliases: `CreateSubmissionParams`, `CreateSubmissionQuery`, `CreateSubmissionBody`, `CreateSubmissionResponse`, `CreateSubmissionErrorResponse`.

**Overview**

Create owned PENDING project after canonical repository duplicate check. Frontend feature: Submit project.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: STUDENT.
- Required headers: `Authorization: Bearer <accessToken>`; `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field       | Type   | Required | Nullable | Validation / default                                                  | Description           |
| ----------- | ------ | -------- | -------- | --------------------------------------------------------------------- | --------------------- |
| projectName | string | Yes      | No       | Trim; 1-200 characters                                                | Project title         |
| repoUrl     | string | Yes      | No       | Trim; URL; max 2048 characters; GitHub rules below                    | GitHub repository URL |
| liveUrl     | string | Yes      | No       | Trim; URL; max 2048 characters; http: or https:; no username/password | Live application URL  |
| description | string | Yes      | No       | Trim; 1-10000 characters                                              | Project description   |

Strict JSON object; unknown fields fail 400. No nested body objects, arrays, files or date inputs.

```json
{
  "projectName": "Learning Portal",
  "repoUrl": "https://github.com/nadia/learning-portal",
  "liveUrl": "https://learning.example.com",
  "description": "A learning portal with project submissions."
}
```

Repository rule: parse with WHATWG URL; require https:, normalized hostname github.com, no username/password, no non-default port, and exactly two nonempty path segments. Empty path segments are removed before counting, so repeated/trailing slashes are accepted. Strip terminal `.git` case-insensitively from repository, then lowercase owner/repository. Preserve the trimmed original URL in repoUrl, including query/fragment; those do not affect identity. Explicit :443 normalizes to the default empty port. No additional owner/repository name syntax or existence validation occurs. `liveUrl` supports HTTP/HTTPS without credentials and can include port/path/query/fragment.

**Request example**

```http
POST /api/v1/submissions HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "projectName": "Learning Portal",
  "repoUrl": "https://github.com/nadia/learning-portal",
  "liveUrl": "https://learning.example.com",
  "description": "A learning portal with project submissions."
}
```

**Success response**

HTTP **201**. Envelope data type: `SubmissionRecord`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 201,
  "message": "",
  "data": {
    "id": "33333333-3333-4333-8333-333333333333",
    "studentId": "22222222-2222-4222-8222-222222222222",
    "projectName": "Learning Portal",
    "repoUrl": "https://github.com/nadia/learning-portal",
    "repoFullName": "nadia/learning-portal",
    "liveUrl": "https://learning.example.com",
    "description": "A learning portal with project submissions.",
    "status": "PENDING",
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z",
    "student": {
      "id": "22222222-2222-4222-8222-222222222222",
      "userId": "11111111-1111-4111-8111-111111111111",
      "firstName": "Nadia",
      "lastName": "Rahman",
      "user": {
        "id": "11111111-1111-4111-8111-111111111111",
        "email": "student@example.com"
      }
    }
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 403         | Active student profile required                                         | Non-deleted Student profile with active non-deleted STUDENT User unavailable          |
| 409         | This GitHub repository already has an active submission                 | Non-deleted submission already uses repoFullName                                      |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter plus per-student creation limiter                                      |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Active student profile required",
  "errorMessage": [
    {
      "path": "",
      "message": "Active student profile required"
    }
  ]
}
```

HTTP 409:

```json
{
  "success": false,
  "message": "This GitHub repository already has an active submission",
  "errorMessage": [
    {
      "path": "",
      "message": "This GitHub repository already has an active submission"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid body):

```json
{
  "success": false,
  "message": "Validation Error:-> body : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "body",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Owner/status derived server-side. Duplicate check global and checks only submission.isDeleted. No advisory lock or unique repository index; concurrent duplicates can commit. No GitHub API checks existence or visibility.

Refetch my projects and any loaded management list/statistics.

**Source trace**

Handler: `SubmissionController.create`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/submission/submission.route.ts](../src/app/modules/submission/submission.route.ts) → [src/app/modules/submission/submission.controller.ts](../src/app/modules/submission/submission.controller.ts) → [src/app/modules/submission/submission.service.ts](../src/app/modules/submission/submission.service.ts) → [src/app/modules/submission/submission.repository.ts](../src/app/modules/submission/submission.repository.ts) → [src/app/modules/submission/submission.validation.ts](../src/app/modules/submission/submission.validation.ts) → [src/app/modules/submission/submission.constant.ts](../src/app/modules/submission/submission.constant.ts) → [prisma/models/submission.prisma](../prisma/models/submission.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-listsubmissions"></a>

### Endpoint: GET /api/v1/submissions

**Contract ID:** `ListSubmissions` (entry 25 of 35). TypeScript aliases: `ListSubmissionsParams`, `ListSubmissionsQuery`, `ListSubmissionsBody`, `ListSubmissionsResponse`, `ListSubmissionsErrorResponse`.

**Overview**

List visible submissions across students. Frontend feature: Submission review queue.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

| Name       | Wire type                                                   | Required | Default   | Accepted values / validation                      | Description                            |
| ---------- | ----------------------------------------------------------- | -------- | --------- | ------------------------------------------------- | -------------------------------------- |
| page       | number / `${number}`                                        | No       | 1         | Coerced positive integer <= 1000000               | 1-based page                           |
| limit      | number / `${number}`                                        | No       | 10        | Coerced positive integer <= 100                   | Rows per page                          |
| searchTerm | string                                                      | No       | Absent    | Trim; <= 100 characters                           | Case-insensitive literal substring     |
| status     | SubmissionStatus                                            | No       | Absent    | PENDING / APPROVED / REJECTED / REVISION_REQUIRED | Exact submission status                |
| sortBy     | 'id' / 'createdAt' / 'updatedAt' / 'projectName' / 'status' | No       | createdAt | id / createdAt / updatedAt / projectName / status | Primary sort field; id asc breaks ties |
| sortOrder  | 'asc' / 'desc'                                              | No       | desc      | asc / desc                                        | Primary sort direction                 |

All listed query fields are optional and can be combined; unknown query keys fail 400. See global combination, search precedence and inclusive date rules.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/submissions?page=1&limit=10 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `SubmissionRecord[]`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "data": [
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "studentId": "22222222-2222-4222-8222-222222222222",
      "projectName": "Learning Portal",
      "repoUrl": "https://github.com/nadia/learning-portal",
      "repoFullName": "nadia/learning-portal",
      "liveUrl": "https://learning.example.com",
      "description": "A learning portal with project submissions.",
      "status": "PENDING",
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:00:00.000Z",
      "student": {
        "id": "22222222-2222-4222-8222-222222222222",
        "userId": "11111111-1111-4111-8111-111111111111",
        "firstName": "Nadia",
        "lastName": "Rahman",
        "user": {
          "id": "11111111-1111-4111-8111-111111111111",
          "email": "student@example.com"
        }
      }
    }
  ]
}
```

Empty matching dataset (same status; a page beyond the end can also be empty with a positive total):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0
  },
  "data": []
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid query):

```json
{
  "success": false,
  "message": "Validation Error:-> query : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "query",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Search projectName, repoFullName, description, student.firstName/lastName. Excludes deleted submissions and deleted parent Student/User, but not inactive or role-changed parent Users.

Render project, student name/email, repository/live URLs, status and timestamps.

**Source trace**

Handler: `SubmissionController.list`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/submission/submission.route.ts](../src/app/modules/submission/submission.route.ts) → [src/app/modules/submission/submission.controller.ts](../src/app/modules/submission/submission.controller.ts) → [src/app/modules/submission/submission.service.ts](../src/app/modules/submission/submission.service.ts) → [src/app/modules/submission/submission.repository.ts](../src/app/modules/submission/submission.repository.ts) → [src/app/modules/submission/submission.validation.ts](../src/app/modules/submission/submission.validation.ts) → [src/app/modules/submission/builders/SubmissionQueryBuilder.ts](../src/app/modules/submission/builders/SubmissionQueryBuilder.ts) → [src/app/modules/submission/submission.constant.ts](../src/app/modules/submission/submission.constant.ts) → [prisma/models/submission.prisma](../prisma/models/submission.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-listmysubmissions"></a>

### Endpoint: GET /api/v1/submissions/my

**Contract ID:** `ListMySubmissions` (entry 26 of 35). TypeScript aliases: `ListMySubmissionsParams`, `ListMySubmissionsQuery`, `ListMySubmissionsBody`, `ListMySubmissionsResponse`, `ListMySubmissionsErrorResponse`.

**Overview**

List authenticated Student profile submissions. Frontend feature: My projects.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: STUDENT.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

| Name   | Wire type            | Required | Default | Accepted values / validation                      | Description             |
| ------ | -------------------- | -------- | ------- | ------------------------------------------------- | ----------------------- |
| page   | number / `${number}` | No       | 1       | Coerced positive integer <= 1000000               | 1-based page            |
| limit  | number / `${number}` | No       | 10      | Coerced positive integer <= 100                   | Rows per page           |
| status | SubmissionStatus     | No       | Absent  | PENDING / APPROVED / REJECTED / REVISION_REQUIRED | Exact submission status |

All listed query fields are optional and can be combined; unknown query keys fail 400. See global combination, search precedence and inclusive date rules.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/submissions/my?page=1&limit=10 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `SubmissionRecord[]`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "data": [
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "studentId": "22222222-2222-4222-8222-222222222222",
      "projectName": "Learning Portal",
      "repoUrl": "https://github.com/nadia/learning-portal",
      "repoFullName": "nadia/learning-portal",
      "liveUrl": "https://learning.example.com",
      "description": "A learning portal with project submissions.",
      "status": "PENDING",
      "createdAt": "2026-10-26T06:00:00.000Z",
      "updatedAt": "2026-10-26T06:00:00.000Z",
      "student": {
        "id": "22222222-2222-4222-8222-222222222222",
        "userId": "11111111-1111-4111-8111-111111111111",
        "firstName": "Nadia",
        "lastName": "Rahman",
        "user": {
          "id": "11111111-1111-4111-8111-111111111111",
          "email": "student@example.com"
        }
      }
    }
  ]
}
```

Empty matching dataset (same status; a page beyond the end can also be empty with a positive total):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0
  },
  "data": []
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 403         | Active student profile required                                         | Matching active Student profile unavailable                                           |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Active student profile required",
  "errorMessage": [
    {
      "path": "",
      "message": "Active student profile required"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid query):

```json
{
  "success": false,
  "message": "Validation Error:-> query : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "query",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Only page, limit, status accepted. Fixed createdAt desc, id asc ties. Do not send searchTerm or sorting. Deleted submissions/parents excluded.

Render owned rows; edit/delete enabled only for PENDING.

**Source trace**

Handler: `SubmissionController.mine`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/submission/submission.route.ts](../src/app/modules/submission/submission.route.ts) → [src/app/modules/submission/submission.controller.ts](../src/app/modules/submission/submission.controller.ts) → [src/app/modules/submission/submission.service.ts](../src/app/modules/submission/submission.service.ts) → [src/app/modules/submission/submission.repository.ts](../src/app/modules/submission/submission.repository.ts) → [src/app/modules/submission/submission.validation.ts](../src/app/modules/submission/submission.validation.ts) → [src/app/modules/submission/submission.constant.ts](../src/app/modules/submission/submission.constant.ts) → [prisma/models/submission.prisma](../prisma/models/submission.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-submissionstatistics"></a>

### Endpoint: GET /api/v1/submissions/statistics

**Contract ID:** `SubmissionStatistics` (entry 27 of 35). TypeScript aliases: `SubmissionStatisticsParams`, `SubmissionStatisticsQuery`, `SubmissionStatisticsBody`, `SubmissionStatisticsResponse`, `SubmissionStatisticsErrorResponse`.

**Overview**

Count visible submissions by status and total. Frontend feature: Submission dashboard.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/submissions/statistics HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `SubmissionCounts`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "total": 1,
    "pending": 1,
    "approved": 0,
    "rejected": 0,
    "revisionRequired": 0
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                 |
| ----------- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token |
| 401         | Invalid authorization header                                            | Malformed bearer header                                   |
| 401         | Token expired                                                           | Expired access JWT                                        |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID            |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                        |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                         |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check   |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                          |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared  |
| 400         | Invalid reference                                                       | Prisma P2003                                              |
| 500         | Something went wrong                                                    | Other known Prisma request error                          |
| 429         | Too many requests, please try again later.                              | Global limiter                                            |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message          |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

No query schema; queries ignored. Excludes deleted submission/Student/User; includes inactive/role-changed parents. REVISION_REQUIRED contributes though no API sets it.

Refetch after submission changes, reviews and user deletion.

**Source trace**

Handler: `SubmissionController.statistics`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/submission/submission.route.ts](../src/app/modules/submission/submission.route.ts) → [src/app/modules/submission/submission.controller.ts](../src/app/modules/submission/submission.controller.ts) → [src/app/modules/submission/submission.service.ts](../src/app/modules/submission/submission.service.ts) → [src/app/modules/submission/submission.repository.ts](../src/app/modules/submission/submission.repository.ts) → [src/app/modules/submission/submission.constant.ts](../src/app/modules/submission/submission.constant.ts) → [prisma/models/submission.prisma](../prisma/models/submission.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-getsubmission"></a>

### Endpoint: GET /api/v1/submissions/:id

**Contract ID:** `GetSubmission` (entry 28 of 35). TypeScript aliases: `GetSubmissionParams`, `GetSubmissionQuery`, `GetSubmissionBody`, `GetSubmissionResponse`, `GetSubmissionErrorResponse`.

**Overview**

Read visible submission with student identity. Frontend feature: Project details.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR, STUDENT.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description   | Validation                      |
| ---- | ----------- | -------- | ------------- | ------------------------------- |
| id   | UUID string | Yes      | Submission ID | z.string().uuid("Invalid UUID") |

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/submissions/33333333-3333-4333-8333-333333333333 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `SubmissionRecord`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "33333333-3333-4333-8333-333333333333",
    "studentId": "22222222-2222-4222-8222-222222222222",
    "projectName": "Learning Portal",
    "repoUrl": "https://github.com/nadia/learning-portal",
    "repoFullName": "nadia/learning-portal",
    "liveUrl": "https://learning.example.com",
    "description": "A learning portal with project submissions.",
    "status": "PENDING",
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:00:00.000Z",
    "student": {
      "id": "22222222-2222-4222-8222-222222222222",
      "userId": "11111111-1111-4111-8111-111111111111",
      "firstName": "Nadia",
      "lastName": "Rahman",
      "user": {
        "id": "11111111-1111-4111-8111-111111111111",
        "email": "student@example.com"
      }
    }
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 404         | Submission not found                                                    | Submission or parent Student/User missing/deleted                                     |
| 403         | You cannot access another student's submission                          | Student does not own target                                                           |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "Submission not found",
  "errorMessage": [
    {
      "path": "",
      "message": "Submission not found"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "You cannot access another student's submission",
  "errorMessage": [
    {
      "path": "",
      "message": "You cannot access another student's submission"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

ADMIN/MENTOR read all visible rows; STUDENT only own. Reviews not embedded; students cannot call separate history API.

Populate project detail; review feedback absent here.

**Source trace**

Handler: `SubmissionController.getById`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/submission/submission.route.ts](../src/app/modules/submission/submission.route.ts) → [src/app/modules/submission/submission.controller.ts](../src/app/modules/submission/submission.controller.ts) → [src/app/modules/submission/submission.service.ts](../src/app/modules/submission/submission.service.ts) → [src/app/modules/submission/submission.repository.ts](../src/app/modules/submission/submission.repository.ts) → [src/app/modules/submission/submission.validation.ts](../src/app/modules/submission/submission.validation.ts) → [src/app/modules/submission/submission.constant.ts](../src/app/modules/submission/submission.constant.ts) → [prisma/models/submission.prisma](../prisma/models/submission.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-updatesubmission"></a>

### Endpoint: PATCH /api/v1/submissions/:id

**Contract ID:** `UpdateSubmission` (entry 29 of 35). TypeScript aliases: `UpdateSubmissionParams`, `UpdateSubmissionQuery`, `UpdateSubmissionBody`, `UpdateSubmissionResponse`, `UpdateSubmissionErrorResponse`.

**Overview**

Update owned visible PENDING submission with conditional ownership/status write. Frontend feature: Edit my project.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: STUDENT.
- Required headers: `Authorization: Bearer <accessToken>`; `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description   | Validation                      |
| ---- | ----------- | -------- | ------------- | ------------------------------- |
| id   | UUID string | Yes      | Submission ID | z.string().uuid("Invalid UUID") |

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field       | Type   | Required | Nullable | Validation / default                                                  | Description           |
| ----------- | ------ | -------- | -------- | --------------------------------------------------------------------- | --------------------- |
| projectName | string | No       | No       | Trim; 1-200 characters                                                | Project title         |
| repoUrl     | string | No       | No       | Trim; URL; max 2048 characters; GitHub rules below                    | GitHub repository URL |
| liveUrl     | string | No       | No       | Trim; URL; max 2048 characters; http: or https:; no username/password | Live application URL  |
| description | string | No       | No       | Trim; 1-10000 characters                                              | Project description   |

Strict JSON object; unknown fields fail 400. At least one listed field is required; `{}` fails `At least one field is required`. No nested body objects, arrays, files or date inputs.

```json
{
  "description": "Updated learning portal description."
}
```

Repository rule: parse with WHATWG URL; require https:, normalized hostname github.com, no username/password, no non-default port, and exactly two nonempty path segments. Empty path segments are removed before counting, so repeated/trailing slashes are accepted. Strip terminal `.git` case-insensitively from repository, then lowercase owner/repository. Preserve the trimmed original URL in repoUrl, including query/fragment; those do not affect identity. Explicit :443 normalizes to the default empty port. No additional owner/repository name syntax or existence validation occurs. `liveUrl` supports HTTP/HTTPS without credentials and can include port/path/query/fragment.

**Request example**

```http
PATCH /api/v1/submissions/33333333-3333-4333-8333-333333333333 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "description": "Updated learning portal description."
}
```

**Success response**

HTTP **200**. Envelope data type: `SubmissionRecord`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "33333333-3333-4333-8333-333333333333",
    "studentId": "22222222-2222-4222-8222-222222222222",
    "projectName": "Learning Portal",
    "repoUrl": "https://github.com/nadia/learning-portal",
    "repoFullName": "nadia/learning-portal",
    "liveUrl": "https://learning.example.com",
    "description": "Updated learning portal description.",
    "status": "PENDING",
    "createdAt": "2026-10-26T06:00:00.000Z",
    "updatedAt": "2026-10-26T06:30:00.000Z",
    "student": {
      "id": "22222222-2222-4222-8222-222222222222",
      "userId": "11111111-1111-4111-8111-111111111111",
      "firstName": "Nadia",
      "lastName": "Rahman",
      "user": {
        "id": "11111111-1111-4111-8111-111111111111",
        "email": "student@example.com"
      }
    }
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 403         | Active student profile required                                         | Matching active Student profile unavailable                                           |
| 404         | Submission not found                                                    | Submission or parent Student/User missing/deleted                                     |
| 403         | You cannot access another student's submission                          | Student does not own target                                                           |
| 409         | Only PENDING submissions can be updated                                 | Not PENDING                                                                           |
| 409         | This GitHub repository already has an active submission                 | New canonical repository duplicates another non-deleted row                           |
| 409         | Submission changed; please reload                                       | Conditional write lost concurrent change                                              |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Active student profile required",
  "errorMessage": [
    {
      "path": "",
      "message": "Active student profile required"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "Submission not found",
  "errorMessage": [
    {
      "path": "",
      "message": "Submission not found"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "You cannot access another student's submission",
  "errorMessage": [
    {
      "path": "",
      "message": "You cannot access another student's submission"
    }
  ]
}
```

HTTP 409:

```json
{
  "success": false,
  "message": "Only PENDING submissions can be updated",
  "errorMessage": [
    {
      "path": "",
      "message": "Only PENDING submissions can be updated"
    }
  ]
}
```

HTTP 409:

```json
{
  "success": false,
  "message": "This GitHub repository already has an active submission",
  "errorMessage": [
    {
      "path": "",
      "message": "This GitHub repository already has an active submission"
    }
  ]
}
```

HTTP 409:

```json
{
  "success": false,
  "message": "Submission changed; please reload",
  "errorMessage": [
    {
      "path": "",
      "message": "Submission changed; please reload"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

At least one field. Cannot directly change owner/canonical name/status. repoUrl recalculates repoFullName and checks global duplicates excluding self; no concurrency uniqueness lock.

Replace detail; refetch my list and any management list/statistics.

**Source trace**

Handler: `SubmissionController.update`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/submission/submission.route.ts](../src/app/modules/submission/submission.route.ts) → [src/app/modules/submission/submission.controller.ts](../src/app/modules/submission/submission.controller.ts) → [src/app/modules/submission/submission.service.ts](../src/app/modules/submission/submission.service.ts) → [src/app/modules/submission/submission.repository.ts](../src/app/modules/submission/submission.repository.ts) → [src/app/modules/submission/submission.validation.ts](../src/app/modules/submission/submission.validation.ts) → [src/app/modules/submission/submission.constant.ts](../src/app/modules/submission/submission.constant.ts) → [prisma/models/submission.prisma](../prisma/models/submission.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-deletesubmission"></a>

### Endpoint: DELETE /api/v1/submissions/:id

**Contract ID:** `DeleteSubmission` (entry 30 of 35). TypeScript aliases: `DeleteSubmissionParams`, `DeleteSubmissionQuery`, `DeleteSubmissionBody`, `DeleteSubmissionResponse`, `DeleteSubmissionErrorResponse`.

**Overview**

Soft-delete owned visible PENDING submission. Frontend feature: Delete my project.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: STUDENT.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description   | Validation                      |
| ---- | ----------- | -------- | ------------- | ------------------------------- |
| id   | UUID string | Yes      | Submission ID | z.string().uuid("Invalid UUID") |

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
DELETE /api/v1/submissions/33333333-3333-4333-8333-333333333333 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `SubmissionDeleteResult`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "33333333-3333-4333-8333-333333333333",
    "isDeleted": true
  }
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 403         | Active student profile required                                         | Matching active Student profile unavailable                                           |
| 404         | Submission not found                                                    | Submission or parent Student/User missing/deleted                                     |
| 403         | You cannot access another student's submission                          | Student does not own target                                                           |
| 409         | Only PENDING submissions can be deleted                                 | Not PENDING                                                                           |
| 409         | Submission changed; please reload                                       | Conditional write lost concurrent change                                              |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Active student profile required",
  "errorMessage": [
    {
      "path": "",
      "message": "Active student profile required"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "Submission not found",
  "errorMessage": [
    {
      "path": "",
      "message": "Submission not found"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "You cannot access another student's submission",
  "errorMessage": [
    {
      "path": "",
      "message": "You cannot access another student's submission"
    }
  ]
}
```

HTTP 409:

```json
{
  "success": false,
  "message": "Only PENDING submissions can be deleted",
  "errorMessage": [
    {
      "path": "",
      "message": "Only PENDING submissions can be deleted"
    }
  ]
}
```

HTTP 409:

```json
{
  "success": false,
  "message": "Submission changed; please reload",
  "errorMessage": [
    {
      "path": "",
      "message": "Submission changed; please reload"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Sets isDeleted/deletedAt; returns only id/isDeleted. Preserves history; no restore API. Later submission may reuse repository.

Remove detail/row; refetch lists/statistics. Response is 200, not 204.

**Source trace**

Handler: `SubmissionController.remove`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/submission/submission.route.ts](../src/app/modules/submission/submission.route.ts) → [src/app/modules/submission/submission.controller.ts](../src/app/modules/submission/submission.controller.ts) → [src/app/modules/submission/submission.service.ts](../src/app/modules/submission/submission.service.ts) → [src/app/modules/submission/submission.repository.ts](../src/app/modules/submission/submission.repository.ts) → [src/app/modules/submission/submission.validation.ts](../src/app/modules/submission/submission.validation.ts) → [src/app/modules/submission/submission.constant.ts](../src/app/modules/submission/submission.constant.ts) → [prisma/models/submission.prisma](../prisma/models/submission.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

## Submission reviews endpoints

<a id="endpoint-createreview"></a>

### Endpoint: POST /api/v1/submissions/:id/reviews

**Contract ID:** `CreateReview` (entry 31 of 35). TypeScript aliases: `CreateReviewParams`, `CreateReviewQuery`, `CreateReviewBody`, `CreateReviewResponse`, `CreateReviewErrorResponse`.

**Overview**

Atomically transition PENDING to APPROVED/REJECTED, create review and audit. Frontend feature: Approve/reject project.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR.
- Required headers: `Authorization: Bearer <accessToken>`; `Content-Type: application/json` when sending JSON. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description   | Validation                      |
| ---- | ----------- | -------- | ------------- | ------------------------------- |
| id   | UUID string | Yes      | Submission ID | z.string().uuid("Invalid UUID") |

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

| Field    | Type           | Required | Nullable | Validation / default                       | Description                            |
| -------- | -------------- | -------- | -------- | ------------------------------------------ | -------------------------------------- |
| status   | ReviewDecision | Yes      | No       | APPROVED / REJECTED only                   | Terminal review decision               |
| feedback | string         | No       | Yes      | Trim; max 10000 characters; empty accepted | Feedback; null or omission stores null |

Strict JSON object; unknown fields fail 400. No nested body objects, arrays, files or date inputs.

```json
{
  "status": "APPROVED",
  "feedback": "The project meets the requirements."
}
```

Rejected decision with optional null feedback is also valid:

```json
{
  "status": "REJECTED",
  "feedback": null
}
```

**Request example**

```http
POST /api/v1/submissions/33333333-3333-4333-8333-333333333333/reviews HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "status": "APPROVED",
  "feedback": "The project meets the requirements."
}
```

**Success response**

HTTP **201**. Envelope data type: `CreatedReview`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Submission reviewed",
  "data": {
    "id": "44444444-4444-4444-8444-444444444444",
    "submissionId": "33333333-3333-4333-8333-333333333333",
    "reviewerUserId": "77777777-7777-4777-8777-777777777777",
    "previousStatus": "PENDING",
    "status": "APPROVED",
    "feedback": "The project meets the requirements.",
    "createdAt": "2026-10-26T06:30:00.000Z",
    "updatedAt": "2026-10-26T06:30:00.000Z",
    "reviewer": {
      "id": "77777777-7777-4777-8777-777777777777",
      "email": "mentor@example.com",
      "role": "MENTOR",
      "admin": null,
      "mentor": {
        "firstName": "Amina",
        "lastName": "Hasan"
      }
    }
  }
}
```

Admin reviewer / REJECTED / nullable feedback variant:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Submission reviewed",
  "data": {
    "id": "44444444-4444-4444-8444-444444444444",
    "submissionId": "33333333-3333-4333-8333-333333333333",
    "reviewerUserId": "99999999-9999-4999-8999-999999999999",
    "previousStatus": "PENDING",
    "status": "REJECTED",
    "feedback": null,
    "createdAt": "2026-10-26T06:30:00.000Z",
    "updatedAt": "2026-10-26T06:30:00.000Z",
    "reviewer": {
      "id": "99999999-9999-4999-8999-999999999999",
      "email": "admin@example.com",
      "role": "ADMIN",
      "admin": {
        "firstName": "Project",
        "lastName": "Administrator"
      },
      "mentor": null
    }
  }
}
```

Reviewer admin/mentor relation can independently be null for missing/deleted profiles; both keys remain present.

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 403         | Active reviewer account required                                        | Fresh locked account missing/deleted/inactive or no longer ADMIN/MENTOR               |
| 404         | Submission not found                                                    | Submission or parent Student/User missing/deleted                                     |
| 409         | Only PENDING submissions can be reviewed                                | Already terminal or REVISION_REQUIRED                                                 |
| 409         | Submission already reviewed or changed                                  | Conditional status transition loses race                                              |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Active reviewer account required",
  "errorMessage": [
    {
      "path": "",
      "message": "Active reviewer account required"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "Submission not found",
  "errorMessage": [
    {
      "path": "",
      "message": "Submission not found"
    }
  ]
}
```

HTTP 409:

```json
{
  "success": false,
  "message": "Only PENDING submissions can be reviewed",
  "errorMessage": [
    {
      "path": "",
      "message": "Only PENDING submissions can be reviewed"
    }
  ]
}
```

HTTP 409:

```json
{
  "success": false,
  "message": "Submission already reviewed or changed",
  "errorMessage": [
    {
      "path": "",
      "message": "Submission already reviewed or changed"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Reviewer is User ID. READ COMMITTED transaction locks reviewer FOR SHARE and conditionally updates submission; audit failure rolls back all. No re-review/reopen. Invalid review target status 400 is direct-service guard; HTTP invalid enum fails Zod first.

Refetch detail/queue/statistics/history/visible audits; disable decisions once not PENDING.

**Source trace**

Handler: `SubmissionReviewController.create`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/submission/submission.route.ts](../src/app/modules/submission/submission.route.ts) → [src/app/modules/submission-review/submission-review.controller.ts](../src/app/modules/submission-review/submission-review.controller.ts) → [src/app/modules/submission-review/submission-review.service.ts](../src/app/modules/submission-review/submission-review.service.ts) → [src/app/modules/submission-review/submission-review.repository.ts](../src/app/modules/submission-review/submission-review.repository.ts) → [src/app/modules/submission-review/submission-review.validation.ts](../src/app/modules/submission-review/submission-review.validation.ts) → [src/app/modules/submission-review/submission-review.constant.ts](../src/app/modules/submission-review/submission-review.constant.ts) → [prisma/models/submission-review.prisma](../prisma/models/submission-review.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`. Review service additionally uses SubmissionService/SubmissionRepository and AuditLogService/Repository.

---

<a id="endpoint-listreviews"></a>

### Endpoint: GET /api/v1/submissions/:id/reviews

**Contract ID:** `ListReviews` (entry 32 of 35). TypeScript aliases: `ListReviewsParams`, `ListReviewsQuery`, `ListReviewsBody`, `ListReviewsResponse`, `ListReviewsErrorResponse`.

**Overview**

List non-deleted reviews after checking visible parent submission. Frontend feature: Review history.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description   | Validation                      |
| ---- | ----------- | -------- | ------------- | ------------------------------- |
| id   | UUID string | Yes      | Submission ID | z.string().uuid("Invalid UUID") |

**Query parameters**

| Name  | Wire type            | Required | Default | Accepted values / validation        | Description   |
| ----- | -------------------- | -------- | ------- | ----------------------------------- | ------------- |
| page  | number / `${number}` | No       | 1       | Coerced positive integer <= 1000000 | 1-based page  |
| limit | number / `${number}` | No       | 10      | Coerced positive integer <= 100     | Rows per page |

All listed query fields are optional and can be combined; unknown query keys fail 400. See global combination, search precedence and inclusive date rules.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/submissions/33333333-3333-4333-8333-333333333333/reviews?page=1&limit=10 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `ReviewRecord[]`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "data": [
    {
      "id": "44444444-4444-4444-8444-444444444444",
      "submissionId": "33333333-3333-4333-8333-333333333333",
      "reviewerUserId": "77777777-7777-4777-8777-777777777777",
      "previousStatus": "PENDING",
      "status": "APPROVED",
      "feedback": "The project meets the requirements.",
      "createdAt": "2026-10-26T06:30:00.000Z",
      "updatedAt": "2026-10-26T06:30:00.000Z",
      "reviewer": {
        "id": "77777777-7777-4777-8777-777777777777",
        "email": "mentor@example.com",
        "role": "MENTOR",
        "admin": null,
        "mentor": {
          "firstName": "Amina",
          "lastName": "Hasan"
        }
      }
    }
  ]
}
```

Empty matching dataset (same status; a page beyond the end can also be empty with a positive total):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0
  },
  "data": []
}
```

Admin reviewer / REJECTED / nullable feedback variant:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "data": [
    {
      "id": "44444444-4444-4444-8444-444444444444",
      "submissionId": "33333333-3333-4333-8333-333333333333",
      "reviewerUserId": "99999999-9999-4999-8999-999999999999",
      "previousStatus": "PENDING",
      "status": "REJECTED",
      "feedback": null,
      "createdAt": "2026-10-26T06:30:00.000Z",
      "updatedAt": "2026-10-26T06:30:00.000Z",
      "reviewer": {
        "id": "99999999-9999-4999-8999-999999999999",
        "email": "admin@example.com",
        "role": "ADMIN",
        "admin": {
          "firstName": "Project",
          "lastName": "Administrator"
        },
        "mentor": null
      }
    }
  ]
}
```

Reviewer admin/mentor relation can independently be null for missing/deleted profiles; both keys remain present.

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 404         | Submission not found                                                    | Submission or parent Student/User missing/deleted                                     |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "Submission not found",
  "errorMessage": [
    {
      "path": "",
      "message": "Submission not found"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Fixed createdAt asc, id asc; page/limit only. No student access, including owner. Reviewer name relations exclude deleted profiles independently; account email/role current.

Render previous/current status, feedback, reviewer and timestamps; empty history allowed.

**Source trace**

Handler: `SubmissionReviewController.list`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/submission/submission.route.ts](../src/app/modules/submission/submission.route.ts) → [src/app/modules/submission-review/submission-review.controller.ts](../src/app/modules/submission-review/submission-review.controller.ts) → [src/app/modules/submission-review/submission-review.service.ts](../src/app/modules/submission-review/submission-review.service.ts) → [src/app/modules/submission-review/submission-review.repository.ts](../src/app/modules/submission-review/submission-review.repository.ts) → [src/app/modules/submission-review/submission-review.validation.ts](../src/app/modules/submission-review/submission-review.validation.ts) → [src/app/modules/submission-review/submission-review.constant.ts](../src/app/modules/submission-review/submission-review.constant.ts) → [prisma/models/submission-review.prisma](../prisma/models/submission-review.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`. Review service additionally uses SubmissionService/SubmissionRepository and AuditLogService/Repository.

---

## Audit logs endpoints

<a id="endpoint-listauditlogs"></a>

### Endpoint: GET /api/v1/audit-logs

**Contract ID:** `ListAuditLogs` (entry 33 of 35). TypeScript aliases: `ListAuditLogsParams`, `ListAuditLogsQuery`, `ListAuditLogsBody`, `ListAuditLogsResponse`, `ListAuditLogsErrorResponse`.

**Overview**

List visible non-deleted audit entries with exact/date filters. Frontend feature: Audit history.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

| Name        | Wire type            | Required | Default   | Accepted values / validation        | Description                            |
| ----------- | -------------------- | -------- | --------- | ----------------------------------- | -------------------------------------- |
| page        | number / `${number}` | No       | 1         | Coerced positive integer <= 1000000 | 1-based page                           |
| limit       | number / `${number}` | No       | 10        | Coerced positive integer <= 100     | Rows per page                          |
| sortBy      | 'createdAt'          | No       | createdAt | createdAt                           | Primary sort field; id asc breaks ties |
| sortOrder   | 'asc' / 'desc'       | No       | desc      | asc / desc                          | Primary sort direction                 |
| action      | string               | No       | Absent    | Trim; 1-100 characters              | Exact case-sensitive action            |
| entityType  | string               | No       | Absent    | Trim; 1-100 characters              | Exact case-sensitive entity type       |
| entityId    | UUID                 | No       | Absent    | UUID                                | Exact entity ID                        |
| actorUserId | UUID                 | No       | Absent    | UUID                                | Exact actor User ID                    |
| fromDate    | string               | No       | Absent    | Valid YYYY-MM-DD                    | createdAt >= 00:00:00.000Z             |
| toDate      | string               | No       | Absent    | Valid YYYY-MM-DD; >= fromDate       | createdAt <= 23:59:59.999Z             |

All listed query fields are optional and can be combined; unknown query keys fail 400. See global combination, search precedence and inclusive date rules.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/audit-logs?page=1&limit=10 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `AuditLogRecord[]`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "data": [
    {
      "id": "88888888-8888-4888-8888-888888888888",
      "actorUserId": "77777777-7777-4777-8777-777777777777",
      "action": "SUBMISSION_REVIEWED",
      "entityType": "Submission",
      "entityId": "33333333-3333-4333-8333-333333333333",
      "oldData": {
        "status": "PENDING"
      },
      "newData": {
        "status": "APPROVED",
        "reviewId": "44444444-4444-4444-8444-444444444444"
      },
      "ipAddress": "127.0.0.1",
      "userAgent": "ExampleFrontend/1.0",
      "createdAt": "2026-10-26T06:30:00.000Z",
      "actor": {
        "id": "77777777-7777-4777-8777-777777777777",
        "email": "mentor@example.com",
        "role": "MENTOR"
      }
    }
  ]
}
```

Empty matching dataset (same status; a page beyond the end can also be empty with a positive total):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0
  },
  "data": []
}
```

Administrator-visible account-status audit variant (MENTOR cannot access it):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "data": [
    {
      "id": "88888888-8888-4888-8888-888888888888",
      "actorUserId": "99999999-9999-4999-8999-999999999999",
      "action": "USER_STATUS_CHANGED",
      "entityType": "User",
      "entityId": "11111111-1111-4111-8111-111111111111",
      "oldData": {
        "isActive": true
      },
      "newData": {
        "isActive": false
      },
      "ipAddress": null,
      "userAgent": null,
      "createdAt": "2026-10-26T06:30:00.000Z",
      "actor": {
        "id": "99999999-9999-4999-8999-999999999999",
        "email": "admin@example.com",
        "role": "ADMIN"
      }
    }
  ]
}
```

Snapshots are arbitrary JSON or null. Current API writers emit `{status}` → `{status, reviewId}` for reviews and `{isActive}` → `{isActive}` for status changes. Sanitization recurses into arrays/objects and replaces values with `[REDACTED]` when normalized keys match password/passwd/token/secret/authorization/cookie/credential/apikey/privatekey/otp/databaseurl/connectionstring. Keys and ordinary snapshot values are preserved. Actor, entity ID and context fields permit null as the catalogue states.

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 400 validation example (unexpected key added to otherwise valid query):

```json
{
  "success": false,
  "message": "Validation Error:-> query : Unrecognized key(s) in object: 'unexpected'",
  "errorMessage": [
    {
      "path": "query",
      "message": "Unrecognized key(s) in object: 'unexpected'"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

ADMIN sees all non-deleted logs. MENTOR only own SUBMISSION_REVIEWED logs with entityType=Submission. Filters intersect scope. oldData/newData recursively redact credential-like keys; other selected metadata is not recursively sanitized.

Render action/entity/actor/date and inspect JSON without assuming fixed keys.

**Source trace**

Handler: `AuditLogController.list`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/audit-log/audit-log.route.ts](../src/app/modules/audit-log/audit-log.route.ts) → [src/app/modules/audit-log/audit-log.controller.ts](../src/app/modules/audit-log/audit-log.controller.ts) → [src/app/modules/audit-log/audit-log.service.ts](../src/app/modules/audit-log/audit-log.service.ts) → [src/app/modules/audit-log/audit-log.repository.ts](../src/app/modules/audit-log/audit-log.repository.ts) → [src/app/modules/audit-log/audit-log.validation.ts](../src/app/modules/audit-log/audit-log.validation.ts) → [src/app/modules/audit-log/builders/AuditLogQueryBuilder.ts](../src/app/modules/audit-log/builders/AuditLogQueryBuilder.ts) → [src/app/modules/audit-log/audit-log.constant.ts](../src/app/modules/audit-log/audit-log.constant.ts) → [prisma/models/audit-log.prisma](../prisma/models/audit-log.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

<a id="endpoint-getauditlog"></a>

### Endpoint: GET /api/v1/audit-logs/:id

**Contract ID:** `GetAuditLog` (entry 34 of 35). TypeScript aliases: `GetAuditLogParams`, `GetAuditLogQuery`, `GetAuditLogBody`, `GetAuditLogResponse`, `GetAuditLogErrorResponse`.

**Overview**

Read visible non-deleted audit entry. Frontend feature: Audit entry detail.

**Authentication & authorization**

- Authentication required: Yes — access JWT.
- Allowed roles: ADMIN, MENTOR.
- Required headers: `Authorization: Bearer <accessToken>`; None beyond bearer above. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

| Name | Type        | Required | Description  | Validation                      |
| ---- | ----------- | -------- | ------------ | ------------------------------- |
| id   | UUID string | Yes      | Audit log ID | z.string().uuid("Invalid UUID") |

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /api/v1/audit-logs/88888888-8888-4888-8888-888888888888 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <accessToken>
```

**Success response**

HTTP **200**. Envelope data type: `AuditLogRecord`; all nested fields/nullability are defined in the serialized catalogue and TypeScript contract.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "88888888-8888-4888-8888-888888888888",
    "actorUserId": "77777777-7777-4777-8777-777777777777",
    "action": "SUBMISSION_REVIEWED",
    "entityType": "Submission",
    "entityId": "33333333-3333-4333-8333-333333333333",
    "oldData": {
      "status": "PENDING"
    },
    "newData": {
      "status": "APPROVED",
      "reviewId": "44444444-4444-4444-8444-444444444444"
    },
    "ipAddress": "127.0.0.1",
    "userAgent": "ExampleFrontend/1.0",
    "createdAt": "2026-10-26T06:30:00.000Z",
    "actor": {
      "id": "77777777-7777-4777-8777-777777777777",
      "email": "mentor@example.com",
      "role": "MENTOR"
    }
  }
}
```

Administrator-visible account-status audit variant (MENTOR cannot access it):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "",
  "data": {
    "id": "88888888-8888-4888-8888-888888888888",
    "actorUserId": "99999999-9999-4999-8999-999999999999",
    "action": "USER_STATUS_CHANGED",
    "entityType": "User",
    "entityId": "11111111-1111-4111-8111-111111111111",
    "oldData": {
      "isActive": true
    },
    "newData": {
      "isActive": false
    },
    "ipAddress": null,
    "userAgent": null,
    "createdAt": "2026-10-26T06:30:00.000Z",
    "actor": {
      "id": "99999999-9999-4999-8999-999999999999",
      "email": "admin@example.com",
      "role": "ADMIN"
    }
  }
}
```

Snapshots are arbitrary JSON or null. Current API writers emit `{status}` → `{status, reviewId}` for reviews and `{isActive}` → `{isActive}` for status changes. Sanitization recurses into arrays/objects and replaces values with `[REDACTED]` when normalized keys match password/passwd/token/secret/authorization/cookie/credential/apikey/privatekey/otp/databaseurl/connectionstring. Keys and ordinary snapshot values are preserved. Actor, entity ID and context fields permit null as the catalogue states.

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401         | Unauthorized access                                                     | Missing bearer header, invalid signature or invalid token                             |
| 401         | Invalid authorization header                                            | Malformed bearer header                                                               |
| 401         | Token expired                                                           | Expired access JWT                                                                    |
| 401         | Malformed token payload                                                 | Token userId missing, non-string or not a UUID                                        |
| 401         | User no longer exists                                                   | User missing/deleted on cache miss                                                    |
| 403         | Account is inactive                                                     | Inactive cached or loaded account                                                     |
| 403         | Forbidden access                                                        | JWT role or cached/database role fails route role check                               |
| 404         | Audit log not found                                                     | Missing/deleted log                                                                   |
| 403         | You cannot access this audit log                                        | Outside mentor own-review scope                                                       |
| 400         | Validation Error:-> ...                                                 | Mounted Zod body/query/UUID validation fails; summary is generated from actual issues |
| 409         | Duplicate ${field} value / Concurrent change; please retry              | Prisma P2002 / P2034 if surfaced                                                      |
| 404         | Record not found                                                        | Prisma P2025, e.g. conditional/nested record disappeared                              |
| 400         | Invalid reference                                                       | Prisma P2003                                                                          |
| 500         | Something went wrong                                                    | Other known Prisma request error                                                      |
| 429         | Too many requests, please try again later.                              | Global limiter                                                                        |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message                                      |

HTTP 401:

```json
{
  "success": false,
  "message": "Unauthorized access",
  "errorMessage": [
    {
      "path": "",
      "message": "Unauthorized access"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessage": [
    {
      "path": "",
      "message": "Forbidden access"
    }
  ]
}
```

HTTP 404:

```json
{
  "success": false,
  "message": "Audit log not found",
  "errorMessage": [
    {
      "path": "",
      "message": "Audit log not found"
    }
  ]
}
```

HTTP 403:

```json
{
  "success": false,
  "message": "You cannot access this audit log",
  "errorMessage": [
    {
      "path": "",
      "message": "You cannot access this audit log"
    }
  ]
}
```

HTTP 400 validation example (invalid id):

```json
{
  "success": false,
  "message": "Validation Error:-> id : Invalid UUID",
  "errorMessage": [
    {
      "path": "id",
      "message": "Invalid UUID"
    }
  ]
}
```

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

actor/actorUserId, entityId and snapshots can be null. No audit write/update/delete APIs.

Display selected data; render arbitrary JSON safely.

**Source trace**

Handler: `AuditLogController.getById`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app/modules/audit-log/audit-log.route.ts](../src/app/modules/audit-log/audit-log.route.ts) → [src/app/modules/audit-log/audit-log.controller.ts](../src/app/modules/audit-log/audit-log.controller.ts) → [src/app/modules/audit-log/audit-log.service.ts](../src/app/modules/audit-log/audit-log.service.ts) → [src/app/modules/audit-log/audit-log.repository.ts](../src/app/modules/audit-log/audit-log.repository.ts) → [src/app/modules/audit-log/audit-log.validation.ts](../src/app/modules/audit-log/audit-log.validation.ts) → [src/app/modules/audit-log/audit-log.constant.ts](../src/app/modules/audit-log/audit-log.constant.ts) → [prisma/models/audit-log.prisma](../prisma/models/audit-log.prisma).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`.

---

## Operations endpoints

<a id="endpoint-health"></a>

### Endpoint: GET /health

**Contract ID:** `Health` (entry 35 of 35). TypeScript aliases: `HealthParams`, `HealthQuery`, `HealthBody`, `HealthResponse`, `HealthErrorResponse`.

**Overview**

Return process health/time without querying database. Frontend feature: Service status / diagnostics.

**Authentication & authorization**

- Authentication required: No.
- Allowed roles: No role restriction; Public.
- Required headers: None. `Accept: application/json` is optional.
- Required cookies: None. Login/refresh may set a refresh cookie; it is not used to authenticate this route.

**Path parameters**

None.

**Query parameters**

None supported. No query schema is mounted for this route; query values are ignored.

**Request body & validation**

No supported body; send no body. This route does not validate or consume body fields.

**Request example**

```http
GET /health HTTP/1.1
Host: localhost:5000
```

**Success response**

HTTP **200**. Plain `HealthResult` JSON.

```json
{
  "status": "ok",
  "time": "2026-10-26T06:00:00.000Z"
}
```

**Error responses**

| HTTP status | Exact message or explicitly marked dynamic pattern                      | Condition                                        |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| 429         | Too many requests, please try again later.                              | Global limiter                                   |
| 500         | Unexpected server error / Something went wrong. Please try again later. | Unexpected Error; production uses second message |

HTTP 429:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests, please try again later."
}
```

HTTP 500 unexpected Error (production):

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later.",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "errorMessage": []
}
```

The common error section specifies all Prisma/JWT/parser variants and validation issue aggregation. Listed database error mappings are conditional mappings, not a claim that every Prisma code is reachable in every ordinary request.

**Business restrictions & frontend integration notes**

Plain JSON without envelope. Startup waits for DB, handler does not probe readiness. Global limiter applies.

Display connectivity; time is server clock.

**Source trace**

Handler: `inline handler in src/app.ts`. Registration of prefix: `src/app.ts` → `src/app/routes/index_route.ts` → `src/app/routes/routes.container.ts`. [src/app.ts](../src/app.ts).

Shared path: `authMiddleware.ts` (when protected) → `validateRequestZod.ts` (when mounted) → controller → service → Prisma repository → `AbstractController.sendResponse`; failures → `globalErrorHandler.ts`, `handleZodError.ts`, `handle-prisma-error.ts`. Health instead uses inline Express res.json and no service/repository.

---

## Cross-module workflows

1. **Student account/session:** Register → Login → Session → GetOwnProfile. Register requires names, email, compliant password; gender/phone optional. Login returns tokens and cookie, not a full profile. Session reloads enabled state. RefreshToken can bootstrap a persisted cookie session; Logout clears cookie and the frontend must clear its own state. Login/refresh names come from the current role profile, while profile endpoints independently filter deleted profiles.
2. **Own profile/password:** GetOwnProfile → UpdateOwnProfile with changed allowed fields only; ChangePassword requires current and new passwords. A missing current role profile makes nested update fail. No gender self-edit or account-email self-edit route exists for STUDENT. Password changes retain existing JWTs.
3. **Staff provisioning:** ADMIN Login → CreateAdmin and/or CreateMentor → ListAdmins/ListMentors/ListUsers. Mentor creation needs an active non-deleted Admin profile; returned createdByAdminId is that profile ID. New staff logs in separately. Student provisioning uses Register, not an admin-only student creation operation. Seed provisions Admin and Mentor, not students.
4. **Student submission:** Login STUDENT → ListMySubmissions → CreateSubmission → GetSubmission → UpdateSubmission/DeleteSubmission while PENDING. The active Student profile determines ownership. Repository identity normalization is global; deleted parents do not free a repository if its submission itself is not deleted. Duplicate checks can race. Another student's visible row returns 403; deleted/invisible rows return 404 first.
5. **Review:** ADMIN/MENTOR Login → ListSubmissions/SubmissionStatistics → GetSubmission → ListReviews → CreateReview. Only PENDING can transition to APPROVED/REJECTED. Review insert, status update and SUBMISSION_REVIEWED audit are atomic. Competing reviewers receive 409 on losing conditional update. Refetch status/history/statistics after success or conflict. No reopening or REVISION_REQUIRED transition; student cannot read history/feedback through current APIs.
6. **Account management:** ADMIN manages all non-deleted accounts; MENTOR only STUDENT accounts. ListUsers → GetUser → UpdateUser/UpdateUserStatus/DeleteUser. Status endpoint atomically writes audit and rejects self-deactivation; generic PATCH also rejects self-deactivation but does not audit. Account deletion has no self-delete guard. User role changes leave profiles untouched and existing tokens have old role claims; refresh or re-login to align claims. No public restore exists.
7. **Audits:** ListAuditLogs → GetAuditLog, with intersected role scope. ADMIN sees both review/status actions; MENTOR only own review actions. Audit snapshots are JSON and may be sanitized/null. No audit mutation API. Profile CRUD, account deletion/password/email/role edits and submission creation/edit/deletion do not automatically create audit entries in current source.

## Implementation inconsistencies and runtime verification

- The previous README omitted ten active endpoints/legacy aliases and described several mentor-permitted routes as ADMIN-only. The inventory above follows current route and service code, not that historical description.
- Auth middleware uses a 300-second cache. It does not recheck DB on every request. Cache invalidation is local; check multi-process deactivation behavior before relying on immediate enforcement across instances.
- Repository duplicate protection is a check-then-create/check-then-update in READ COMMITTED. No advisory lock call exists and migrations have no repoFullName unique constraint. Simultaneous duplicates are possible; a 409 check is not a concurrency guarantee.
- Database permits REVISION_REQUIRED and list filters/statistics expose it, but no active HTTP write can set it. There is no edit/review/reopen API for non-PENDING records.
- Generic user role edit does not provision/synchronize/delete profiles. A login can return name N/A, profile relations can be missing or mismatched, and self-profile or student/mentor workflows can fail afterward. Frontend role assignment must not imply a complete profile conversion feature.
- Admin-profile deletion leaves User enabled and tokens usable. User deletion leaves profiles/submissions stored. Admin list/detail do not filter parent account status/deletion/role; Student/Mentor lists do filter parent role/deletion; submission visibility filters parent deletion only. Do not infer a uniform soft-delete policy.
- Self-deactivation is blocked; self-deletion is not. Only dedicated status changes and reviews produce audit records.
- Logout/password changes retain issued tokens. Browser storage strategy is a frontend decision; cookie-based refresh must be verified for actual frontend/API site relationship and Secure setting.
- Parsers and CORS run before the global limiter; malformed/oversized JSON and CORS rejection are currently normalized to 500, not a conventional 400/413/CORS error body. Browser JavaScript may only observe a network/CORS failure.
- Legacy auth profile checks deletion only; users/profile checks active and current role too. A cached active identity can therefore produce different results on the two routes after external changes.
- Seed requires both Admin and Mentor credentials, with 8-72-character compliant passwords. Earlier README claims about admin-only seeding, 12-character minimum and existing comprehensive test coverage are not supported by this checkout. tests, postman and docs directories were empty at audit start; Jest setup imports a missing tests/integration/test-database helper.
- **Not verified — runtime confirmation required:** successful end-to-end flows for all 34 business endpoints with their required authenticated/database context; applied migration state/data; cookie behavior on deployment; duplicate/review races; external writer and multi-instance cache behavior; actual production origin/port and configuration. Local validation/type/smoke checks do not establish these integration outcomes. No migration, seed, server deployment, database mutation or application source modification is performed for this documentation task.

## Audit coverage and evidence

Inspected src/app.ts/server.ts, all mounted route classes and containers, every controller/service/repository/validation/interface/selection/QueryBuilder in the eight business modules, shared auth/validation/error/response/pagination/authorization helpers, JWT/cache/cookie/rate-limit code, all seven Prisma models and both migrations, environment/config/seed/scripts, build/test configuration, Docker/Compose/deployment configuration and existing README. Upload/mail/encryption helpers are unmounted and are not public APIs. `UserService.restore`, findByEmail/findByRole and account creation helpers have no direct HTTP route; do not integrate invented restore or user-create URLs. No inactive module route is counted.

All 35 active method/path contracts have exactly one detailed entry, one set of five endpoint TypeScript aliases and one frontend integration mapping/checklist entry. Shared catalogue types preserve the actual selections; there are no generated application runtime files or added dependencies. Verification results are recorded in the README and frontend guide; representative JSON remains statically derived unless a specific check is explicitly identified.

### Checks executed during this audit

- `pnpm tsc:check` passed for the existing backend.
- `pnpm exec tsc --noEmit --strict --skipLibCheck --target ES2022 docs/API_CONTRACTS.ts` passed for the standalone contracts.
- Instantiated Express-router inspection matched all 35 documented method/path pairs exactly; all 35 five-type contract sets and frontend checklist entries were present.
- Executed real Zod parsing for 45 documented request examples; compared all 14 JSON-body field groups for exact keys, required/optional and nullable behavior, and all eight list query-key sets against mounted schemas.
- Compiled 53 complete success JSON examples and 208 complete error JSON examples against generated types; compared 29 validation-error examples with the actual backend formatter and 13 selected backend response types bidirectionally after Date-to-string serialization (audit JSON accounts for sanitization).
- Parsed every JSON code fence and checked local Markdown file/endpoint-anchor links.
- Supertest checks without database queries passed: health 200; missing/invalid bearer 401; invalid login/registration bodies 400; missing refresh credentials 401; unknown route 404; allowed localhost CORS preflight 204 with credentials enabled. These are targeted checks, not full authenticated/database integration tests.

No build, migration, seed, dependency installation, deployment or database writes were run. Existing Jest suites were not run because this checkout contains no test files and its configured database setup helper is missing. The verification harness was temporary outside the repository; only the four requested documentation artifacts were created/updated. README.md is currently ignored by an existing .gitignore rule; it was still updated locally. Ignore rules were not edited by this audit.
