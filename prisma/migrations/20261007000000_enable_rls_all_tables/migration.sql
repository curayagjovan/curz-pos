-- Enable Row Level Security on every public table.
--
-- All app data access goes through Prisma using the `postgres` role (see
-- DATABASE_URL/DIRECT_URL), which has BYPASSRLS, so this has no effect on
-- the app itself. Without it, Supabase's PostgREST Data API exposes these
-- tables to the `anon`/`authenticated` roles (and thus the public anon
-- key) with no row-level checks. No policies are added, since nothing
-- should be querying these tables through the Data API at all.

ALTER TABLE "public"."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BundleTier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InventoryMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ImportLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LoadMarkupSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EWalletFeeSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LoadItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SmsRecipientSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AppUser" ENABLE ROW LEVEL SECURITY;
