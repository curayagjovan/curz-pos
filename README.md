## Curz POS Starter

A modern POS starter built with:

- Next.js (App Router) + React
- Tailwind CSS
- Prisma ORM
- Supabase (Postgres + optional auth/data APIs)
- Vercel deployment

## What is included

- Minimal home page in `app/page.tsx`
- Tailwind + light/dark theme token setup in `app/globals.css`
- Prisma schema for products, orders, and order items in `prisma/schema.prisma`
- Product API endpoint in `app/api/products/route.ts`
- Shared Prisma client in `lib/prisma.ts`
- Supabase client helpers in `lib/supabase/client.ts` and `lib/supabase/server.ts`
- Seed script in `prisma/seed.ts`

## 1. Install dependencies

```bash
npm install
```

## 2. Configure Supabase

1. Create a free project at https://supabase.com.
2. In Supabase, get:
   - Project URL
   - Anon key
   - Service role key
   - Database password
3. Copy `.env.example` to `.env` and fill in all values.

## 3. Create database tables from Prisma

```bash
npm run prisma:generate
npm run db:push
npm run db:seed
```

If you prefer migrations instead of `db push`, use:

```bash
npm run prisma:migrate
```

## 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000.

## 5. Deploy free on Vercel

1. Push this repo to GitHub.
2. Create a free account at https://vercel.com.
3. Import the repository in Vercel.
4. Add environment variables in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `DIRECT_URL`
5. Deploy.

For production, run Prisma migrations from a trusted environment (CI or local) rather than at request time.

## Useful scripts

```bash
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run db:push
npm run db:seed
npm run prisma:studio
```
