import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EWALLET_FEE_SETTINGS } from "@/lib/ewallet-fee";

const SETTINGS_ID = "ewallet-fee";

function serialize(record: {
  tier1Fee: number;
  tier2Fee: number;
  tier3Fee: number;
  tier4Fee: number;
  stepFee: number;
}) {
  return {
    tier1Fee: record.tier1Fee,
    tier2Fee: record.tier2Fee,
    tier3Fee: record.tier3Fee,
    tier4Fee: record.tier4Fee,
    stepFee: record.stepFee,
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

  const tier1Fee = Number(body.tier1Fee);
  const tier2Fee = Number(body.tier2Fee);
  const tier3Fee = Number(body.tier3Fee);
  const tier4Fee = Number(body.tier4Fee);
  const stepFee = Number(body.stepFee);

  const fees = [tier1Fee, tier2Fee, tier3Fee, tier4Fee, stepFee];
  const isValid = fees.every((fee) => Number.isFinite(fee) && fee >= 0);

  if (!isValid) {
    return NextResponse.json(
      { message: "Invalid fee settings" },
      { status: 400 },
    );
  }

  const record = await prisma.eWalletFeeSetting.upsert({
    where: { id: SETTINGS_ID },
    update: { tier1Fee, tier2Fee, tier3Fee, tier4Fee, stepFee },
    create: {
      id: SETTINGS_ID,
      tier1Fee,
      tier2Fee,
      tier3Fee,
      tier4Fee,
      stepFee,
    },
  });

  return NextResponse.json(serialize(record));
}
