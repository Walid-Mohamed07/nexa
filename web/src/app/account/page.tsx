"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowLeft, Clock3, LogOut, MapPin, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { OrderAgainButton } from "@/components/order/order-again-button";
import { useCart } from "@/lib/cart";
import { useEntry } from "@/lib/entry-context";
import { useOrder } from "@/lib/order-context";
import {
  isFeedbackEligible,
  maskPhone,
  setFeedbackDismissed,
  statusLabel,
} from "@/lib/order-helpers";
import {
  clearCustomerPreferences,
  fetchCustomerFeedback,
  fetchCustomerPreferences,
  fetchOrdersByCustomer,
  saveCustomerPreference,
  type CustomerFeedback,
  type CustomerPreference,
  type Order,
} from "@/lib/api";

const PREFERENCE_OPTIONS = [
  { value: "coffee", label: "Coffee" },
  { value: "cold", label: "Cold drinks" },
  { value: "desserts", label: "Desserts" },
  { value: "breakfast", label: "Breakfast" },
];

function PreferencePicker({
  customerId,
  selected,
  onChange,
}: {
  customerId: string;
  selected: string[];
  onChange: (value: string, next: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");

  async function update(value: string, enabled: boolean) {
    if (busy) return;
    setBusy(value || "clear");
    setError("");
    try {
      if (!value) await clearCustomerPreferences(customerId);
      await onChange(value, enabled);
    } catch {
      setError("We couldn't update your preferences. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PREFERENCE_OPTIONS.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              disabled={Boolean(busy)}
              onClick={() => void update(option.value, !active)}
              className={[
                "inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
              ].join(" ")}
            >
              {busy === option.value ? "Saving..." : option.label}
            </button>
          );
        })}
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void update("", false)}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-transparent px-4 text-sm font-medium text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "clear" ? "Clearing..." : "Skip for now"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function AccountPage() {
  const { state } = useEntry();
  const cart = useCart();
  const flow = useOrder();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = React.useState(false);
  const [ordersError, setOrdersError] = React.useState("");
  const [ordersReload, setOrdersReload] = React.useState(0);
  const [feedback, setFeedback] = React.useState<CustomerFeedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = React.useState(true);
  const [feedbackError, setFeedbackError] = React.useState("");
  const [feedbackReload, setFeedbackReload] = React.useState(0);
  const [preferences, setPreferences] = React.useState<CustomerPreference[]>(
    [],
  );
  const [preferencesLoading, setPreferencesLoading] = React.useState(false);
  const [preferencesError, setPreferencesError] = React.useState("");
  const [preferencesReload, setPreferencesReload] = React.useState(0);

  const selectedPreferenceValues = React.useMemo(
    () =>
      preferences
        .map((item) => item.value)
        .filter((value) => value !== undefined),
    [preferences],
  );

  React.useEffect(() => {
    if (!flow.customer) {
      setPreferences([]);
      setPreferencesError("");
      setPreferencesLoading(false);
      return;
    }

    let active = true;
    setPreferencesLoading(true);
    setPreferencesError("");
    fetchCustomerPreferences(flow.customer.id)
      .then((result) => {
        if (active) setPreferences(result.data);
      })
      .catch(() => {
        if (active) {
          setPreferences([]);
          setPreferencesError("We couldn't load your preferences.");
        }
      })
      .finally(() => {
        if (active) setPreferencesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [flow.customer, preferencesReload]);

  const handlePreferenceToggle = React.useCallback(
    async (value: string, enabled: boolean) => {
      if (!flow.customer || !value) {
        if (!value) setPreferences([]);
        return;
      }

      if (enabled) {
        const next = await saveCustomerPreference(flow.customer.id, {
          preferenceType: "category",
          value,
          source: "EXPLICIT",
        });
        setPreferences((current) => {
          const withoutCurrent = current.filter((item) => item.value !== value);
          return [...withoutCurrent, next.data];
        });
      } else {
        const retained = preferences.filter((item) => item.value !== value);
        await clearCustomerPreferences(flow.customer.id);
        const restored = await Promise.all(
          retained.map((item) =>
            saveCustomerPreference(flow.customer!.id, {
              preferenceType: item.preferenceType,
              value: item.value,
              source: "EXPLICIT",
            }),
          ),
        );
        setPreferences(restored.map((result) => result.data));
      }
    },
    [flow.customer, preferences],
  );

  React.useEffect(() => {
    if (!flow.customer) {
      setOrders([]);
      setOrdersError("");
      setOrdersLoading(false);
      return;
    }
    let active = true;
    setOrdersLoading(true);
    setOrdersError("");
    fetchOrdersByCustomer(flow.customer.id)
      .then((result) => {
        if (active) setOrders(result.data);
      })
      .catch(() => {
        if (active) setOrdersError("We couldn't load your orders.");
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [flow.customer, ordersReload]);

  React.useEffect(() => {
    const customerId = flow.customer?.id;
    if (!customerId) {
      setFeedback([]);
      setFeedbackError("");
      setFeedbackLoading(false);
      return;
    }

    let active = true;
    setFeedbackLoading(true);
    setFeedbackError("");
    fetchCustomerFeedback(customerId)
      .then((result) => {
        if (active) setFeedback(result.data);
      })
      .catch(() => {
        if (active) setFeedbackError("We couldn't load your recent feedback.");
      })
      .finally(() => {
        if (active) setFeedbackLoading(false);
      });

    return () => {
      active = false;
    };
  }, [flow.customer?.id, feedbackReload]);

  const activeOrder =
    (flow.order &&
    flow.order.customerId === flow.customer?.id &&
    !["COMPLETED", "CANCELLED"].includes(flow.order.status)
      ? flow.order
      : null) ||
    orders
      .filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status))
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      )[0] ||
    null;
  const recentOrders = [...orders]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 3);
  const customerFeedback = feedback.filter(
    (item) => item.customerId === flow.customer?.id,
  );
  const feedbackByOrder = new Map(
    customerFeedback.map((item) => [item.orderId, item]),
  );
  const recentFeedback = [...customerFeedback]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 3);

  function selectFeedbackOrder(orderId: string) {
    if (!flow.customer) return;
    setFeedbackDismissed(flow.customer.id, orderId, false);
    try {
      window.sessionStorage.setItem("nexa-order-id", orderId);
    } catch {}
  }

  return (
    <main className="order-page">
      <header className="order-header">
        <Link href="/home" className="order-back" aria-label="Back to home">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <Link href="/home" className="order-brand">
          {state.status === "resolved" ? state.cafe.name : "NEXA Café"}
        </Link>
        {state.status === "resolved" ? (
          <span className="order-table">
            <MapPin size={16} aria-hidden="true" /> {state.table.name}
          </span>
        ) : null}
      </header>

      <div className="order-content">
        <div className="order-title">
          <h1 tabIndex={-1}>Your account</h1>
          <p>A little place for your details and orders.</p>
        </div>

        {!flow.ready || !cart.ready || flow.customerLoading ? (
          <p role="status">Loading your account...</p>
        ) : flow.customerRestoreError ? (
          <div className="order-empty" role="alert">
            <p>{flow.customerRestoreError}</p>
            <div className="stacked-actions">
              <Button
                loading={flow.customerLoading}
                onClick={() => void flow.retryCustomer()}
              >
                Try again
              </Button>
              <Button variant="ghost" onClick={flow.clearCustomerContext}>
                Continue without saved details
              </Button>
            </div>
          </div>
        ) : flow.customer ? (
          <div className="space-y-8">
            <section className="order-receipt" aria-labelledby="account-name">
              <p>Customer</p>
              <h2 id="account-name" className="wrap-break-word">
                {flow.customer.name}
              </h2>
              <p
                aria-label={`Phone number ending in ${flow.customer.phone.replace(/\D/g, "").slice(-2)}`}
              >
                {maskPhone(flow.customer.phone)}
              </p>
              {state.status === "resolved" ? (
                <p>
                  {state.cafe.name} · {state.branch.name}
                </p>
              ) : null}
              <Button
                variant="ghost"
                icon={LogOut}
                disabled={flow.busy || flow.uncertain}
                onClick={flow.clearCustomerContext}
              >
                Clear customer context
              </Button>
            </section>

            <section
              aria-labelledby="account-preferences"
              className="space-y-3"
            >
              <h2 id="account-preferences" className="text-lg font-semibold">
                Personalize my experience
              </h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Optional. We only use what you pick here to help us surface a
                few relevant ideas.
              </p>
              {preferencesLoading ? (
                <p role="status">Loading your preferences...</p>
              ) : preferencesError ? (
                <div className="order-empty" role="alert">
                  <p>{preferencesError}</p>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setPreferencesReload((value) => value + 1)
                    }
                  >
                    Try again
                  </Button>
                </div>
              ) : flow.customer ? (
                <PreferencePicker
                  customerId={flow.customer.id}
                  selected={selectedPreferenceValues}
                  onChange={handlePreferenceToggle}
                />
              ) : null}
            </section>

            <section aria-labelledby="account-orders">
              <h2 id="account-orders" className="mb-3 text-lg font-semibold">
                Your orders
              </h2>
              <div className="stacked-actions">
                <Link className="order-primary-link" href="/order/history">
                  Order history <ReceiptText size={18} aria-hidden="true" />
                </Link>
                {activeOrder ? (
                  <Link
                    className="order-primary-link"
                    href="/order/active"
                    onClick={() => {
                      window.sessionStorage.setItem(
                        "nexa-order-id",
                        activeOrder.id,
                      );
                    }}
                  >
                    Active order · {statusLabel(activeOrder.status)}
                    <Clock3 size={18} aria-hidden="true" />
                  </Link>
                ) : ordersLoading ? (
                  <p role="status">Checking for an active order...</p>
                ) : ordersError ? (
                  <div className="order-empty" role="alert">
                    <p>{ordersError}</p>
                    <Button
                      variant="secondary"
                      onClick={() => setOrdersReload((value) => value + 1)}
                    >
                      Try again
                    </Button>
                  </div>
                ) : (
                  <div className="order-empty">
                    <Clock3 size={28} aria-hidden="true" />
                    <h3>No active order</h3>
                    <p>
                      Your next order will appear here while it is being
                      prepared.
                    </p>
                  </div>
                )}
              </div>
              {ordersLoading ? (
                <p className="mt-4" role="status">
                  Loading recent orders...
                </p>
              ) : recentOrders.length ? (
                <div className="history-list mt-4" aria-label="Recent orders">
                  {recentOrders.map((item) => {
                    const savedFeedback = feedbackByOrder.get(item.id);
                    return (
                      <article key={item.id} className="order-history">
                        <div>
                          <h3>{item.orderNumber}</h3>
                          <p>
                            {item.items
                              .map((line) => line.itemNameSnapshot)
                              .join(", ")}
                          </p>
                          <p>{statusLabel(item.status)}</p>
                          {isFeedbackEligible(item.status) ? (
                            savedFeedback ? (
                              <p>
                                Feedback submitted · {savedFeedback.rating}/5
                              </p>
                            ) : feedbackLoading ? (
                              <p role="status">Checking feedback...</p>
                            ) : feedbackError ? null : (
                              <Link
                                className="order-link"
                                href="/order/details"
                                onClick={() => selectFeedbackOrder(item.id)}
                              >
                                Rate your experience
                              </Link>
                            )
                          ) : null}
                        </div>
                        <OrderAgainButton order={item} />
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <section aria-labelledby="account-feedback">
              <h2 id="account-feedback" className="mb-3 text-lg font-semibold">
                Recent feedback
              </h2>
              {feedbackLoading ? (
                <p role="status">Loading your feedback...</p>
              ) : feedbackError ? (
                <div className="order-empty" role="alert">
                  <p>{feedbackError}</p>
                  <Button
                    variant="secondary"
                    onClick={() => setFeedbackReload((value) => value + 1)}
                  >
                    Try again
                  </Button>
                </div>
              ) : recentFeedback.length ? (
                <div className="history-list">
                  {recentFeedback.map((item) => {
                    const relatedOrder = orders.find(
                      (order) => order.id === item.orderId,
                    );
                    return (
                      <article key={item.id} className="order-history">
                        <div>
                          <h3>
                            {relatedOrder?.orderNumber || "Completed order"}
                          </h3>
                          <p>
                            Rating {item.rating} of 5 ·{" "}
                            {new Date(item.createdAt).toLocaleDateString(
                              "en-GB",
                            )}
                          </p>
                          {item.comment ? <p>{item.comment}</p> : null}
                        </div>
                        {relatedOrder ? (
                          <Link
                            className="order-link"
                            href="/order/details"
                            onClick={() => selectFeedbackOrder(relatedOrder.id)}
                          >
                            View feedback
                          </Link>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">
                  No feedback shared yet.
                </p>
              )}
            </section>
          </div>
        ) : (
          <div className="order-empty">
            <h2>No customer details yet</h2>
            <p>
              {state.status === "resolved"
                ? "Add your details when you place your next order."
                : "Scan your table's QR code to connect to the cafe first."}
            </p>
            <Link
              className="order-primary-link"
              href={
                state.status === "resolved" && cart.items.length
                  ? "/order/customer"
                  : state.status === "resolved"
                    ? "/menu"
                    : "/"
              }
            >
              {state.status === "resolved" && cart.items.length
                ? "Continue your order"
                : "Explore menu"}
            </Link>
          </div>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
