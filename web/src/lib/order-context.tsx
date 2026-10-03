"use client";

import * as React from "react";
import {
  ApiError,
  clearMockIdentityContext,
  createCustomer,
  createOrder,
  fetchCustomer,
  fetchOrder,
  type Customer,
  type Order,
  type CreateOrderRequest,
} from "./api";
import { useCart } from "./cart";
import { useEntry } from "./entry-context";
import { clearFeedbackClientState, orderError } from "./order-helpers";

type Attempt = { key: string; payload: CreateOrderRequest };
function readStored<T>(key: string, fallback: T): T {
  try {
    const stored = sessionStorage.getItem(key);
    if (stored === null) return fallback;

    try {
      return (JSON.parse(stored) ?? fallback) as T;
    } catch {
      return stored as unknown as T;
    }
  } catch {
    return fallback;
  }
}
function store(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function removeStored(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

function useOrderState() {
  const { state } = useEntry();
  const cart = useCart();
  const [draft, setDraftState] = React.useState({ name: "", phone: "" });
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [order, setOrder] = React.useState<Order | null>(null);
  const [orderCustomer, setOrderCustomer] = React.useState<Customer | null>(
    null,
  );
  const [customerLoading, setCustomerLoading] = React.useState(true);
  const [customerRestoreError, setCustomerRestoreError] = React.useState("");
  const [ready, setReady] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [uncertain, setUncertain] = React.useState(false);
  const lock = React.useRef(false);
  const attempt = React.useRef<Attempt | null>(null);

  const restoreCustomer = React.useCallback(async () => {
    const customerId = readStored<string | null>("nexa-customer-id", null);
    if (!customerId) {
      setCustomer(null);
      setCustomerLoading(false);
      setCustomerRestoreError("");
      return false;
    }

    setCustomerLoading(true);
    setCustomerRestoreError("");
    try {
      const result = await fetchCustomer(customerId);
      setCustomer(result.data);
      setDraftState({ name: result.data.name, phone: result.data.phone });
      return true;
    } catch {
      setCustomer(null);
      setCustomerRestoreError(
        "We couldn't restore your details. Please try again or continue as a new customer.",
      );
      return false;
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!order) return;
    let active = true;
    if (customer?.id === order.customerId) {
      setOrderCustomer(customer);
      return;
    }
    setOrderCustomer(null);
    if (!order.customerId) return;
    fetchCustomer(order.customerId)
      .then((result) => {
        if (active) setOrderCustomer(result.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [order, customer]);

  React.useEffect(() => {
    let active = true;
    setDraftState(readStored("nexa-customer-draft", { name: "", phone: "" }));
    attempt.current = readStored<Attempt | null>("nexa-order-attempt", null);
    setUncertain(Boolean(attempt.current));
    async function restore() {
      const orderId = readStored<string | null>("nexa-order-id", null);
      const customerId = readStored<string | null>("nexa-customer-id", null);
      const customerTask = restoreCustomer();
      const orderTask = (async () => {
        if (orderId) {
          try {
            const result = await fetchOrder(orderId, customerId || undefined);
            if (active) setOrder(result.data);
          } catch {
            if (active)
              setError(
                "We couldn't load your previous order. Please check with the cafe team.",
              );
          }
        }
      })();
      await Promise.all([customerTask, orderTask]);
      if (active) setReady(true);
    }
    void restore();
    return () => {
      active = false;
    };
  }, [restoreCustomer]);

  const setDraft = (next: typeof draft) => {
    setDraftState(next);
    store("nexa-customer-draft", next);
  };
  async function saveCustomer() {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (
        !customer ||
        customer.name !== draft.name.trim() ||
        customer.phone !== draft.phone
      ) {
        const result = await createCustomer({
          name: draft.name.trim(),
          phone: draft.phone,
        });
        setCustomer(result.data);
        store("nexa-customer-id", result.data.id);
      }
      return true;
    } catch (failure) {
      setError(orderError(failure));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function clearCustomerContext() {
    if (lock.current || uncertain) return;
    setCustomer(null);
    setOrder(null);
    setOrderCustomer(null);
    setDraftState({ name: "", phone: "" });
    setCustomerRestoreError("");
    setError("");
    attempt.current = null;
    setUncertain(false);
    removeStored("nexa-customer-id");
    removeStored("nexa-customer-draft");
    clearMockIdentityContext();
    clearFeedbackClientState();
    removeStored("nexa-order-id");
    removeStored("nexa-order-attempt");
  }

  async function submit() {
    if (
      lock.current ||
      state.status !== "resolved" ||
      !customer ||
      !cart.items.length
    )
      return false;
    lock.current = true;
    setBusy(true);
    setError("");
    const payload: CreateOrderRequest = {
      cafeId: state.cafe.id,
      branchId: state.branch.id,
      tableId: state.table.id,
      sessionId: state.session.id,
      customerId: customer.id,
      items: cart.items.map((item) => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        modifiers: item.selectedModifiers.map((id) => ({ id })),
      })),
    };
    if (
      attempt.current &&
      JSON.stringify(attempt.current.payload) !== JSON.stringify(payload)
    ) {
      setError(
        "An earlier order still needs confirmation. Please check with the cafe team before placing a different order.",
      );
      lock.current = false;
      setBusy(false);
      return false;
    }
    if (!attempt.current)
      attempt.current = { key: crypto.randomUUID(), payload };
    store("nexa-order-attempt", attempt.current);
    const submittedItems = cart.items;
    try {
      const result = await createOrder(
        attempt.current.payload,
        attempt.current.key,
      );
      setOrder(result.data);
      store("nexa-order-id", result.data.id);
      cart.clearSubmittedItems(submittedItems);
      attempt.current = null;
      store("nexa-order-attempt", null);
      setUncertain(false);
      return true;
    } catch (failure) {
      const ambiguous =
        !(failure instanceof ApiError) ||
        [
          "NETWORK_ERROR",
          "TIMEOUT",
          "INTERNAL_ERROR",
          "MALFORMED_RESPONSE",
        ].includes(failure.code);
      setUncertain(ambiguous);
      if (!ambiguous) {
        attempt.current = null;
        store("nexa-order-attempt", null);
      }
      setError(orderError(failure));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    draft,
    setDraft,
    customer,
    order,
    orderCustomer,
    ready,
    customerLoading,
    customerRestoreError,
    retryCustomer: restoreCustomer,
    clearCustomerContext,
    busy,
    error,
    setError,
    uncertain,
    saveCustomer,
    submit,
  };
}

const OrderContext = React.createContext<ReturnType<
  typeof useOrderState
> | null>(null);
export function OrderProvider({ children }: { children: React.ReactNode }) {
  return (
    <OrderContext.Provider value={useOrderState()}>
      {children}
    </OrderContext.Provider>
  );
}
export function useOrder() {
  const value = React.useContext(OrderContext);
  if (!value) throw new Error("OrderProvider is required");
  return value;
}
