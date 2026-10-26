# Project Submission Dashboard

Project submission and management dashboard for administrators, mentors, and students.

Repository: [sampod76/project-submission-dashboard](https://github.com/sampod76/project-submission-dashboard).

## Current status

Phase 1 migrates project identity and configuration. User, mentor, student, project and submission management, including the planned `ADMIN`, `MENTOR` and `STUDENT` roles, await Phase 2 and the separate Project Submission backend contract. No backend repository or production domain has been confirmed.

The existing Doctor/Patient pages, charts, forms and authentication code remain available for migration. They still expect the legacy API contract; they are **not** completed Project Submission features. Login needs a compatible explicitly configured backend and its own account. There are no bundled demo credentials or fallback production hosts.

## Stack and structure

- Next.js 14.2.35 App Router, React 18.3.1 and TypeScript.
- Redux Toolkit, RTK Query, React Redux and Redux Persist.
- React Hook Form, Zod, TanStack Table and Recharts.
- Tailwind CSS, shadcn-style Radix UI components, Lucide icons and Sonner.
- pnpm, ESLint, Prettier, Docker and GitHub Actions.

```text
src/app/          Pages, layouts, metadata and route states
src/components/  Legacy doctor/patient/dashboard modules and shared UI
src/config/      API host and image settings
src/constants/   Navigation and legacy hospital options
src/hooks/       Authentication, debounce and mobile helpers
src/redux/       Store, authentication and RTK Query API modules
src/schema/      Existing form schemas
src/types/       Existing API and data contracts
src/styles/      Global styles
src/lib/         UI utilities
src/utils/       API error helpers
public/          Images and fonts
.github/workflows/ Validation, image publication and image retention
```

## Installation and local development

Docker and CI use Node.js 22.18.0 and pnpm 10.19.0. Use the same versions for reproducible installs.

```sh
git clone https://github.com/sampod76/project-submission-dashboard.git
cd project-submission-dashboard
pnpm install
cp .env.example .env.local
```

In PowerShell, use `Copy-Item .env.example .env.local`. Set `NEXT_PUBLIC_BASE_URL` to the **confirmed** backend origin before running:

```sh
pnpm dev
```

Open [localhost:3000](http://localhost:3000). No local backend port is assumed; obtain the origin from the backend configuration. The repository contains no backend service.

| Command                          | Purpose                                       |
| -------------------------------- | --------------------------------------------- |
| `pnpm install --frozen-lockfile` | Install exactly the locked dependencies       |
| `pnpm exec tsc --noEmit`         | Check TypeScript                              |
| `pnpm lint`                      | Check ESLint                                  |
| `pnpm build`                     | Build for production; requires the API origin |
| `pnpm start`                     | Serve the built app on port 3000              |
| `pnpm format:check`              | Check formatting                              |

The unused `dev:secure` command was removed because its `server.ts` entry point does not exist.

## Environment configuration

[.env.example](./.env.example) documents the configurable values. Private `.env*` files are ignored by Git and excluded from Docker builds; only the example is tracked.

| Variable               | Purpose                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_BASE_URL` | Required HTTP(S) backend origin, without credentials, query, fragment or `/api/v1`. No fallback is supplied.                   |
| `APP_HOST_PORT`        | Required Docker host port mapped to container port `3000`. Choose an available port explicitly.                                |
| `APP_DIR`              | Absolute path to a dedicated VPS checkout, required only when manually invoking `deploy.sh`. The directory must already exist. |

The retained RTK Query client appends `/api/v1` and still uses the existing auth, doctor, patient and dashboard endpoints. Their contracts must be reviewed in Phase 2. These are not promises about the new backend API.

`NEXT_PUBLIC_BASE_URL` is public and embedded into browser assets **during the build**. Do not put secrets in it. Changing a container's runtime environment cannot change an already built API origin; rebuild the image. Production builds reject missing values and malformed origins. Next.js selects `NODE_ENV` for its commands; the example does not override it.

Authentication persistence uses `project-submission-dashboard:auth` so an old application's stored session is not reused on the same origin. Existing sessions require signing in again.

## Docker

The existing multi-stage build, Linux standalone output, non-root runtime, Sharp verification, PM2 fork process and JSON log rotation are retained. PM2 is redundant with Docker's restart policy for a single process, but remains to preserve the current runtime and signal handling. All internal ports, including PM2 and `EXPOSE`, use `3000`. No health check existed; none has been added.

For a local image build, copy `.env.example` to `.env`, then set the confirmed `NEXT_PUBLIC_BASE_URL` and an available `APP_HOST_PORT`. Compose reads `.env` or shell values for interpolation; it does not load `.env.local` automatically.

```sh
docker compose --profile app config
docker compose --profile app build app
```

Alternatively, with `NEXT_PUBLIC_BASE_URL` explicitly set in your shell:

```sh
docker build --build-arg NEXT_PUBLIC_BASE_URL -t project-submission-dashboard:local .
```

| Setting         | Production                                             | Local Compose                        |
| --------------- | ------------------------------------------------------ | ------------------------------------ |
| Image           | `ghcr.io/sampod76/project-submission-dashboard:latest` | Built from this checkout             |
| Compose project | `project-submission-dashboard`                         | `project-submission-dashboard-local` |
| Container       | `project-submission-dashboard`                         | `project-submission-dashboard-local` |
| Network         | `project-submission-network`                           | `project-submission-network-local`   |
| Ports           | `${APP_HOST_PORT}:3000`                                | `${APP_HOST_PORT}:3000`              |

The local network has a separate name to avoid ownership conflicts when both Compose projects run on one machine. Select different host ports in that case. Runtime Compose needs no API env file: the API origin is already compiled into the image, and its runtime settings are explicitly declared.

## CI/CD and production setup

`.github/workflows/deploy.yml` validates frozen installation, TypeScript and ESLint on pushes and pull requests targeting `main`. After validation, pushes to `main` or manual runs on `main` in the expected repository build and publish the GHCR image. Docker builds run Next.js compilation, lint and type checking. Publication fails with a clear message until the build variable is configured.

Required GitHub configuration:

- Repository variable **`NEXT_PUBLIC_BASE_URL`**: confirmed Project Submission backend origin supplied as a Docker build argument.
- Built-in **`GITHUB_TOKEN`**: GHCR authentication with `packages: write`; no additional image publication secret is introduced.
- `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` and optional `SSH_PORT` are no longer consumed. Existing secrets were not renamed or changed. Verify dedicated destination credentials before any future SSH deployment is introduced.

**Automatic server deployment is disabled.** No SSH step remains. Image publication does not restart a server. The cleanup workflow only targets untagged versions of the new frontend image and retains at least five versions.

Before a production deployment, confirm the backend origin and repository, frontend domain/reverse proxy, VPS host and credentials, dedicated checkout directory, registry pull access and external host port. Copy the new deployment files to that dedicated checkout. Do not use a directory or containers belonging to another application.

Validate production interpolation after setting `APP_HOST_PORT` in `.env` or the shell:

```sh
docker compose -f docker-compose.pro.yml --profile app config
```

`deploy.sh` is a manual production operation for an operator after these values are confirmed. It requires an absolute `APP_DIR`, verifies package identity and the configured image, validates Compose before pulling, and uses the explicit new Compose project to recreate only its `app` service with `--no-build --no-deps`. It performs no image, cache or container pruning. It is not invoked by CI.

## Phase 2 and historical material

Doctor/Patient CRUD, dashboard analytics, auth/profile/password contracts, API cache tags, schemas, types and navigation remain unchanged except for branding, session isolation and removal of the old login redirect/demo fill. Migrate these to API-driven users, mentors, students, projects and submissions only after the new backend contracts are supplied.

`docs/screenshots/` contains historical **Doctor Tracker** desktop captures, not screenshots of the new application. `docs/ui-migration-report.json` records an earlier UI-library migration; its validation claims describe that earlier work. The medical illustrations and unused old logo assets in `public/` are retained as legacy material; active branding uses `src/app/icon.svg`. The medical artwork still visible on landing/sign-in pages is temporary legacy artwork.
