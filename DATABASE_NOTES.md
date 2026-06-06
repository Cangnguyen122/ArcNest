# Dogecord Database Direction

Dogecord is moving from the old MongoDB-oriented schema to PostgreSQL through Prisma.

## Why PostgreSQL

- Wallet identity, access passes, payments, sessions, servers, members, and messages are relational data.
- Unique constraints and compound indexes are important for wallet ownership and payment transaction hashes.
- Access control queries are easier to reason about with relational integrity.
- PostgreSQL gives a cleaner production path for migrations, backups, and audit trails.

## Current Status

- `prisma/schema.prisma` now uses `provider = "postgresql"`.
- The legacy chat models are still present so the existing app can continue to compile.
- New Web3 models have been added: `Wallet`, `WalletAuthChallenge`, `WalletSession`, `AccessPass`, and `Payment`.
- Clerk has been replaced by first-party wallet sessions stored in `WalletSession`.
- Existing MongoDB data is not migrated automatically.

## Local Test Setup

Use a local PostgreSQL database or a hosted test database, then set:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dogecord
```

After changing the URL, run:

```powershell
npx.cmd prisma generate
npx.cmd prisma db push
```

Use `db push` only for local/test iteration. For production, use a reviewed Prisma migration flow.
