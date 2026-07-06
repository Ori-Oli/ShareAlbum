# Share Album

공유앨범과 AI 태그 작성을 위한 TypeScript 모노레포입니다.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript
- Database: PostgreSQL via Supabase
- ORM: Prisma
- Package manager: pnpm

## Apps

- `apps/web`: Next.js web app
- `apps/api`: NestJS API server
- `packages/shared`: shared TypeScript types

## Getting Started

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm dev
```

Frontend runs on `http://localhost:3000`.
API runs on `http://localhost:4000/api`.

## Supabase

Local Supabase requires Docker or a compatible container runtime.

```bash
pnpm supabase:start
```

Use the generated local API keys to update `.env`.

## Useful Commands

```bash
pnpm dev:web
pnpm dev:api
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

## Database Models

Initial database tables are defined in `apps/api/prisma/schema.prisma`.

- `users`: Kakao/Naver login user profile
- `groups`: shared group with an invite code
- `group_members`: users invited into a group
- `albums`: albums owned by a user and optionally attached to a group

After setting real Supabase values in `.env.local`, apply the migration and regenerate Prisma Client:

```bash
pnpm db:migrate
pnpm db:generate
```
