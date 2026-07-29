import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SMS_RECIPIENT,
  isValidSmsRecipient,
  normalizeSmsRecipient,
} from "@/lib/sms-link";
import { requireOwner } from "@/lib/auth/require-user";

const SETTINGS_ID = "sms-recipient";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) {
    return auth.response;
  }

  const record = await prisma.smsRecipientSetting.findUnique({
    where: { id: SETTINGS_ID },
  });

  return NextResponse.json({ number: record?.number ?? DEFAULT_SMS_RECIPIENT });
}

export async function PUT(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const number = normalizeSmsRecipient(String(body.number ?? ""));

  if (number.length > 0 && !isValidSmsRecipient(number)) {
    return NextResponse.json(
      { message: "Enter a valid mobile number or access number" },
      { status: 400 },
    );
  }

  const record = await prisma.smsRecipientSetting.upsert({
    where: { id: SETTINGS_ID },
    update: { number },
    create: { id: SETTINGS_ID, number },
  });

  return NextResponse.json({ number: record.number });
}
