const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/lib/api.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function loadApi({
  env = {
    NODE_ENV: "test",
    NEXT_PUBLIC_API_URL: "https://api.example.test/",
  },
  fetchImpl = async () =>
    new Response(JSON.stringify({ data: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  storage = new Map(),
} = {}) {
  const sandbox = {
    exports: {},
    require: () => ({}),
    process: { env },
    fetch: fetchImpl,
    Headers,
    Response,
    AbortSignal,
    URL,
    URLSearchParams,
    crypto: { randomUUID: () => "request-test-id" },
    window: {
      sessionStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      },
    },
  };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.exports;
}

async function expectApiError(promise, { code, kind, status }) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.name, "ApiError");
    assert.equal(error.code, code);
    assert.equal(error.kind, kind);
    assert.equal(error.status, status);
    return true;
  });
}

test("API requests use configured origin, explicit method, encoded IDs and correlation ID", async () => {
  let request;
  const api = loadApi({
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ data: { id: "cafe-1", name: "NEXA" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  await api.fetchCafeContext("cafe/one");

  assert.equal(
    request.url,
    "https://api.example.test/api/v1/cafes/cafe%2Fone",
  );
  assert.equal(request.init.method, "GET");
  assert.equal(request.init.cache, "no-store");
  assert.equal(request.init.headers.get("Accept"), "application/json");
  assert.equal(request.init.headers.get("X-Request-ID"), "request-test-id");
});

test("QR resolution rejects incomplete nested context", async () => {
  const api = loadApi({
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          data: {
            cafe: { id: "cafe-1", name: "NEXA" },
            table: { id: "table-1", branchId: "branch-1", name: "T1" },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  });
  await expectApiError(api.fetchQrResolve("table-1"), {
    code: "MALFORMED_RESPONSE",
    kind: "malformed-response",
    status: undefined,
  });
});

test("write requests preserve JSON bodies and idempotency headers", async () => {
  let request;
  const api = loadApi({
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ data: { id: "order-1" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  const payload = {
    cafeId: "cafe-1",
    branchId: "branch-1",
    tableId: "table-1",
    sessionId: "session-1",
    customerId: "customer-1",
    items: [{ menuItemId: "item-1", quantity: 1 }],
  };

  await api.createOrder(payload, "retry-key-1");

  assert.equal(request.url, "https://api.example.test/api/v1/orders");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.get("Content-Type"), "application/json");
  assert.equal(request.init.headers.get("Idempotency-Key"), "retry-key-1");
  assert.deepEqual(JSON.parse(request.init.body), payload);
});

test("API errors preserve status categories without exposing backend messages", async () => {
  const cases = [
    [400, "VALIDATION_ERROR", "validation"],
    [401, "UNAUTHORIZED", "unauthenticated"],
    [403, "FORBIDDEN", "forbidden"],
    [404, "NOT_FOUND", "not-found"],
    [409, "CONFLICT", "conflict"],
    [429, "RATE_LIMITED", "rate-limited"],
    [503, "SERVER_ERROR", "server"],
  ];

  for (const [status, code, kind] of cases) {
    const api = loadApi({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            error: { code, message: "private database details" },
          }),
          { status, headers: { "Content-Type": "application/json" } },
        ),
    });
    await assert.rejects(api.fetchCafeContext("cafe-1"), (error) => {
      assert.equal(error.code, code);
      assert.equal(error.kind, kind);
      assert.equal(error.status, status);
      assert.doesNotMatch(error.message, /private database details/);
      return true;
    });
  }
});

test("API distinguishes network failures and timeouts", async () => {
  const networkApi = loadApi({
    fetchImpl: async () => {
      throw new TypeError("socket failed");
    },
  });
  await expectApiError(networkApi.fetchCafeContext("cafe-1"), {
    code: "NETWORK_ERROR",
    kind: "network",
    status: undefined,
  });

  const timeoutApi = loadApi({
    fetchImpl: async () => {
      throw new DOMException("deadline", "TimeoutError");
    },
  });
  await expectApiError(timeoutApi.fetchCafeContext("cafe-1"), {
    code: "TIMEOUT",
    kind: "timeout",
    status: undefined,
  });
});

test("API rejects invalid JSON and unexpected success envelopes", async () => {
  const malformedJsonApi = loadApi({
    fetchImpl: async () => new Response("{", { status: 200 }),
  });
  await expectApiError(malformedJsonApi.fetchCafeContext("cafe-1"), {
    code: "MALFORMED_RESPONSE",
    kind: "malformed-response",
    status: 200,
  });

  const missingDataApi = loadApi({
    fetchImpl: async () =>
      new Response(JSON.stringify({ result: [] }), { status: 200 }),
  });
  await expectApiError(missingDataApi.fetchCafeContext("cafe-1"), {
    code: "MALFORMED_RESPONSE",
    kind: "malformed-response",
    status: 200,
  });
});

test("API endpoint configuration is required and production origins use HTTPS", async () => {
  const missingApi = loadApi({ env: { NODE_ENV: "production" } });
  await expectApiError(missingApi.fetchCafeContext("cafe-1"), {
    code: "API_CONFIGURATION_ERROR",
    kind: "configuration",
    status: undefined,
  });

  const insecureProductionApi = loadApi({
    env: {
      NODE_ENV: "production",
      NEXT_PUBLIC_API_URL: "http://api.example.test",
    },
  });
  await expectApiError(insecureProductionApi.fetchCafeContext("cafe-1"), {
    code: "API_CONFIGURATION_ERROR",
    kind: "configuration",
    status: undefined,
  });
});

test("mock identity is development-only and production bearer credentials are supplied in memory", async () => {
  const headersByMode = {};
  const fetchImpl = async (url, init) => {
    headersByMode[url.includes("prod") ? "production" : "development"] =
      init.headers;
    return new Response(JSON.stringify({ data: { id: "customer_walid" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const developmentApi = loadApi({
    env: {
      NODE_ENV: "development",
      NEXT_PUBLIC_API_URL: "http://localhost:4010",
    },
    fetchImpl,
  });
  await developmentApi.fetchCustomer("customer_walid");
  assert.equal(
    headersByMode.development.get("X-Mock-Identity"),
    "mock-walid-context",
  );

  const productionApi = loadApi({
    env: {
      NODE_ENV: "production",
      NEXT_PUBLIC_API_URL: "https://prod.example.test",
    },
    fetchImpl,
    storage: new Map([["nexa-mock-identity", "must-not-be-sent"]]),
  });
  productionApi.setApiAccessTokenProvider(() => "short-lived-test-token");
  await productionApi.fetchCustomer("customer_walid");
  assert.equal(headersByMode.production.get("X-Mock-Identity"), null);
  assert.equal(
    headersByMode.production.get("Authorization"),
    "Bearer short-lived-test-token",
  );
});
