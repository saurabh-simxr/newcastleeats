import { ok, fail, withOwnerAuth, parseBody } from "@/lib/proxy";
import { applyOwnerStatusChange } from "@/services/order-status.service";
import { z } from "zod";

const OwnerStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "PREPARING", "DISPATCH_REQUESTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"])
});

/**
 * PATCH /api/owner/orders/[id]/status
 * Updates the order status, but ONLY if the restaurant belongs to the current user.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withOwnerAuth(req, async (user) => {
    try {
      const { id } = await params;
      const body = await parseBody(req, OwnerStatusSchema);
      if ("error" in body) return body.error;

      const result = await applyOwnerStatusChange({
        orderId: id,
        ownerId: user.id,
        nextStatus: body.data.status,
      });

      if (!result.ok) return fail(result.error, result.statusCode);
      return ok({ order: result.order });
    } catch (err) {
      console.error("[api/owner/orders/[id]/status PATCH]", err);
      return fail("Failed to update status by owner.", 500);
    }
  });
}
