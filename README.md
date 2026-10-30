# Workly

Workly is a job-application workspace for managing the full process from discovering an opportunity to preparing a tailored resume, scheduling interviews, and tracking the final outcome.

It combines a structured application pipeline with resume tooling, AI-assisted tailoring, recruiter email matching, interview scheduling, and a profile editor. The project is designed as a server-backed application rather than a simple CRUD dashboard: authentication, typed procedures, encrypted credentials, rate limiting, and external integrations are all part of the architecture.

## Features

- **Application pipeline** with Draft, Applied, Interviewing, Offer, Rejected, and Withdrawn states
- Application details with overview, timeline, linked resume, and recruiter email tabs
- **Resume management** with editable LaTeX source, rendered PDF output, and resume-to-application linking
- **AI resume tailoring** that adapts resume content to a job description through Groq and the Vercel AI SDK
- **Email integration** for IMAP accounts, recruiter-message matching, and application-linked email history
- **Calendar** for interviews, follow-ups, deadlines, offers, and other events
- Dashboard with pipeline statistics and upcoming activity
- Profile editor for basics, experience, education, skills, projects, and links
- Secure storage for connected email credentials using AES-256-GCM encryption
- Optional Upstash Redis rate limiting for sensitive operations

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, React Hook Form |
| API | tRPC, TanStack Query, Zod |
| Database | PostgreSQL with Neon and Drizzle ORM |
| Authentication | Clerk |
| AI | Groq through the Vercel AI SDK |
| Email | IMAP via imapflow and mailparser |
| Documents | LaTeX compilation through TexAPI, PDF generation with jsPDF |
| Calendar | FullCalendar |
| Infrastructure | Upstash Redis, Clerk webhooks, optional ngrok |
| Package manager | Bun |

## Getting started

### Prerequisites

- Node.js 20 or newer
- [Bun](https://bun.sh/)
- A PostgreSQL database, such as [Neon](https://neon.tech/)
- A [Clerk](https://clerk.com/) application

### Installation

```bash
git clone https://github.com/iknevo/workly.git
cd workly
bun install
cp .env.example .env
```

Fill in the required environment variables, push the database schema, and start the app:

```bash
bun run db:push
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

### Required

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client-side Clerk key |
| `CLERK_SECRET_KEY` | Server-side Clerk key |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Verifies Clerk user webhooks |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Sign-in fallback destination |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Sign-up fallback destination |
| `DATABASE_URL` | PostgreSQL connection string |

### Optional integrations

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public application URL |
| `GROQ_API_KEY` | AI resume tailoring |
| `ENCRYPTION_KEY` | Base64-encoded 32-byte AES-256-GCM key for email credentials |
| `TEXAPI_KEY` | LaTeX-to-PDF compilation |
| `UPSTASH_REDIS_REST_URL` | Redis endpoint for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Redis authentication token |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google calendar/email integration credentials |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |

Integrations that are not configured remain unavailable; the core application still requires Clerk and PostgreSQL.

## Available scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start the Next.js development server |
| `bun run dev:all` | Start the app and the configured ngrok webhook tunnel |
| `bun run build` | Create a production build |
| `bun run start` | Start the production server |
| `bun run lint` | Run ESLint |
| `bun run typecheck` | Run TypeScript checks |
| `bun run format` | Format TypeScript and TSX files |
| `bun run db:push` | Apply the Drizzle schema to PostgreSQL |
| `bun run db:studio` | Open Drizzle Studio |

## Project structure

```text
app/
├── (auth)/              # Clerk sign-in and sign-up routes
├── (app)/               # Authenticated dashboard and feature pages
└── api/                 # tRPC handler and Clerk webhook
modules/
├── applications/        # Pipeline, details, timeline, email, and resume tabs
├── dashboard/           # Overview metrics and activity
├── events/              # Calendar events
├── mail/                # Email browsing and matching
├── profile/             # Profile editor
├── resumes/             # LaTeX resume creation and editing
└── users/               # User provisioning and profile procedures
lib/
├── ai.ts                # AI resume-tailoring helpers
├── email-matching.ts    # Recruiter email matching
├── encryption.ts        # Credential encryption
├── imap.ts              # IMAP access
├── latex.ts             # LaTeX compilation integration
└── rate-limit.ts        # Optional Redis-backed rate limiting
```

## Architecture notes

Workly uses tRPC procedures as the typed boundary between the Next.js UI and server logic. Drizzle models the application domain in PostgreSQL, while feature-specific procedures and UI modules keep applications, resumes, events, mail, and profiles independently maintainable.

External credentials are never intended to be stored as plaintext: email credentials are encrypted before persistence, and optional rate limiting protects expensive or sensitive operations. Clerk webhooks keep the local user record synchronized with authentication events.

## Deployment

Workly can be deployed to a serverless host such as Vercel with Neon PostgreSQL:

1. Configure the required environment variables in the host.
2. Apply the schema with `bun run db:push`.
3. Point the Clerk webhook to `POST /api/users/webhook`.
4. Build with `bun run build` and deploy.

## License

MIT
