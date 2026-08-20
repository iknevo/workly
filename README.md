# Workly

NOTE: this is totally generated AI slop

A job application tracker with AI-powered resume tailoring, email integration, and calendar scheduling.

## Features

- **Application Pipeline** — Track jobs through Draft → Applied → Interviewing → Offer → Rejected → Withdrawn
- **LaTeX Resumes** — Store, edit, and compile resumes to PDF via TexAPI
- **AI Resume Tailoring** — Automatically rewrite resumes to match job descriptions using Groq AI
- **Email Integration** — Connect IMAP accounts (Gmail, Yahoo, iCloud) and auto-match recruiter emails to applications
- **Calendar** — Schedule interviews, follow-ups, deadlines, and other events with FullCalendar
- **Dashboard** — Overview of pipeline stats, upcoming events, and profile completeness

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, shadcn/ui, Tailwind CSS v4 |
| API | tRPC, TanStack React Query |
| Database | PostgreSQL (Neon), Drizzle ORM |
| Auth | Clerk |
| AI | Groq API (Vercel AI SDK) |
| Email | imapflow (IMAP) |
| Calendar | FullCalendar |
| Rate Limiting | Upstash Redis |
| Validation | Zod |
| Forms | react-hook-form |
| Package Manager | Bun |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (package manager)
- Node.js 20+
- A [Neon](https://neon.tech/) PostgreSQL database
- A [Clerk](https://clerk.com/) account

### Install

```bash
bun install
```

### Environment Setup

```bash
cp .env.example .env
```

Fill in the required variables in `.env` (see [Environment Variables](#environment-variables) below).

### Database

```bash
bun run db:push
```

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

To test Clerk webhooks locally (requires [ngrok](https://ngrok.com/)):

```bash
bun run dev:all
```

Then update the ngrok URL in `package.json` and configure the webhook in your Clerk dashboard pointing to `POST /api/users/webhook`.

## Available Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start Next.js dev server |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run format` | Format with Prettier |
| `bun run typecheck` | TypeScript type checking |
| `bun run db:push` | Push Drizzle schema to database |
| `bun run db:studio` | Open Drizzle Studio (DB browser) |
| `bun run dev:all` | Dev server + ngrok for webhooks |

## Project Structure

```
workly/
├── app/                    # Next.js App Router pages & API routes
│   ├── (auth)/             # Sign-in / Sign-up pages
│   ├── (app)/              # Authenticated app pages
│   │   ├── dashboard/      # Overview dashboard
│   │   ├── applications/   # Job application CRUD + detail tabs
│   │   ├── resumes/        # LaTeX resume management
│   │   ├── calendar/       # Event scheduling
│   │   ├── profile/        # Profile editor
│   │   └── settings/       # API keys, email accounts, theme
│   └── api/                # tRPC handler + Clerk webhook
├── components/ui/          # shadcn/ui components
├── config/                 # Environment variable config
├── db/                     # Drizzle schema & client
├── hooks/                  # Custom React hooks
├── lib/                    # Server utilities (AI, email, encryption, LaTeX)
├── modules/                # Feature modules (server procedures + UI)
│   ├── applications/
│   ├── resumes/
│   ├── events/
│   ├── mail/
│   ├── profile/
│   ├── dashboard/
│   ├── settings/
│   └── users/
└── trpc/                   # tRPC setup (init, routers, client/server helpers)
```

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk webhook verification secret |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route (e.g. `/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route (e.g. `/sign-up`) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Post-sign-in redirect (e.g. `/`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Post-sign-up redirect (e.g. `/`) |

### Optional

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | App base URL (for tRPC client) |
| `GROQ_API_KEY` | Server-side Groq API key for AI resume tailoring |
| `ENCRYPTION_KEY` | Base64-encoded 32-byte key for AES-256-GCM (required for email integration) |
| `TEXAPI_KEY` | TexAPI key for LaTeX-to-PDF compilation |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |

## Deployment

Workly is built for serverless deployment (e.g. Vercel) with Neon's serverless PostgreSQL driver.

1. Set all required environment variables in your hosting platform
2. Run `bun run db:push` to apply the schema to your database
3. Configure the Clerk webhook endpoint to `POST /api/users/webhook` pointing to your production URL
4. Build and deploy:

```bash
bun run build
bun run start
```

## License

MIT
