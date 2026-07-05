import { NextResponse } from "next/server";
import {
  removePushSubscriptionByEndpoint,
  upsertPushSubscription,
} from "@/lib/push-notifications";

type UpsertPushSubscriptionPayload = {
  subscription?: {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
  userAgent?: string;
};

type RemovePushSubscriptionPayload = {
  endpoint?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpsertPushSubscriptionPayload;

    if (!body.subscription?.endpoint) {
      return NextResponse.json(
        { message: "Missing push subscription endpoint" },
        { status: 400 },
      );
    }

    const saved = await upsertPushSubscription({
      subscription: body.subscription,
      userAgent: body.userAgent,
    });

    if (!saved) {
      return NextResponse.json(
        { message: "Invalid push subscription" },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to save push subscription", error);
    return NextResponse.json(
      { message: "Unable to save push subscription" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as RemovePushSubscriptionPayload;
    await removePushSubscriptionByEndpoint(body.endpoint);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to remove push subscription", error);
    return NextResponse.json(
      { message: "Unable to remove push subscription" },
      { status: 500 },
    );
  }
}
