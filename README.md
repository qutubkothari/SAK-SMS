# SAK AI Enquiry Handler

Monorepo with:
- API: Node.js + TypeScript (Express) + Prisma (Postgres)
- Web: React + Vite + TypeScript
- Infra: Docker Compose (Postgres + Redis)

## Prerequisites
- Node.js 20+
- Docker Desktop

## First run
1. Start DB services:
   - `npm run db:up`
   - Make sure Docker Desktop is running (Engine ready).
2. Install dependencies:
   - `npm install`
3. Configure API env:
   - Copy `apps/api/.env.example` to `apps/api/.env`
4. Create DB schema:
   - `npm run prisma:migrate -w @sak/api`
5. Start API:
   - `npm run dev:api`
6. Start Web:
   - `npm run dev:web`

## Demo data
- Open http://localhost:5173/
- Use **Bootstrap tenant** to create a tenant + manager
- Use **Seed demo data** to create 5 salesmen + sample leads + triage items

## AI provider
- Default is `MOCK`.
- To enable OpenAI for triage + draft replies, set in `apps/api/.env`:
   - `AI_PROVIDER=OPENAI`
   - `OPENAI_API_KEY=...`
   - Optional: `OPENAI_MODEL=gpt-4o-mini`

## Notes
- Multi-tenant is enforced via `x-tenant-id` request header for now (dev mode). This will be upgraded to tenant-scoped JWT.
