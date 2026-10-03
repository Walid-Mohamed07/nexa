"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  ExternalLink,
  MapPin,
  MessageSquareText,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/motion-utils";
import { useCart } from "@/lib/cart";
import { useEntry } from "@/lib/entry-context";
import { useOrder } from "@/lib/order-context";
import {
  getFeedbackIdempotencyKey,
  isFeedbackEligible,
  isFeedbackDismissed,
  maskPhone,
  setFeedbackDismissed,
  type ReorderNotice,
  statusLabel,
  validateCustomer,
} from "@/lib/order-helpers";
import { OrderAgainButton } from "@/components/order/order-again-button";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { formatCurrency } from "@/lib/menu-helpers";
import {
  fetchCustomerFeedback,
  fetchOrder,
  fetchOrdersByCustomer,
  submitOrderReview,
  type CustomerFeedback,
  type Order,
} from "@/lib/api";

function readReorderNotice() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("nexa-order-reorder");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReorderNotice>;
    return {
      unavailable: Array.isArray(parsed.unavailable) ? parsed.unavailable : [],
      priceChanges: Array.isArray(parsed.priceChanges)
        ? parsed.priceChanges
        : [],
    };
  } catch {
    return null;
  }
}

export function OrderFlow({ step }: { step: string }) {
  const router = useRouter();
  const cart = useCart();
  const { state } = useEntry();
  const flow = useOrder();
  const heading = React.useRef<HTMLHeadingElement>(null);
  const [errors, setErrors] = React.useState({ name: "", phone: "" });
  const [history, setHistory] = React.useState<Order[]>([]);
  const [historyError, setHistoryError] = React.useState("");
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [reload, setReload] = React.useState(0);
  const [detailOrder, setDetailOrder] = React.useState<Order | null>(null);
  const [detailError, setDetailError] = React.useState("");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [reorderNotice, setReorderNotice] =
    React.useState<ReorderNotice | null>(null);
  const [customerFeedback, setCustomerFeedback] = React.useState<
    CustomerFeedback[]
  >([]);
  const [feedbackLoading, setFeedbackLoading] = React.useState(true);
  const [feedbackLoadError, setFeedbackLoadError] = React.useState("");
  const [feedbackReload, setFeedbackReload] = React.useState(0);
  const [feedbackDismissed, setFeedbackDismissedState] = React.useState(false);
  const [feedbackRating, setFeedbackRating] = React.useState(0);
  const [feedbackComment, setFeedbackComment] = React.useState("");
  const [feedbackSaving, setFeedbackSaving] = React.useState(false);
  const [feedbackError, setFeedbackError] = React.useState("");
  const feedbackCustomerId = flow.customer?.id;

  React.useEffect(() => {
    heading.current?.focus();
  }, [step, flow.ready, cart.ready]);

  React.useEffect(() => {
    if (step === "cart") {
      setReorderNotice(readReorderNotice());
    }
  }, [step]);

  React.useEffect(() => {
    if (step !== "history" || !flow.customer) return;
    let active = true;
    setHistoryLoading(true);
    setHistoryError("");
    fetchOrdersByCustomer(flow.customer.id)
      .then((result) => {
        if (active) {
          setHistory(
            [...result.data].sort((left, right) =>
              right.createdAt.localeCompare(left.createdAt),
            ),
          );
        }
      })
      .catch(() => {
        if (active)
          setHistoryError("We couldn't load your orders. Please try again.");
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [step, flow.customer, reload]);

  React.useEffect(() => {
    if (
      !feedbackCustomerId ||
      !["history", "details", "active"].includes(step)
    ) {
      setCustomerFeedback([]);
      setFeedbackLoadError("");
      setFeedbackLoading(false);
      return;
    }

    let active = true;
    setFeedbackLoading(true);
    setFeedbackLoadError("");
    fetchCustomerFeedback(feedbackCustomerId)
      .then((result) => {
        if (active) setCustomerFeedback(result.data);
      })
      .catch(() => {
        if (active)
          setFeedbackLoadError("We couldn't load feedback for your orders.");
      })
      .finally(() => {
        if (active) setFeedbackLoading(false);
      });

    return () => {
      active = false;
    };
  }, [step, feedbackCustomerId, feedbackReload]);

  React.useEffect(() => {
    if (
      !feedbackCustomerId ||
      !["history", "details", "active"].includes(step)
    ) {
      setCustomerFeedback([]);
      setFeedbackLoadError("");
      setFeedbackLoading(false);
      return;
    }

    let active = true;
    setFeedbackLoading(true);
    setFeedbackLoadError("");
    fetchCustomerFeedback(feedbackCustomerId)
      .then((result) => {
        if (active) setCustomerFeedback(result.data);
      })
      .catch(() => {
        if (active)
          setFeedbackLoadError("We couldn't load feedback for your orders.");
      })
      .finally(() => {
        if (active) setFeedbackLoading(false);
      });
    return () => {
      active = false;
    };
  }, [step, feedbackCustomerId, feedbackReload]);

  React.useEffect(() => {
    if (step !== "details" && step !== "active") return;
    if (!flow.ready || flow.customerLoading) return;
    if (!flow.customer?.id) {
      setDetailError(
        step === "active" ? "NO_ACTIVE_ORDER" : "ORDER_UNAVAILABLE",
      );
      setDetailLoading(false);
      return;
    }
    let active = true;
    const targetId =
      (typeof window !== "undefined" &&
        window.sessionStorage.getItem("nexa-order-id")) ||
      flow.order?.id ||
      null;
    if (!targetId) {
      setDetailError(
        step === "active" ? "NO_ACTIVE_ORDER" : "ORDER_UNAVAILABLE",
      );
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    setDetailError("");
    fetchOrder(targetId, flow.customer?.id)
      .then((result) => {
        if (active) setDetailOrder(result.data);
      })
      .catch(() => {
        if (active) setDetailError("This order is no longer available.");
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [step, flow.order, flow.customer?.id, flow.ready, flow.customerLoading]);

  const go = (next: string) => {
    flow.setError("");
    router.push(`/order/${next}`);
  };

  const titles: Record<string, string> = {
    cart: "Your order",
    customer: "Almost there",
    review: "Everything look right?",
    success: "Order received",
    history: "Your orders",
    details: "Your order",
    active: "Active order",
  };
  const title = titles[step] || "Page unavailable";
  const current = step === "customer" ? 1 : step === "review" ? 2 : 0;
  const reviewing = step === "review";
  const locked = flow.busy || flow.uncertain;
  const amount = formatCurrency(
    cart.subtotal,
    cart.items[0]?.menuItem.currency || "EGP",
  );
  const contextReady = state.status === "resolved";
  const order = detailOrder ?? flow.order;
  const orderId = order?.id;
  const googleReviewUrl =
    state.status === "resolved" ? state.cafe.googleReviewUrl || "" : "";
  const activeOrderStatus = order
    ? statusLabel(order.status)
    : "No active order";

  React.useEffect(() => {
    if (!orderId || !feedbackCustomerId) {
      setFeedbackDismissedState(false);
      return;
    }
    setFeedbackDismissedState(isFeedbackDismissed(feedbackCustomerId, orderId));
    setFeedbackRating(0);
    setFeedbackComment("");
    setFeedbackError("");
  }, [orderId, feedbackCustomerId]);

  async function continueCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validateCustomer(flow.draft.name, flow.draft.phone);
    setErrors(next);
    if (next.name || next.phone) {
      event.currentTarget
        .querySelector<HTMLInputElement>(
          `#customer-${next.name ? "name" : "phone"}`,
        )
        ?.focus();
      return;
    }
    if (await flow.saveCustomer()) go("review");
  }

  async function handleFeedbackSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !order ||
      !flow.customer ||
      !isFeedbackEligible(order.status) ||
      feedbackRating < 1 ||
      feedbackSaving
    ) {
      return;
    }
    setFeedbackSaving(true);
    setFeedbackError("");
    try {
      const result = await submitOrderReview(
        order.id,
        {
          rating: feedbackRating,
          comment: feedbackComment.trim(),
          visitId: state.status === "resolved" ? state.visit?.id : null,
        },
        flow.customer?.id,
        getFeedbackIdempotencyKey(order.id),
      );
      setCustomerFeedback((current) => [
        ...current.filter((item) => item.orderId !== order.id),
        result.data,
      ]);
      setFeedbackDismissedState(false);
      setFeedbackDismissed(flow.customer.id, order.id, false);
    } catch {
      setFeedbackError("We couldn't send your feedback. Please try again.");
    } finally {
      setFeedbackSaving(false);
    }
  }

  function renderFeedbackCard() {
    if (
      !order ||
      !flow.customer ||
      order.customerId !== flow.customer.id ||
      !isFeedbackEligible(order.status)
    ) {
      return null;
    }

    const savedFeedback = customerFeedback.find(
      (item) => item.orderId === order.id,
    );

    if (feedbackLoading) {
      return <p role="status">Checking feedback for this order...</p>;
    }

    if (feedbackLoadError) {
      return (
        <div className="order-empty" role="alert">
          <p>{feedbackLoadError}</p>
          <Button
            variant="secondary"
            onClick={() => setFeedbackReload((value) => value + 1)}
          >
            Try again
          </Button>
        </div>
      );
    }

    if (savedFeedback) {
      return (
        <section
          className="order-receipt order-feedback"
          aria-labelledby="saved-feedback-title"
          aria-live="polite"
        >
          <h2 id="saved-feedback-title">Your feedback</h2>
          <p aria-label={`Rating: ${savedFeedback.rating} out of 5`}>
            {savedFeedback.rating} out of 5
          </p>
          <p className="detail-meta">
            {order.orderNumber} ·{" "}
            {new Date(savedFeedback.createdAt).toLocaleDateString("en-GB")}
          </p>
          {savedFeedback.comment ? <p>{savedFeedback.comment}</p> : null}
          {googleReviewUrl ? (
            <div className="google-review-card">
              <p>Enjoyed your visit?</p>
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                Leave a Google review{" "}
                <ExternalLink size={16} aria-hidden="true" />
              </a>
              <p className="text-sm text-[var(--color-text-muted)]">
                This opens Google. NEXA cannot confirm whether a review was
                submitted.
              </p>
            </div>
          ) : null}
        </section>
      );
    }

    if (feedbackDismissed) {
      return (
        <section
          className="order-receipt order-feedback"
          aria-labelledby="feedback-dismissed-title"
          aria-live="polite"
        >
          <h2 id="feedback-dismissed-title">Feedback request dismissed</h2>
          <Button
            variant="ghost"
            onClick={() => {
              setFeedbackDismissed(flow.customer!.id, order.id, false);
              setFeedbackDismissedState(false);
            }}
          >
            Rate this order
          </Button>
        </section>
      );
    }

    return (
      <section
        className="order-receipt order-feedback"
        aria-labelledby="feedback-title"
        aria-live="polite"
      >
        <div className="order-feedback-header">
          <Sparkles size={18} aria-hidden="true" />
          <h2 id="feedback-title">How was your experience?</h2>
        </div>
        <p>Order {order.orderNumber}</p>
        <form onSubmit={handleFeedbackSubmit} className="feedback-form">
          <fieldset>
            <legend>Rate your experience from 1 to 5</legend>
            <div
              className="star-row"
              role="group"
              aria-label="Experience rating"
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={star <= feedbackRating ? "active" : ""}
                  aria-label={`Rate ${star} out of 5`}
                  aria-pressed={feedbackRating === star}
                  disabled={feedbackSaving}
                  onClick={() => setFeedbackRating(star)}
                >
                  <Star
                    size={28}
                    aria-hidden="true"
                    fill={star <= feedbackRating ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>
          </fieldset>
          <label htmlFor="feedback-comment">Comment (optional)</label>
          <textarea
            id="feedback-comment"
            value={feedbackComment}
            maxLength={1000}
            aria-describedby="feedback-comment-limit"
            onChange={(event) => setFeedbackComment(event.target.value)}
            rows={4}
            placeholder="Tell us about your visit"
          />
          <p
            id="feedback-comment-limit"
            className="text-sm text-[var(--color-text-muted)]"
          >
            {feedbackComment.length}/1000
          </p>
          {feedbackError ? (
            <p className="field-error" role="alert">
              {feedbackError}
            </p>
          ) : null}
          <div className="stacked-actions">
            <Button
              type="submit"
              loading={feedbackSaving}
              disabled={feedbackRating < 1}
            >
              Send Feedback
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={feedbackSaving}
              onClick={() => {
                setFeedbackDismissed(flow.customer!.id, order.id, true);
                setFeedbackDismissedState(true);
              }}
            >
              Not now
            </Button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <>
      <main className="order-page">
        <header className="order-header">
          <Link
            href={
              step === "cart" ||
              step === "success" ||
              step === "history" ||
              step === "details" ||
              step === "active"
                ? "/menu"
                : `/order/${step === "customer" ? "cart" : "customer"}`
            }
            className="order-back"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </Link>
          <Link href="/menu" className="order-brand">
            {contextReady ? state.cafe.name : "NEXA"}
          </Link>
          {contextReady && (
            <span className="order-table">
              <MapPin size={16} aria-hidden="true" /> {state.table.name}
            </span>
          )}
        </header>
        <div className="order-content">
          {["cart", "customer", "review"].includes(step) && (
            <nav className="order-steps" aria-label="Order progress">
              {["Your order", "Your details", "Review"].map((label, index) => (
                <span
                  key={label}
                  aria-current={current === index ? "step" : undefined}
                >
                  <span>
                    {index < current ? (
                      <Check size={14} aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  {label}
                </span>
              ))}
            </nav>
          )}
          <FadeIn key={step}>
            <div className="order-title">
              <h1 ref={heading} tabIndex={-1}>
                {title}
              </h1>
              {step === "cart" && <p>A little something, made for you.</p>}
              {step === "customer" && <p>How should we call you?</p>}
              {reviewing && (
                <p>One last look before we send it to the cafe team.</p>
              )}
              {step === "active" && (
                <p>Your latest order is ready to view when you want it.</p>
              )}
              {step === "details" && (
                <p>Everything from your order, in one calm view.</p>
              )}
            </div>
            {!cart.ready || !flow.ready ? (
              <p role="status">Getting your order ready...</p>
            ) : !contextReady ? (
              <div className="order-empty">
                <MapPin size={32} />
                <h2>Your table is not connected</h2>
                <p>
                  Please scan the QR code at your table. Your items are saved.
                </p>
                <Link className="order-link" href="/">
                  Back to entry
                </Link>
              </div>
            ) : (
              <>
                {flow.error && (
                  <div className="order-error" role="alert">
                    {flow.error}
                  </div>
                )}
                {reorderNotice ? (
                  <div
                    className="order-warning"
                    role="status"
                    aria-live="polite"
                  >
                    <AlertCircle size={18} aria-hidden="true" />
                    <div>
                      <p>
                        {reorderNotice.unavailable.length
                          ? "Some previous items are unavailable. Available items are in your new cart."
                          : "Prices changed since this order. Your new cart uses current menu prices."}
                      </p>
                      {reorderNotice.unavailable.length > 0 && (
                        <ul>
                          {reorderNotice.unavailable.map((item) => (
                            <li key={item}>{item}: unavailable</li>
                          ))}
                        </ul>
                      )}
                      {reorderNotice.priceChanges.length > 0 && (
                        <ul>
                          {reorderNotice.priceChanges.map((item) => (
                            <li key={item.name}>
                              {item.name}: changed from{" "}
                              {formatCurrency(
                                item.previousPrice,
                                item.currency,
                              )}{" "}
                              to{" "}
                              {formatCurrency(item.currentPrice, item.currency)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Dismiss reorder changes"
                      onClick={() => {
                        window.sessionStorage.removeItem("nexa-order-reorder");
                        setReorderNotice(null);
                      }}
                      className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
                {step === "success" ? (
                  order ? (
                    <div className="order-confirmation">
                      <div className="order-check">
                        <Check size={32} aria-hidden="true" />
                      </div>
                      <h2>
                        Thank you, {flow.orderCustomer?.name || "our guest"}.
                      </h2>
                      <p>Your order is with the cafe team.</p>
                      <div className="order-receipt">
                        <span>Order reference</span>
                        <strong>{order.orderNumber || order.id}</strong>
                        <dl>
                          <div>
                            <dt>Table</dt>
                            <dd>
                              {order.tableId === state.table.id
                                ? state.table.name
                                : order.tableId}
                            </dd>
                          </div>
                          <div>
                            <dt>Status</dt>
                            <dd>{statusLabel(order.status)}</dd>
                          </div>
                          <div>
                            <dt>Total</dt>
                            <dd>
                              {formatCurrency(order.total, order.currency)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <div className="stacked-actions">
                        <Link
                          className="order-primary-link"
                          href="/order/active"
                        >
                          View current order <ReceiptText size={18} />
                        </Link>
                        <Link
                          className="order-primary-link"
                          href="/order/history"
                        >
                          View my orders <ReceiptText size={18} />
                        </Link>
                      </div>
                      <Link className="order-link" href="/menu">
                        Back to menu
                      </Link>
                    </div>
                  ) : (
                    <div className="order-empty">
                      <p>No order confirmation is available.</p>
                      <Link href="/menu" className="order-link">
                        Back to menu
                      </Link>
                    </div>
                  )
                ) : step === "active" || step === "details" ? (
                  detailLoading ? (
                    <div className="order-empty" role="status">
                      <RefreshCw className="animate-spin" size={32} />
                      <p>Loading your order details.</p>
                    </div>
                  ) : detailError ? (
                    <div className="order-empty">
                      <AlertCircle size={32} />
                      <h2>
                        {detailError === "NO_ACTIVE_ORDER"
                          ? "No active order"
                          : "This order is no longer available."}
                      </h2>
                      {detailError === "NO_ACTIVE_ORDER" ? (
                        <p>
                          When you place an order, its progress will appear
                          here.
                        </p>
                      ) : null}
                      <Link className="order-primary-link" href="/menu">
                        View Menu
                      </Link>
                    </div>
                  ) : order ? (
                    <div className="detail-layout">
                      <div className="order-receipt">
                        <div className="detail-header-row">
                          <span>Your Order</span>
                          <span className="status-pill">
                            {activeOrderStatus}
                          </span>
                        </div>
                        <strong>{order.orderNumber}</strong>
                        <p className="detail-meta">
                          {new Date(order.createdAt).toLocaleString("en-GB")} ·{" "}
                          {state.cafe.name}
                        </p>
                        <dl>
                          <div>
                            <dt>Table</dt>
                            <dd>{state.table.name}</dd>
                          </div>
                          <div>
                            <dt>Status</dt>
                            <dd>{statusLabel(order.status)}</dd>
                          </div>
                          <div>
                            <dt>Total</dt>
                            <dd>
                              {formatCurrency(order.total, order.currency)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <div
                        className="status-timeline"
                        aria-label="Order timeline"
                      >
                        {["PENDING", "PREPARING", "READY", "COMPLETED"].map(
                          (status, index) => {
                            const isCurrent = order.status === status;
                            const isPast =
                              [
                                "PENDING",
                                "PREPARING",
                                "READY",
                                "COMPLETED",
                              ].indexOf(order.status) >= index;
                            return (
                              <div
                                key={status}
                                className={`timeline-step ${isPast ? "done" : ""} ${isCurrent ? "current" : ""}`}
                              >
                                <span>{index + 1}</span>
                                <p>{statusLabel(status)}</p>
                              </div>
                            );
                          },
                        )}
                      </div>
                      <div className="detail-items">
                        {order.items.map((line) => (
                          <div key={line.id} className="detail-item">
                            <div>
                              <h3>{line.itemNameSnapshot}</h3>
                              <p>
                                Qty {line.quantity} ·{" "}
                                {formatCurrency(line.unitPrice, order.currency)}
                              </p>
                            </div>
                            <strong>
                              {formatCurrency(line.total, order.currency)}
                            </strong>
                          </div>
                        ))}
                      </div>
                      <div className="summary-block">
                        <div>
                          <span>Subtotal</span>
                          <strong>
                            {formatCurrency(order.subtotal, order.currency)}
                          </strong>
                        </div>
                        <div className="final-total">
                          <span>Total</span>
                          <strong>
                            {formatCurrency(order.total, order.currency)}
                          </strong>
                        </div>
                      </div>
                      <div className="stacked-actions">
                        <Link
                          className="order-primary-link"
                          href="/order/history"
                        >
                          My orders <ReceiptText size={18} />
                        </Link>
                        <OrderAgainButton order={order} size="md" />
                      </div>
                      {renderFeedbackCard()}
                    </div>
                  ) : (
                    <div className="order-empty">
                      <p>No order is available.</p>
                      <Link href="/menu" className="order-link">
                        Back to menu
                      </Link>
                    </div>
                  )
                ) : step === "history" ? (
                  <div>
                    {historyLoading && (
                      <div className="order-empty" role="status">
                        <RefreshCw className="animate-spin" size={30} />
                        <p>Loading your orders.</p>
                      </div>
                    )}
                    {historyError && (
                      <div className="order-empty" role="alert">
                        <p>{historyError}</p>
                        <Button onClick={() => setReload((value) => value + 1)}>
                          Try Again
                        </Button>
                      </div>
                    )}
                    {feedbackLoadError ? (
                      <div className="order-empty" role="alert">
                        <p>{feedbackLoadError}</p>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setFeedbackReload((value) => value + 1)
                          }
                        >
                          Retry feedback
                        </Button>
                      </div>
                    ) : null}
                    {!historyLoading && !historyError && !history.length && (
                      <div className="order-empty">
                        <Clock3 size={30} />
                        <h2>Your orders will appear here.</h2>
                        <p>Start with something from the menu.</p>
                        <Link className="order-primary-link" href="/menu">
                          Explore Menu
                        </Link>
                      </div>
                    )}
                    <div className="history-list">
                      {history.map((item) => {
                        const savedFeedback = customerFeedback.find(
                          (feedback) => feedback.orderId === item.id,
                        );
                        return (
                          <article key={item.id} className="order-history">
                            <div>
                              <h2>{item.orderNumber}</h2>
                              <p>
                                {new Date(item.createdAt).toLocaleString(
                                  "en-GB",
                                )}
                              </p>
                              <p>
                                {item.items.length} item
                                {item.items.length === 1 ? "" : "s"} ·{" "}
                                {statusLabel(item.status)}
                              </p>
                              {isFeedbackEligible(item.status) ? (
                                savedFeedback ? (
                                  <div
                                    aria-label={`Feedback for ${item.orderNumber}`}
                                  >
                                    <p>
                                      Feedback submitted ·{" "}
                                      {savedFeedback.rating} of 5
                                    </p>
                                    {savedFeedback.comment ? (
                                      <p>{savedFeedback.comment}</p>
                                    ) : null}
                                  </div>
                                ) : feedbackLoading ? (
                                  <p role="status">Checking feedback...</p>
                                ) : feedbackLoadError ? (
                                  <p role="alert">
                                    Feedback status is unavailable.
                                  </p>
                                ) : (
                                  <Link
                                    className="order-link"
                                    href="/order/details"
                                    onClick={() => {
                                      if (flow.customer) {
                                        setFeedbackDismissed(
                                          flow.customer.id,
                                          item.id,
                                          false,
                                        );
                                      }
                                      window.sessionStorage.setItem(
                                        "nexa-order-id",
                                        item.id,
                                      );
                                    }}
                                  >
                                    Rate your experience
                                  </Link>
                                )
                              ) : null}
                            </div>
                            <div className="history-actions">
                              <strong>
                                {formatCurrency(item.total, item.currency)}
                              </strong>
                              <div className="history-buttons">
                                <Link
                                  href="/order/details"
                                  className="order-link"
                                  onClick={() => {
                                    window.sessionStorage.setItem(
                                      "nexa-order-id",
                                      item.id,
                                    );
                                  }}
                                >
                                  View details
                                </Link>
                                <OrderAgainButton order={item} />
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    <div className="history-footer">
                      <Link className="order-link" href="/menu">
                        Back to menu
                      </Link>
                    </div>
                  </div>
                ) : !cart.items.length ? (
                  <div className="order-empty">
                    <ShoppingBag size={36} aria-hidden="true" />
                    <h2>Your order is empty.</h2>
                    <p>
                      Explore the menu and choose something you&apos;ll love.
                    </p>
                    <Link className="order-primary-link" href="/menu">
                      Explore menu <ArrowRight size={18} />
                    </Link>
                  </div>
                ) : step === "customer" ? (
                  flow.customer ? (
                    <section
                      className="order-person customer-recognition"
                      aria-live="polite"
                    >
                      <div>
                        <p>Welcome back</p>
                        <h2 className="wrap-break-word">
                          {flow.customer.name}
                        </h2>
                        <p>{maskPhone(flow.customer.phone)}</p>
                      </div>
                      <div className="stacked-actions">
                        <Button
                          size="lg"
                          icon={ArrowRight}
                          iconPosition="right"
                          onClick={() => go("review")}
                        >
                          Continue as {flow.customer.name}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={locked}
                          onClick={flow.clearCustomerContext}
                        >
                          Not you?
                        </Button>
                      </div>
                    </section>
                  ) : (
                    <form
                      className="order-form"
                      onSubmit={continueCustomer}
                      noValidate
                    >
                      {flow.customerRestoreError ? (
                        <div className="order-error" role="alert">
                          {flow.customerRestoreError}
                          <Button
                            variant="ghost"
                            loading={flow.customerLoading}
                            onClick={() => void flow.retryCustomer()}
                          >
                            Retry
                          </Button>
                        </div>
                      ) : null}
                      <div>
                        <label htmlFor="customer-name">Name</label>
                        <input
                          id="customer-name"
                          autoComplete="name"
                          maxLength={100}
                          required
                          value={flow.draft.name}
                          disabled={locked}
                          aria-invalid={Boolean(errors.name)}
                          aria-describedby={
                            errors.name ? "name-error" : undefined
                          }
                          onChange={(event) =>
                            flow.setDraft({
                              ...flow.draft,
                              name: event.target.value,
                            })
                          }
                          onBlur={() =>
                            setErrors((value) => ({
                              ...value,
                              name: validateCustomer(
                                flow.draft.name,
                                flow.draft.phone,
                              ).name,
                            }))
                          }
                        />
                        {errors.name && (
                          <p id="name-error" className="field-error">
                            {errors.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="customer-phone">Phone number</label>
                        <input
                          id="customer-phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          maxLength={30}
                          required
                          disabled={locked}
                          value={flow.draft.phone}
                          aria-invalid={Boolean(errors.phone)}
                          aria-describedby={
                            errors.phone ? "phone-error" : "phone-note"
                          }
                          onChange={(event) =>
                            flow.setDraft({
                              ...flow.draft,
                              phone: event.target.value,
                            })
                          }
                          onBlur={() =>
                            setErrors((value) => ({
                              ...value,
                              phone: validateCustomer(
                                flow.draft.name,
                                flow.draft.phone,
                              ).phone,
                            }))
                          }
                        />
                        {errors.phone && (
                          <p id="phone-error" className="field-error">
                            {errors.phone}
                          </p>
                        )}
                        <p id="phone-note">
                          We&apos;ll use this to keep your orders connected to
                          you.
                        </p>
                      </div>
                      <Button
                        type="submit"
                        size="lg"
                        loading={flow.busy}
                        disabled={flow.uncertain}
                        icon={ArrowRight}
                        iconPosition="right"
                      >
                        Review order
                      </Button>
                    </form>
                  )
                ) : ["cart", "review"].includes(step) ? (
                  <div className="order-grid">
                    <div>
                      {reviewing && (
                        <div className="order-person">
                          <div>
                            <p>
                              {state.cafe.name} / Table {state.table.name}
                            </p>
                            <h2>
                              {flow.customer?.name ||
                                "Your details are missing"}
                            </h2>
                            {flow.customer?.phone ? (
                              <p
                                aria-label={`Phone number ending in ${flow.customer.phone.replace(/\D/g, "").slice(-2)}`}
                              >
                                {maskPhone(flow.customer.phone)}
                              </p>
                            ) : null}
                          </div>
                          <Button
                            variant="ghost"
                            disabled={locked}
                            onClick={() => go("customer")}
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                      <ul className="order-lines">
                        {cart.items.map((item) => (
                          <li key={item.id} className="order-line">
                            <div className="order-thumbnail">
                              {item.menuItem.image && (
                                <Image
                                  src={item.menuItem.image}
                                  alt={item.menuItem.name}
                                  fill
                                  sizes="80px"
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="order-line-body">
                              <h2>{item.menuItem.name}</h2>
                              {item.selectedModifiers.length > 0 && (
                                <p>{item.selectedModifiers.join(", ")}</p>
                              )}
                              <p>
                                {formatCurrency(
                                  item.menuItem.price,
                                  item.menuItem.currency,
                                )}{" "}
                                each
                              </p>
                              {!reviewing ? (
                                <div className="order-quantity">
                                  <button
                                    title="Decrease quantity"
                                    aria-label={`Decrease ${item.menuItem.name}`}
                                    disabled={locked}
                                    onClick={() =>
                                      cart.updateQuantity(
                                        item.id,
                                        item.quantity - 1,
                                      )
                                    }
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span>{item.quantity}</span>
                                  <button
                                    title="Increase quantity"
                                    aria-label={`Increase ${item.menuItem.name}`}
                                    disabled={locked || item.quantity >= 99}
                                    onClick={() =>
                                      cart.updateQuantity(
                                        item.id,
                                        item.quantity + 1,
                                      )
                                    }
                                  >
                                    <Plus size={16} />
                                  </button>
                                  <button
                                    title="Remove item"
                                    aria-label={`Remove ${item.menuItem.name}`}
                                    disabled={locked}
                                    onClick={() => cart.removeItem(item.id)}
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </div>
                              ) : (
                                <p>Quantity: {item.quantity}</p>
                              )}
                            </div>
                            <strong className="order-line-total">
                              {formatCurrency(
                                item.menuItem.price * item.quantity,
                                item.menuItem.currency,
                              )}
                            </strong>
                          </li>
                        ))}
                      </ul>
                      <Link
                        className="order-link"
                        href={reviewing ? "/order/cart" : "/menu"}
                      >
                        {reviewing ? "Edit your order" : "Add something else"}
                      </Link>
                    </div>
                    <aside className="order-summary" aria-label="Order summary">
                      <h2>
                        {reviewing ? "Ready for your table" : "A little recap"}
                      </h2>
                      <dl>
                        <div>
                          <dt>Items</dt>
                          <dd>{cart.itemCount}</dd>
                        </div>
                        <div>
                          <dt>Subtotal</dt>
                          <dd>{amount}</dd>
                        </div>
                        <div className="order-total">
                          <dt>Total</dt>
                          <dd>{amount}</dd>
                        </div>
                      </dl>
                      <p>Table {state.table.name}</p>
                      <div className="order-action">
                        {reviewing ? (
                          <Button
                            size="lg"
                            loading={flow.busy}
                            disabled={!flow.customer}
                            aria-busy={flow.busy}
                            onClick={async () => {
                              if (await flow.submit()) go("success");
                            }}
                          >
                            {flow.busy
                              ? "Placing your order..."
                              : flow.error || flow.uncertain
                                ? `Try again - ${amount}`
                                : `Place Order - ${amount}`}
                          </Button>
                        ) : (
                          <Button
                            size="lg"
                            icon={ArrowRight}
                            iconPosition="right"
                            onClick={() =>
                              go(flow.customer ? "review" : "customer")
                            }
                          >
                            Continue - {amount}
                          </Button>
                        )}
                      </div>
                      <span className="sr-only" role="status">
                        {flow.busy ? "Placing your order. Please wait." : ""}
                      </span>
                    </aside>
                  </div>
                ) : (
                  <Link className="order-link" href="/order/cart">
                    Back to your order
                  </Link>
                )}
              </>
            )}
          </FadeIn>
        </div>
      </main>
      <MobileBottomNav />
    </>
  );
}
