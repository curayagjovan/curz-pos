import webpush from "web-push";
import { prisma } from "@/lib/prisma";

type PushKeys = {
  p256dh?: string;
  auth?: string;
};

type PushSubscriptionInput = {
  endpoint?: string;
  keys?: PushKeys;
};

type CheckoutPushPayload = {
  orderNo: string;
  total: number;
  change: number;
  excludeEndpoint?: string | null;
};

type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

const prismaWithPush = prisma as typeof prisma & {
  pushSubscription: {
    upsert: (args: unknown) => Promise<unknown>;
    deleteMany: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<StoredPushSubscription[]>;
    update: (args: unknown) => Promise<unknown>;
  };
};

let vapidConfigured = false;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

function hasVapidConfig() {
  return Boolean(
    process.env.VAPID_SUBJECT &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY,
  );
}

function configureVapidIfNeeded() {
  if (vapidConfigured || !hasVapidConfig()) {
    return;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
  vapidConfigured = true;
}

function normalizePushSubscription(input: PushSubscriptionInput) {
  const endpoint = input.endpoint?.trim();
  const p256dh = input.keys?.p256dh?.trim();
  const auth = input.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    keys: { p256dh, auth },
  };
}

export async function upsertPushSubscription(params: {
  subscription: PushSubscriptionInput;
  userAgent?: string;
}) {
  const normalized = normalizePushSubscription(params.subscription);
  if (!normalized) {
    return null;
  }

  return prismaWithPush.pushSubscription.upsert({
    where: { endpoint: normalized.endpoint },
    create: {
      endpoint: normalized.endpoint,
      p256dh: normalized.keys.p256dh,
      auth: normalized.keys.auth,
      userAgent: params.userAgent?.slice(0, 255) || null,
    },
    update: {
      p256dh: normalized.keys.p256dh,
      auth: normalized.keys.auth,
      userAgent: params.userAgent?.slice(0, 255) || null,
      failCount: 0,
      lastFailureAt: null,
    },
  });
}

export async function removePushSubscriptionByEndpoint(endpoint?: string) {
  const normalized = endpoint?.trim();
  if (!normalized) {
    return;
  }

  await prismaWithPush.pushSubscription.deleteMany({
    where: { endpoint: normalized },
  });
}

export async function sendCheckoutSuccessPush(payload: CheckoutPushPayload) {
  if (!hasVapidConfig()) {
    return;
  }

  configureVapidIfNeeded();

  const subscriptions = await prismaWithPush.pushSubscription.findMany({
    select: {
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  const targetSubscriptions = payload.excludeEndpoint
    ? subscriptions.filter(
        (subscription) => subscription.endpoint !== payload.excludeEndpoint,
      )
    : subscriptions;

  if (targetSubscriptions.length === 0) {
    return;
  }

  const bodyParts = [
    `Order ${payload.orderNo} completed`,
    `Total: ${formatCurrency(payload.total)}`,
    payload.change > 0 ? `Change: ${formatCurrency(payload.change)}` : null,
  ].filter(Boolean);

  const notificationPayload = JSON.stringify({
    title: "Checkout successful",
    body: bodyParts.join(" • "),
    tag: "checkout-success",
    icon: "/pwa-icon.svg",
    badge: "/pwa-icon.svg",
    data: { url: "/" },
  });

  await Promise.all(
    targetSubscriptions.map(async (subscription: StoredPushSubscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notificationPayload,
        );

        await prismaWithPush.pushSubscription.update({
          where: { endpoint: subscription.endpoint },
          data: {
            failCount: 0,
            lastFailureAt: null,
            lastSuccessAt: new Date(),
          },
        });
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof (error as { statusCode?: unknown }).statusCode === "number"
            ? ((error as { statusCode: number }).statusCode ?? 0)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await prismaWithPush.pushSubscription.deleteMany({
            where: { endpoint: subscription.endpoint },
          });
          return;
        }

        await prismaWithPush.pushSubscription.update({
          where: { endpoint: subscription.endpoint },
          data: {
            failCount: { increment: 1 },
            lastFailureAt: new Date(),
          },
        });
      }
    }),
  );
}
