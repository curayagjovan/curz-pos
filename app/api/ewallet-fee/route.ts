import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EWALLET_FEE_SETTINGS } from "@/lib/ewallet-fee";

const SETTINGS_ID = "ewallet-fee";

function serialize(record: {
  tier1Max: number;
  tier1Fee: number;
  tier2Max: number;
  tier2Fee: number;
  tier3Fee: number;
}) {
  return {
    tier1Max: record.tier1Max,
    tier1Fee: record.tier1Fee,
    tier2Max: record.tier2Max,
    tier2Fee: record.tier2Fee,
    tier3Fee: record.tier3Fee,
  };
}

export async function GET() {
  const record = await prisma.eWalletFeeSetting.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (!record) {
    return NextResponse.json(DEFAULT_EWALLET_FEE_SETTINGS);
  }

  return NextResponse.json(serialize(record));
}

export async function PUT(request: Request) {
  const body = await request.json();

  const tier1Max = Number(body.tier1Max);
  const tier1Fee = Number(body.tier1Fee);
  const tier2Max = Number(body.tier2Max);
  const tier2Fee = Number(body.tier2Fee);
  const tier3Fee = Number(body.tier3Fee);

  const isValid =
    [tier1Max, tier1Fee, tier2Max, tier2Fee, tier3Fee].every(
      Number.isFinite,
    ) &&
    tier1Max > 0 &&
    tier2Max > tier1Max &&
    tier1Fee >= 0 &&
    tier2Fee >= 0 &&
    tier3Fee >= 0;

  if (!isValid) {
    return NextResponse.json(
      { message: "Invalid fee settings" },
      { status: 400 },
    );
  }

  const record = await prisma.eWalletFeeSetting.upsert({
    where: { id: SETTINGS_ID },
    update: { tier1Max, tier1Fee, tier2Max, tier2Fee, tier3Fee },
    create: {
      id: SETTINGS_ID,
      tier1Max,
      tier1Fee,
      tier2Max,
      tier2Fee,
      tier3Fee,
    },
  });

  return NextResponse.json(serialize(record));
}
