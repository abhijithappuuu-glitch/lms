# SDMCET LMS — Backend (Phase 1)

NestJS 11 + Prisma 6 + PostgreSQL 16.

## Quick start

```powershell
docker compose up -d          # from repo root: Postgres on :5432
cd backend
copy .env.example .env        # first time only
npm install
npm run db:deploy             # apply migrations
npm run db:seed               # idempotent
npm run verify:phase1         # RBAC + ledger guarantees (rolls back, writes nothing)
npm run start:dev             # http://localhost:3000/api/health
```

Seeded accounts use `SEED_DEFAULT_PASSWORD` and `@sdmcet.test` emails:
`admin@`, `secretary@`, `principal@`, `dean.academics@`, `hod.<dept>@`,
`faculty1.cse@`, `faculty2.cse@`, `labinstructor.cse@` (same for `ece`).

## Database-enforced guarantees

Defined in `prisma/migrations/*_ledger_integrity_constraints` (Prisma Migrate ignores
triggers/CHECKs, so they are not dropped by later migrations):

| Guarantee | Mechanism |
|---|---|
| Ledger is append-only | `BEFORE UPDATE/DELETE/TRUNCATE` trigger |
| Valid types and amount sign | CHECK constraints |
| One DEBIT per application | `BEFORE INSERT` trigger (SQLSTATE 23505 → Prisma P2002) |
| No overlapping effective-dated policies | `BEFORE INSERT/UPDATE` trigger on `LeavePolicy` |

Balance = `SUM(CREDIT) + SUM(REVERSAL) + SUM(ADJUSTMENT) − SUM(DEBIT)` — see `src/ledger/ledger.service.ts`.

> ⚠ Seeded leave policy values are illustrative placeholders. Replace them with SDMCET-approved rules before go-live.
