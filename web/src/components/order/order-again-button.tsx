"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button, type ButtonSize } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useEntry } from "@/lib/entry-context";
import { useOrder } from "@/lib/order-context";
import { buildReorderPlan, type ReorderNotice } from "@/lib/order-helpers";
import { fetchMenu, type Order } from "@/lib/api";

export function OrderAgainButton({
  order,
  size = "sm",
}: {
  order: Order;
  size?: ButtonSize;
}) {
  const router = useRouter();
  const cart = useCart();
  const { state } = useEntry();
  const flow = useOrder();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function reorder() {
    if (
      state.status !== "resolved" ||
      !flow.customer ||
      order.customerId !== flow.customer.id
    ) {
      setError("Reconnect your customer details before reordering.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const menu = await fetchMenu(state.cafe.id);
      const plan = buildReorderPlan(order, menu.data.items);
      if (!plan.canContinue) {
        setError(
          plan.unavailable.length
            ? `No items are available. Unavailable: ${plan.unavailable.join(", ")}.`
            : "None of the items in this order are currently available.",
        );
        return;
      }

      cart.replaceItems(plan.items);
      const notice: ReorderNotice = {
        unavailable: plan.unavailable,
        priceChanges: plan.priceChanges,
      };
      if (notice.unavailable.length || notice.priceChanges.length) {
        try {
          window.sessionStorage.setItem(
            "nexa-order-reorder",
            JSON.stringify(notice),
          );
        } catch {}
      } else {
        try {
          window.sessionStorage.removeItem("nexa-order-reorder");
        } catch {}
      }
      router.push("/order/cart");
    } catch {
      setError("We couldn't prepare your reorder. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        variant="secondary"
        size={size}
        icon={RefreshCw}
        loading={busy}
        onClick={() => void reorder()}
      >
        Order Again
      </Button>
      {error ? (
        <p className="max-w-56 text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
