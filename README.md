# Project Submission Dashboard

A role-based platform where Students submit projects and track their status. Mentors and Admins review submissions and manage accounts through dedicated dashboards.

## Tech Stack

- Next.js and React
- TypeScript
- Tailwind CSS and shadcn/ui
- Redux Toolkit and RTK Query

## Getting Started

Clone the repository and install dependencies with pnpm:

```bash
git clone https://github.com/sampod76/project-submission-dashboard.git
cd project-submission-dashboard
pnpm install
```

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_BASE_URL=http://localhost:5000
```

Run the backend separately. This variable points to its base URL; do not include `/api/v1`.

Start the frontend:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Login Credentials

| Role    | Email              | Password     |
| ------- | ------------------ | ------------ |
| Student | student1@gmail.com | St11223344?  |
| Mentor  | mentor@gmail.com   | Me11223344?  |
| Admin   | admin@gmail.com    | Ae11223344?  |

The login page provides demo account autofill for each role. Select a role, autofill the credentials, then select Sign In. These accounts must exist in the connected backend.

## Key Features

**Student**

- Register and sign in.
- Submit projects; edit or delete owned submissions while pending.
- Track submission status from a personal dashboard.

**Mentor**

- View submission statistics and search or filter the review queue.
- Approve or reject pending projects, add feedback, and view review history.
- View Student profiles and manage Student accounts.

**Admin**

- View dashboard statistics and audit activity.
- Create Mentor and Admin accounts, manage users, and assign roles.
- Review projects and browse submission history.

## Live Application & Backend

- [Live application](https://project-submission.iblossomlearn.org)
- [Backend API](https://api-project-submission.iblossomlearn.org)

The backend runs as a separate service. Its GitHub repository URL is not listed in this frontend project.
