// ============================================================================
// API Client for NEXA Café
// ============================================================================
// All API calls go through this abstraction so the backend can be switched by
// deployment configuration without changing feature code.
const MOCK_IDENTITY_STORAGE_KEY = "nexa-mock-identity";
const SEEDED_MOCK_IDENTITY = "mock-walid-context";
const API_TIMEOUT_MS = 15000;

export type ApiErrorKind =
  | "configuration"
  | "network"
  | "timeout"
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "rate-limited"
  | "server"
  | "http"
  | "malformed-response";

const ERROR_CODES_BY_STATUS: Record<number, string> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
};

function errorKindForStatus(status: number): ApiErrorKind {
  if (status === 400) return "validation";
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "server";
  return "http";
}

function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configured) {
    throw new ApiError(
      "API_CONFIGURATION_ERROR",
      "configuration",
      undefined,
      undefined,
      "The API endpoint is not configured.",
    );
  }

  try {
    const url = new URL(configured);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    ) {
      throw new Error("Invalid API URL");
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new ApiError(
      "API_CONFIGURATION_ERROR",
      "configuration",
      undefined,
      undefined,
      "The API endpoint configuration is invalid.",
    );
  }
}

let accessTokenProvider:
  | (() => string | null | undefined | Promise<string | null | undefined>)
  | undefined;

/**
 * Allows a future auth integration to supply a short-lived access token
 * without storing credentials in browser storage or creating another auth state.
 */
export function setApiAccessTokenProvider(
  provider:
    | (() => string | null | undefined | Promise<string | null | undefined>)
    | undefined,
) {
  accessTokenProvider = provider;
}

function mockIdentityFor(customerId?: string) {
  if (
    process.env.NODE_ENV !== "development" ||
    typeof window === "undefined"
  ) {
    return null;
  }
  try {
    return (
      window.sessionStorage.getItem(MOCK_IDENTITY_STORAGE_KEY) ||
      (customerId === "customer_walid" ? SEEDED_MOCK_IDENTITY : null)
    );
  } catch {
    return null;
  }
}

function withMockIdentity(customerId: string | undefined, init?: RequestInit) {
  if (process.env.NODE_ENV !== "development") return init;
  const headers = new Headers(init?.headers);
  const identity = mockIdentityFor(customerId);
  if (identity) headers.set("X-Mock-Identity", identity);
  return { ...init, headers };
}

export function clearMockIdentityContext() {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(MOCK_IDENTITY_STORAGE_KEY);
  } catch {}
}

export class ApiError extends Error {
  readonly name = "ApiError";

  constructor(
    public readonly code: string,
    public readonly kind: ApiErrorKind = "http",
    public readonly status?: number,
    public readonly requestId?: string,
    message = "The request could not be completed.",
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedErrorCode(value: unknown, fallback: string): string {
  return typeof value === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(value)
    ? value
    : fallback;
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  captureMockIdentity = false,
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("X-Request-ID") && globalThis.crypto?.randomUUID) {
    headers.set("X-Request-ID", globalThis.crypto.randomUUID());
  }

  if (process.env.NODE_ENV === "development") {
    const identity = mockIdentityFor();
    if (identity) headers.set("X-Mock-Identity", identity);
  }

  if (!headers.has("Authorization") && accessTokenProvider) {
    try {
      const token = await accessTokenProvider();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    } catch {
      throw new ApiError(
        "ACCESS_TOKEN_UNAVAILABLE",
        "configuration",
        undefined,
        headers.get("X-Request-ID") || undefined,
        "Customer authentication could not be prepared. Please try again.",
      );
    }
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      method: init?.method || "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (error) {
    const isTimeout =
      isRecord(error) &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    throw new ApiError(
      isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
      isTimeout ? "timeout" : "network",
      undefined,
      headers.get("X-Request-ID") || undefined,
      isTimeout
        ? "The request timed out. Please try again."
        : "The service could not be reached. Check your connection and try again.",
    );
  }

  const requestId =
    response.headers.get("X-Request-ID") ||
    response.headers.get("Request-ID") ||
    headers.get("X-Request-ID") ||
    undefined;
  let body: unknown;
  try {
    const text = await response.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    if (response.ok) {
      throw new ApiError(
        "MALFORMED_RESPONSE",
        "malformed-response",
        response.status,
        requestId,
        "The service returned an invalid response. Please try again.",
      );
    }
  }

  if (!response.ok) {
    const fallbackCode = ERROR_CODES_BY_STATUS[response.status] ||
      (response.status >= 500 ? "SERVER_ERROR" : "HTTP_ERROR");
    const apiError = isRecord(body) && isRecord(body.error) ? body.error : {};
    const code = normalizedErrorCode(apiError.code, fallbackCode);
    throw new ApiError(
      code,
      errorKindForStatus(response.status),
      response.status,
      requestId,
    );
  }

  if (!isRecord(body) || !Object.prototype.hasOwnProperty.call(body, "data")) {
    throw new ApiError(
      "MALFORMED_RESPONSE",
      "malformed-response",
      response.status,
      requestId,
      "The service returned an unexpected response. Please try again.",
    );
  }

  if (
    captureMockIdentity &&
    process.env.NODE_ENV === "development" &&
    typeof window !== "undefined"
  ) {
    const identity = response.headers.get("X-Mock-Identity");
    if (identity) {
      try {
        window.sessionStorage.setItem(MOCK_IDENTITY_STORAGE_KEY, identity);
      } catch {}
    }
  }
  return body as T;
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface Cafe {
  id: string;
  name: string;
  description?: string;
  currency?: string;
  timezone?: string;
  logo?: string;
  status?: string;
  googlePlaceId?: string;
  googleReviewUrl?: string;
}

export interface Branch {
  id: string;
  cafeId?: string;
  name: string;
  address?: string;
  phone?: string;
  timezone?: string;
  status?: string;
}

export interface Table {
  id: string;
  branchId: string;
  name: string;
  capacity?: number;
  status?: string;
}

export interface Session {
  id: string;
  status: string;
  customerId?: string | null;
  startedAt?: string;
  lastActivityAt?: string;
  cafeId: string;
  branchId?: string;
  tableId?: string;
}

export interface Visit {
  id: string;
  cafeId: string;
  branchId: string;
  tableId: string;
  customerId?: string | null;
  sessionId?: string | null;
  startedAt: string;
  state: "ACTIVE" | "COMPLETED" | "EXPIRED";
}

export interface QrResolveResponse {
  data: {
    cafe: Cafe;
    branch: Branch;
    table: Table;
    session: Session;
  };
}

export interface VisitResolveResponse {
  data: Visit;
  meta?: Record<string, unknown>;
}

export interface MenuCategory {
  id: string;
  cafeId?: string;
  name: string;
  sortOrder?: number;
}

export interface MenuItem {
  id: string;
  categoryId?: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  currency: string;
  availability?: string;
  featured?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuResponse {
  data: {
    items: MenuItem[];
    categories?: MenuCategory[];
  };
  meta?: Record<string, unknown>;
}

export type CafeHomeSectionType =
  | "FEATURED"
  | "POPULAR"
  | "NEW"
  | "SEASONAL"
  | "OCCASION";

export type RecommendationSource =
  | "FEATURED"
  | "POPULAR"
  | "SEASONAL"
  | "OCCASION"
  | "RECENT"
  | "EXPLICIT_PREFERENCE";

export interface CustomerPreference {
  id: string;
  customerId: string;
  preferenceType: "category" | "drink" | "flavor" | "dietary";
  value: string;
  source: "EXPLICIT" | "SYSTEM_DEFAULT";
  createdAt: string;
  updatedAt?: string;
}

export interface Recommendation {
  id: string;
  itemId: string;
  title: string;
  reason: string;
  source: RecommendationSource;
  priority: number;
}

export interface CafeHomeSection {
  id: string;
  type: CafeHomeSectionType;
  title: string;
  description?: string;
  image?: string;
  categoryId?: string;
  ctaLabel?: string;
  items: MenuItem[];
}

export interface CafeHomeResponse {
  data: {
    sections: CafeHomeSection[];
    categories: MenuCategory[];
  };
  meta?: Record<string, unknown>;
}

// ============================================================================
// API Endpoints
// ============================================================================

export async function fetchCafeContext(cafeId: string) {
  return fetchJson<{ data: Cafe }>(
    `/api/v1/cafes/${encodeURIComponent(cafeId)}`,
  );
}

export async function fetchMenu(cafeId: string) {
  return fetchJson<MenuResponse>(
    `/api/v1/cafes/${encodeURIComponent(cafeId)}/menu`,
  );
}

export async function fetchCafeHome(cafeId: string, branchId: string) {
  const query = new URLSearchParams({ branchId });
  return fetchJson<CafeHomeResponse>(
    `/api/v1/cafes/${encodeURIComponent(cafeId)}/home?${query.toString()}`,
  );
}

export async function fetchSession(sessionId: string) {
  return fetchJson<{ data: Session }>(
    `/api/v1/sessions/${encodeURIComponent(sessionId)}`,
  );
}

export async function fetchVisitResolve(input: {
  cafeId: string;
  branchId: string;
  tableId: string;
  customerId?: string | null;
  sessionId?: string | null;
}) {
  const query = new URLSearchParams({
    cafeId: input.cafeId,
    branchId: input.branchId,
    tableId: input.tableId,
  });

  if (input.customerId) query.set("customerId", input.customerId);
  if (input.sessionId) query.set("sessionId", input.sessionId);

  return fetchJson<VisitResolveResponse>(
    `/api/v1/visits/resolve?${query.toString()}`,
    input.customerId ? withMockIdentity(input.customerId) : undefined,
  );
}

export async function fetchRecommendations(input: {
  cafeId: string;
  branchId: string;
  customerId?: string | null;
  visitId?: string | null;
  timeContext?: string;
  occasion?: string;
}) {
  const query = new URLSearchParams({ branchId: input.branchId });
  if (input.customerId) query.set("customerId", input.customerId);
  if (input.visitId) query.set("visitId", input.visitId);
  if (input.timeContext) query.set("timeContext", input.timeContext);
  if (input.occasion) query.set("occasion", input.occasion);

  return fetchJson<{ data: Recommendation[] }>(
    `/api/v1/cafes/${encodeURIComponent(input.cafeId)}/recommendations?${query.toString()}`,
    input.customerId ? withMockIdentity(input.customerId) : undefined,
  );
}

export async function fetchCustomerPreferences(customerId: string) {
  return fetchJson<{ data: CustomerPreference[] }>(
    `/api/v1/customers/${encodeURIComponent(customerId)}/preferences`,
    withMockIdentity(customerId),
  );
}

export async function saveCustomerPreference(
  customerId: string,
  payload: Pick<CustomerPreference, "preferenceType" | "value" | "source">,
) {
  return fetchJson<{ data: CustomerPreference }>(
    `/api/v1/customers/${encodeURIComponent(customerId)}/preferences`,
    withMockIdentity(customerId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function clearCustomerPreferences(customerId: string) {
  return fetchJson<{ data: CustomerPreference[] }>(
    `/api/v1/customers/${encodeURIComponent(customerId)}/preferences`,
    withMockIdentity(customerId, { method: "DELETE" }),
  );
}

export async function fetchOrdersByCustomer(customerId: string) {
  return fetchJson<{ data: Order[] }>(
    `/api/v1/customers/${encodeURIComponent(customerId)}/orders`,
    withMockIdentity(customerId),
  );
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
}
export interface OrderItemRequest {
  menuItemId: string;
  quantity: number;
  modifiers?: Record<string, unknown>[];
}
export interface CreateOrderRequest {
  cafeId: string;
  branchId: string;
  tableId: string;
  sessionId: string;
  customerId: string;
  items: OrderItemRequest[];
}
export interface Order
  extends Omit<CreateOrderRequest, "items" | "customerId"> {
  customerId: string | null;
  id: string;
  orderNumber: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY"
    | "SERVED"
    | "COMPLETED"
    | "CANCELLED";
  subtotal: number;
  total: number;
  currency: string;
  createdAt: string;
  items: (OrderItemRequest & {
    id: string;
    itemNameSnapshot: string;
    unitPrice: number;
    total: number;
  })[];
}

export interface CustomerFeedback {
  id: string;
  customerId: string;
  visitId?: string | null;
  orderId: string;
  cafeId: string;
  branchId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export function fetchCustomerFeedback(customerId: string) {
  return fetchJson<{ data: CustomerFeedback[] }>(
    `/api/v1/customers/${encodeURIComponent(customerId)}/feedback`,
    withMockIdentity(customerId),
  );
}

export function createCustomer(customer: Pick<Customer, "name" | "phone">) {
  return fetchJson<{ data: Customer }>(
    "/api/v1/customers",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    },
    true,
  );
}
export function fetchCustomer(id: string) {
  return fetchJson<{ data: Customer }>(
    `/api/v1/customers/${encodeURIComponent(id)}`,
    withMockIdentity(id),
  );
}
export function createOrder(payload: CreateOrderRequest, key: string) {
  return fetchJson<{ data: Order }>("/api/v1/orders", {
    ...withMockIdentity(payload.customerId, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify(payload),
    }),
  });
}
export function fetchOrder(id: string, customerId?: string) {
  return fetchJson<{ data: Order }>(
    `/api/v1/orders/${encodeURIComponent(id)}`,
    withMockIdentity(customerId),
  );
}

export function submitOrderReview(
  orderId: string,
  payload: { rating: number; comment?: string; visitId?: string | null },
  customerId: string | undefined,
  idempotencyKey: string,
) {
  return fetchJson<{ data: CustomerFeedback }>(
    `/api/v1/orders/${encodeURIComponent(orderId)}/review`,
    withMockIdentity(customerId, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    }),
  );
}

export async function fetchQrResolve(
  token: string,
): Promise<QrResolveResponse> {
  const response = await fetchJson<QrResolveResponse>(
    `/api/v1/qr/${encodeURIComponent(token)}/resolve`,
  );
  const data = response.data as unknown;
  const hasFields = (value: unknown, fields: string[]) =>
    isRecord(value) && fields.every((field) => typeof value[field] === "string");
  if (
    !isRecord(data) ||
    !hasFields(data.cafe, ["id", "name"]) ||
    !hasFields(data.branch, ["id", "name"]) ||
    !hasFields(data.table, ["id", "branchId", "name"]) ||
    !hasFields(data.session, ["id", "cafeId", "status"])
  ) {
    throw new ApiError(
      "MALFORMED_RESPONSE",
      "malformed-response",
      undefined,
      undefined,
      "The QR service returned incomplete café context.",
    );
  }
  return response;
}
