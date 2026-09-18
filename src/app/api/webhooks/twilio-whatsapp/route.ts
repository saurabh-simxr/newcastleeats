import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { db } from "@/lib/db";
import { users, orders, restaurants, type OrderStatus } from "@/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { phoneDigits } from "@/lib/phone";
import { applyOwnerStatusChange, type OwnerOrderStatus } from "@/services/order-status.service";

// Maps a tapped Quick-Reply button id (see src/config/whatsapp-templates.ts) to the
// order status it should move the *owner's* order into, and which order status it
// must currently be in for the button to make sense.
const BUTTON_ACTIONS: Record<string, { from: OrderStatus[]; to: OwnerOrderStatus; replyOk: string; replyFail: string }> = {
  accept:        { from: ["PENDING_CONFIRMATION"], to: "CONFIRMED",  replyOk: "✅ Order accepted. Customer has been notified to pay.", replyFail: "⚠️ Could not accept — order may have already been actioned." },
  decline:       { from: ["PENDING_CONFIRMATION"], to: "CANCELLED",  replyOk: "❌ Order declined. Customer has been notified.",        replyFail: "⚠️ Could not decline — order may have already been actioned." },
  start_kitchen: { from: ["PAID"],                  to: "PREPARING", replyOk: "👨‍🍳 Kitchen started. Customer has been notified.",       replyFail: "⚠️ Could not start — order may have already been actioned." },
};

function twiml(message?: string) {
  const body = message ? `<Message>${escapeXml(message)}</Message>` : "";
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);

  // ── Verify this request actually came from Twilio ──────────────────────────
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-whatsapp`;
  const paramsObj = Object.fromEntries(params.entries());

  if (!authToken || !twilio.validateRequest(authToken, signature, url, paramsObj)) {
    console.warn("[twilio-whatsapp] Invalid signature — rejecting.");
    return new NextResponse("Forbidden", { status: 403 });
  }

  const from = (params.get("From") ?? "").replace("whatsapp:", "");
  const buttonPayload = params.get("ButtonPayload") ?? "";
  const body = params.get("Body") ?? "";

  console.log("💬 Inbound WhatsApp:", { from, buttonPayload, body });

  if (!buttonPayload || !BUTTON_ACTIONS[buttonPayload]) {
    // Free-form text reply, or a button we don't act on — just log it.
    return twiml();
  }

  const action = BUTTON_ACTIONS[buttonPayload];
  const fromDigits = phoneDigits(from);

  // Find the owner who owns the restaurant(s) this WhatsApp number belongs to.
  const [owner] = await db
    .select({ id: users.id, phone: users.phone })
    .from(users)
    .where(and(eq(users.role, "owner")))
    .then((rows) => rows.filter((r) => phoneDigits(r.phone) === fromDigits));

  if (!owner) {
    console.warn(`[twilio-whatsapp] No owner found for phone ${from}`);
    return twiml();
  }

  const ownedRestaurants = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.ownerId, owner.id));

  if (ownedRestaurants.length === 0) {
    return twiml();
  }

  // Most recent order in the expected status, across this owner's restaurants —
  // quick-reply buttons don't carry the order id, so we act on the latest
  // matching order (in practice the owner has one active order at a time).
  const [targetOrder] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(
      inArray(orders.restaurantId, ownedRestaurants.map((r) => r.id)),
      inArray(orders.status, action.from)
    ))
    .orderBy(desc(orders.createdAt))
    .limit(1);

  if (!targetOrder) {
    return twiml("⚠️ No matching order found to action — it may already be handled.");
  }

  const result = await applyOwnerStatusChange({
    orderId: targetOrder.id,
    ownerId: owner.id,
    nextStatus: action.to,
  });

  return twiml(result.ok ? action.replyOk : action.replyFail);
}
