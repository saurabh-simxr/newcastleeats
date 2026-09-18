import { db } from "@/lib/db";
import { orders, restaurants, orderItems, menuItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NotificationService } from "@/services/notification.service";
import { syncSessionStatus } from "@/lib/order-session";
import { trackOrderMetric } from "@/lib/metrics";

export type OwnerOrderStatus = "CONFIRMED" | "PREPARING" | "DISPATCH_REQUESTED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

export const OWNER_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: [], // locked — only auto-cancel via cron if customer doesn't pay in 5 min
  PAID: ["PREPARING"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED"],
  DISPATCH_REQUESTED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

type Result =
  | { ok: true; order: typeof orders.$inferSelect }
  | { ok: false; error: string; statusCode: number };

/**
 * Applies an owner-initiated order status change, with the same ownership check,
 * transition validation, metric tracking, and notification fan-out used by the
 * owner dashboard PATCH endpoint. Shared so WhatsApp button replies (webhook) and
 * the dashboard API can't drift out of sync.
 */
export async function applyOwnerStatusChange(params: {
  orderId: string;
  ownerId: string;
  nextStatus: OwnerOrderStatus;
}): Promise<Result> {
  const { orderId, ownerId, nextStatus } = params;

  const [ownedOrder] = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      restaurantId: orders.restaurantId,
      totalAmount: orders.totalAmount,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(and(eq(orders.id, orderId), eq(restaurants.ownerId, ownerId)))
    .limit(1);

  if (!ownedOrder) {
    return { ok: false, error: "Order not found or you don't have permission to manage it.", statusCode: 403 };
  }

  if (ownedOrder.status === nextStatus) {
    return { ok: true, order: ownedOrder as typeof orders.$inferSelect };
  }

  const allowedNextStatuses = OWNER_ALLOWED_TRANSITIONS[ownedOrder.status] ?? [];
  if (!allowedNextStatuses.includes(nextStatus)) {
    return { ok: false, error: `Cannot change order from ${ownedOrder.status} to ${nextStatus}.`, statusCode: 409 };
  }

  const now = new Date();
  const [updated] = await db
    .update(orders)
    .set({
      status: nextStatus,
      updatedAt: now,
      ...(nextStatus === "CONFIRMED" && { confirmedAt: now }),
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, ownedOrder.status)))
    .returning();

  if (!updated) {
    return { ok: false, error: "Order status has changed or order not found. Please refresh and try again.", statusCode: 409 };
  }

  void (async () => {
    if (nextStatus === "CONFIRMED") void trackOrderMetric(orderId, { confirmedAt: now });
    else if (nextStatus === "PREPARING") void trackOrderMetric(orderId, { kitchenStartedAt: now });
    else if (nextStatus === "OUT_FOR_DELIVERY" || nextStatus === "DISPATCH_REQUESTED") void trackOrderMetric(orderId, { dispatchedAt: now });
    else if (nextStatus === "DELIVERED") void trackOrderMetric(orderId, { deliveredAt: now });
    else if (nextStatus === "CANCELLED") void trackOrderMetric(orderId, { cancelledAt: now, cancellationReason: "owner_rejected" });
  })();

  let restaurantName = "restaurant";
  try {
    const [restaurantInfo] = await db
      .select({ name: restaurants.name })
      .from(restaurants)
      .where(eq(restaurants.id, ownedOrder.restaurantId))
      .limit(1);
    if (restaurantInfo) restaurantName = restaurantInfo.name;
  } catch (dbErr) {
    console.error("[order-status.service] Failed to fetch restaurant name:", dbErr);
  }

  const STATUS_LABELS: Record<string, { subject: string; body: (id: string, restaurant: string) => string }> = {
    PENDING_CONFIRMATION: { subject: "Order Received", body: (id, r) => `Your order #${id} from ${r} has been received and is pending confirmation.` },
    PAID: { subject: "Payment Confirmed", body: (id, r) => `Your payment for order #${id} at ${r} was successful. The restaurant will start preparing it soon.` },
    CONFIRMED: { subject: "Order Confirmed", body: (id, r) => `Restaurant confirmed your order #${id} at ${r}. It's now in the kitchen!` },
    PREPARING: { subject: "Kitchen is Cooking", body: (id, r) => `Your order #${id} at ${r} is in the kitchen and being prepared.` },
    DISPATCH_REQUESTED: { subject: "Order Dispatched", body: (id, r) => `Your order #${id} from ${r} is now dispatched!` },
    OUT_FOR_DELIVERY: { subject: "On the Way", body: (id, r) => `Your order #${id} from ${r} is now out for delivery.` },
    DELIVERED: { subject: "Delivered", body: (id, r) => `Congratulations! Your order #${id} from ${r} is successfully delivered. Enjoy!` },
    CANCELLED: { subject: "Order Cancelled", body: (id, r) => `Your order #${id} from ${r} has been cancelled.` },
  };

  try {
    if (ownedOrder.userId) {
      const label = STATUS_LABELS[nextStatus] ?? {
        subject: "Order Update",
        body: (oid: string, r: string) => `Your order #${oid} from ${r} is now ${nextStatus.toLowerCase().replace(/_/g, " ")}.`,
      };
      await NotificationService.dispatchOrderNotifications({
        userId: ownedOrder.userId,
        type: "ORDER",
        subject: label.subject,
        body: label.body(orderId.slice(0, 8), restaurantName),
        metadata: {
          orderId,
          orderStatus: nextStatus,
          targetRole: "customer",
          ...(nextStatus === "CANCELLED" && { cancellationReason: "Declined by the restaurant" }),
        },
        channels: ["FCM", "WHATSAPP"],
      });
    }
  } catch (notifyCustomerErr) {
    console.error("[order-status.service] Failed to notify customer:", notifyCustomerErr);
  }

  void (async () => {
    try {
      if (updated.sessionId && (nextStatus === "CONFIRMED" || nextStatus === "CANCELLED")) {
        await syncSessionStatus(updated.sessionId);
      }
    } catch (syncErr) {
      console.error("[order-status.service] syncSessionStatus failed:", syncErr);
    }

    try {
      if (nextStatus === "OUT_FOR_DELIVERY") {
        const { ShipdayService } = await import("@/services/shipday.service");
        await ShipdayService.triggerShipdayOrder(orderId, "OUT_FOR_DELIVERY");
      } else if (nextStatus === "DELIVERED" || nextStatus === "CANCELLED") {
        const { ShipdayService } = await import("@/services/shipday.service");
        await ShipdayService.updateDeliveryStatus(orderId, nextStatus);
      }
    } catch (shipdayErr) {
      console.error("[order-status.service] Shipday integration failed:", shipdayErr);
    }

    try {
      const statusText = nextStatus.replace(/_/g, " ").toLowerCase();
      const itemsRows = await db
        .select({ name: menuItems.name, quantity: orderItems.quantity })
        .from(orderItems)
        .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, orderId));

      const itemsSummary = itemsRows.length > 0
        ? itemsRows.map((i) => `${i.quantity}x ${i.name || "Unknown Item"}`).join("\n")
        : "No specific items found.";

      await NotificationService.dispatchOrderNotifications({
        userId: ownerId,
        type: "ORDER",
        subject: `Order Update: #${orderId.slice(0, 8)}`,
        body: `*Order Update: #${orderId.slice(0, 8)}*\nRestaurant: ${restaurantName}\nStatus: ${statusText.toUpperCase()}\n\n*Items:*\n${itemsSummary}\n\n*Total:* £${ownedOrder.totalAmount || "0.00"}`,
        metadata: {
          orderId,
          orderStatus: nextStatus,
          targetRole: "owner",
          ...(nextStatus === "CANCELLED" && { cancellationReason: "Cancelled by restaurant" }),
        },
        channels: ["FCM", "WHATSAPP"],
      });
    } catch (notifyOwnerErr) {
      console.error("[order-status.service] Failed to notify owner:", notifyOwnerErr);
    }
  })();

  return { ok: true, order: updated as typeof orders.$inferSelect };
}
