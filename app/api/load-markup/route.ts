import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOAD_MARKUP_SETTINGS } from "@/lib/load-markup";
import { requirePermission, requireUser } from "@/lib/auth/require-user";
import { AUDIT_ACTIONS, diffFields, recordAudit } from "@/lib/audit";

const SETTINGS_ID = "load-markup";

function serialize(record: {
  tier1Max: number;
  tier1Markup: number;
  tier2Max: number;
  tier2Markup: number;
  tier3Markup: number;
}) {
  return {
    tier1Max: record.tier1Max,
    tier1Markup: record.tier1Markup,
    tier2Max: record.tier2Max,
    tier2Markup: record.tier2Markup,
    tier3Markup: record.tier3Markup,
  };
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth.response;
  }

  const record = await prisma.loadMarkupSetting.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (!record) {
    return NextResponse.json(DEFAULT_LOAD_MARKUP_SETTINGS);
  }

  return NextResponse.json(serialize(record));
}

export async function PUT(request: Request) {
  const auth = await requirePermission("MANAGE_LOAD_ITEMS");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();

  const tier1Max = Number(body.tier1Max);
  const tier1Markup = Number(body.tier1Markup);
  const tier2Max = Number(body.tier2Max);
  const tier2Markup = Number(body.tier2Markup);
  const tier3Markup = Number(body.tier3Markup);

  const isValid =
    [tier1Max, tier1Markup, tier2Max, tier2Markup, tier3Markup].every(
      Number.isFinite,
    ) &&
    tier1Max > 0 &&
    tier2Max > tier1Max &&
    tier1Markup >= 0 &&
    tier2Markup >= 0 &&
    tier3Markup >= 0;

  if (!isValid) {
    return NextResponse.json(
      { message: "Invalid markup settings" },
      { status: 400 },
    );
  }

  const existingRecord = await prisma.loadMarkupSetting.findUnique({
    where: { id: SETTINGS_ID },
  });

  const record = await prisma.loadMarkupSetting.upsert({
    where: { id: SETTINGS_ID },
    update: { tier1Max, tier1Markup, tier2Max, tier2Markup, tier3Markup },
    create: {
      id: SETTINGS_ID,
      tier1Max,
      tier1Markup,
      tier2Max,
      tier2Markup,
      tier3Markup,
    },
  });

  const changes = diffFields(
    existingRecord ? serialize(existingRecord) : DEFAULT_LOAD_MARKUP_SETTINGS,
    { tier1Max, tier1Markup, tier2Max, tier2Markup, tier3Markup },
  );

  if (Object.keys(changes).length > 0) {
    await recordAudit({
      actor: auth.appUser,
      action: AUDIT_ACTIONS.SETTINGS_UPDATE,
      entityType: "LoadMarkupSetting",
      entityId: SETTINGS_ID,
      summary: "Updated load markup settings",
      changes,
    });
  }

  return NextResponse.json(serialize(record));
}
