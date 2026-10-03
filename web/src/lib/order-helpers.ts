import { ApiError } from "./api";

export type ReorderPriceChange = {
  name: string;
  previousPrice: number;
  currentPrice: number;
  currency: string;
};

export type ReorderNotice = {
  unavailable: string[];
  priceChanges: ReorderPriceChange[];
};

const FEEDBACK_DISMISSED_KEY = "nexa-feedback-dismissed";
const FEEDBACK_IDEMPOTENCY_PREFIX = "nexa-feedback-idempotency:";

export function isFeedbackEligible(status?: string) {
  return status === "COMPLETED";
}

export function isFeedbackDismissed(customerId: string, orderId: string) {
  if (typeof window === "undefined") return false;
  try {
    const dismissed = JSON.parse(
      window.sessionStorage.getItem(FEEDBACK_DISMISSED_KEY) || "[]",
    );
    return (
      Array.isArray(dismissed) &&
      dismissed.includes(JSON.stringify([customerId, orderId]))
    );
  } catch {
    return false;
  }
}

export function setFeedbackDismissed(
  customerId: string,
  orderId: string,
  dismissedState: boolean,
) {
  if (typeof window === "undefined") return;
  try {
    const current = JSON.parse(
      window.sessionStorage.getItem(FEEDBACK_DISMISSED_KEY) || "[]",
    );
    const entries = Array.isArray(current)
      ? current.filter((entry) => typeof entry === "string")
      : [];
    const key = JSON.stringify([customerId, orderId]);
    const next = dismissedState
      ? entries.includes(key)
        ? entries
        : [...entries, key]
      : entries.filter((entry) => entry !== key);
    window.sessionStorage.setItem(FEEDBACK_DISMISSED_KEY, JSON.stringify(next));
  } catch {}
}

export function getFeedbackIdempotencyKey(orderId: string) {
  if (typeof window === "undefined") return `feedback-${orderId}`;
  const key = `${FEEDBACK_IDEMPOTENCY_PREFIX}${orderId}`;
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const created = window.crypto.randomUUID();
    window.sessionStorage.setItem(key, created);
    return created;
  } catch {
    return `feedback-${orderId}`;
  }
}

export function clearFeedbackClientState() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FEEDBACK_DISMISSED_KEY);
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(FEEDBACK_IDEMPOTENCY_PREFIX)) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {}
}

export function validateCustomer(name: string, phone: string) {
  const digits = phone.replace(/\D/g, "");
  return {
    name: !name.trim()
      ? "Please enter your name."
      : name.length > 100
        ? "Please use 100 characters or fewer."
        : "",
    phone:
      !/^\+?[\d ()-]{7,30}$/.test(phone) ||
      digits.length < 7 ||
      digits.length > 15
        ? "Please enter a valid phone number."
        : "",
  };
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const visible = digits.slice(-2);
  return `${"*".repeat(Math.max(4, digits.length - visible.length))}${visible}`;
}

export function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    PENDING: "Order received",
    CONFIRMED: "Confirmed",
    PREPARING: "Being prepared",
    READY: "Ready",
    SERVED: "Served",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return labels[status || ""] || "In progress";
}

export function buildReorderPlan(
  order: {
    items?: Array<{
      menuItemId?: string;
      itemNameSnapshot?: string;
      quantity?: number;
      modifiers?: Array<string | { id?: string; name?: string }>;
      unitPrice?: number;
    }>;
  },
  menuItems: Array<{
    id: string;
    name: string;
    price: number;
    currency?: string;
    availability?: string;
  }>,
) {
  const items: Array<{
    id: string;
    menuItem: {
      id: string;
      name: string;
      price: number;
      currency: string;
      availability?: string;
    };
    quantity: number;
    selectedModifiers: string[];
  }> = [];

  const unavailable: string[] = [];
  const priceChanges: Array<{
    name: string;
    previousPrice: number;
    currentPrice: number;
    currency: string;
  }> = [];

  for (const line of order.items ?? []) {
    const current = menuItems.find((item) => item.id === line.menuItemId);
    const fallbackName = line.itemNameSnapshot || "This item";

    if (!current) {
      unavailable.push(fallbackName);
      continue;
    }

    if (current.availability !== "AVAILABLE") {
      unavailable.push(current.name || fallbackName);
      continue;
    }

    if (
      typeof line.unitPrice === "number" &&
      line.unitPrice !== current.price
    ) {
      priceChanges.push({
        name: current.name,
        previousPrice: line.unitPrice,
        currentPrice: current.price,
        currency: current.currency || "EGP",
      });
    }

    const selectedModifiers = (line.modifiers ?? [])
      .map((modifier) =>
        typeof modifier === "string"
          ? modifier
          : modifier?.id || modifier?.name || "",
      )
      .filter(Boolean);

    const quantity = Number.isInteger(line.quantity)
      ? (line.quantity as number)
      : 1;

    items.push({
      id: `${current.id}-${selectedModifiers.join("-") || "base"}`,
      menuItem: {
        ...current,
        currency: current.currency || "EGP",
      },
      quantity,
      selectedModifiers,
    });
  }

  return {
    items,
    unavailable,
    priceChanges,
    canContinue: items.length > 0,
  };
}

export function orderError(error: unknown) {
  const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
  const messages: Record<string, string> = {
    NETWORK_ERROR:
      "We couldn't confirm your order. Your items are still saved. Try again to check the same request.",
    TIMEOUT:
      "The request took too long. Your items are still saved. Try again to check the same request.",
    ITEM_UNAVAILABLE:
      "Some items are no longer available. Please edit your order. Your items are still saved.",
    VALIDATION_ERROR:
      "Please check your information and item quantities. Your items are still saved.",
    UNAUTHORIZED:
      "Your customer session needs to be restored. Please check your details and try again.",
    SESSION_EXPIRED:
      "Please scan your table's QR code again. Your items are still saved.",
    FORBIDDEN:
      "Your table couldn't be verified. Please scan its QR code again.",
    NOT_FOUND:
      "This order or café could not be found. Please check the details and try again.",
    CONFLICT:
      "This request conflicts with an earlier update. Your items are still saved; refresh and try again.",
    RATE_LIMITED:
      "There have been too many requests. Please wait a moment and try again.",
    SERVER_ERROR:
      "The service is temporarily unavailable. Your items are still saved. Please try again.",
    MALFORMED_RESPONSE:
      "The service returned an unexpected response. Your items are still saved. Please check the same request again.",
    API_CONFIGURATION_ERROR:
      "The service is not configured correctly. Please contact the café team.",
    ACCESS_TOKEN_UNAVAILABLE:
      "Your customer session could not be prepared. Please try again.",
  };
  return (
    messages[code] ||
    "We couldn't place your order. Your items are still saved. Please try again."
  );
}
