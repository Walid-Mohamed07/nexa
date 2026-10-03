const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/order-helpers.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
class ApiError extends Error { constructor(code) { super(code); this.code = code; } }
const stored = new Map();
const sandbox = {
    exports: {},
    require: () => ({ ApiError }),
    window: {
        crypto: { randomUUID: () => 'feedback-test-key' },
        sessionStorage: {
            getItem: key => stored.get(key) ?? null,
            setItem: (key, value) => stored.set(key, value),
            removeItem: key => stored.delete(key),
            key: index => [...stored.keys()][index] ?? null,
            get length() { return stored.size; },
        },
    },
};
vm.runInNewContext(compiled.outputText, sandbox);
const { validateCustomer, orderError, statusLabel, buildReorderPlan, isFeedbackEligible, isFeedbackDismissed, setFeedbackDismissed, getFeedbackIdempotencyKey, clearFeedbackClientState } = sandbox.exports;
const { maskPhone } = sandbox.exports;

test('name and phone validation accepts readable international formats', () => {
    for (const phone of ['01001234567', '+20 (100) 123-4567', '+44 7700 900123']) {
        assert.equal(validateCustomer('Guest', phone).phone, '');
    }
    assert.equal(validateCustomer('Guest', '01001234567').name, '');
    assert.ok(validateCustomer('  ', '1234567').name);
    assert.ok(validateCustomer('A'.repeat(101), '1234567').name);
    for (const phone of ['', 'abc', '123', '1'.repeat(16), '123abc4567']) assert.ok(validateCustomer('Guest', phone).phone);
});

test('phone masking only reveals the final two digits', () => {
    assert.equal(maskPhone('+20 (100) 123-4567'), '**********67');
});

test('errors use customer-facing messages without internal exceptions', () => {
    assert.match(orderError(new ApiError('ITEM_UNAVAILABLE')), /no longer available/);
    assert.match(orderError(new ApiError('NETWORK_ERROR')), /couldn't confirm/);
    assert.match(orderError(new Error('ECONNREFUSED')), /items are still saved/);
    assert.doesNotMatch(orderError(new Error('secret')), /secret/);
});

test('status labels map API states into customer-friendly text', () => {
    assert.equal(statusLabel('PENDING'), 'Order received');
    assert.equal(statusLabel('PREPARING'), 'Being prepared');
    assert.equal(statusLabel('READY'), 'Ready');
    assert.equal(statusLabel('COMPLETED'), 'Completed');
    assert.equal(statusLabel('CANCELLED'), 'Cancelled');
});

test('reorder plans keep current menu pricing and flag unavailable items without mutating the historical order', () => {
    const currentMenu = [
        { id: 'item_1', name: 'Iced Spanish Latte', categoryId: 'coffee', price: 105, currency: 'EGP', availability: 'AVAILABLE' },
        { id: 'item_2', name: 'Croissant', categoryId: 'breakfast', price: 75, currency: 'EGP', availability: 'AVAILABLE' },
        { id: 'item_3', name: 'Seasonal Cheesecake', categoryId: 'desserts', price: 150, currency: 'EGP', availability: 'UNAVAILABLE' },
    ];
    const order = {
        id: 'order_42',
        orderNumber: 'NX-0998',
        status: 'COMPLETED',
        total: 180,
        currency: 'EGP',
        createdAt: '2026-09-10T15:00:00Z',
        customerId: 'customer_1',
        cafeId: 'cafe_nexa',
        branchId: 'branch_1',
        tableId: 'table_12',
        sessionId: 'session_guest_1',
        items: [
            { id: 'line_1', menuItemId: 'item_1', quantity: 1, itemNameSnapshot: 'Iced Spanish Latte', unitPrice: 95, total: 95, modifiers: [] },
            { id: 'line_2', menuItemId: 'item_2', quantity: 1, itemNameSnapshot: 'Croissant', unitPrice: 75, total: 75, modifiers: [] },
            { id: 'line_3', menuItemId: 'item_3', quantity: 1, itemNameSnapshot: 'Seasonal Cheesecake', unitPrice: 150, total: 150, modifiers: [] },
        ],
    };
    const plan = buildReorderPlan(order, currentMenu);
    assert.equal(plan.items.length, 2);
    assert.equal(plan.items[0].menuItem.price, 105);
    assert.equal(plan.items[1].menuItem.price, 75);
    assert.equal(plan.unavailable[0], 'Seasonal Cheesecake');
    assert.equal(JSON.stringify(plan.priceChanges), JSON.stringify([{ name: 'Iced Spanish Latte', previousPrice: 95, currentPrice: 105, currency: 'EGP' }]));
    assert.equal(order.items[0].unitPrice, 95);
    assert.equal(order.items[0].total, 95);
});

test('feedback is eligible only for completed orders', () => {
    assert.equal(isFeedbackEligible('COMPLETED'), true);
    for (const status of ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED', 'FAILED']) {
        assert.equal(isFeedbackEligible(status), false);
    }
});

test('feedback dismissal is scoped by customer and order and can be cleared', () => {
    setFeedbackDismissed('customer_a', 'order_1', true);
    assert.equal(isFeedbackDismissed('customer_a', 'order_1'), true);
    assert.equal(isFeedbackDismissed('customer_a', 'order_2'), false);
    assert.equal(isFeedbackDismissed('customer_b', 'order_1'), false);
    assert.equal(getFeedbackIdempotencyKey('order_1'), 'feedback-test-key');
    assert.equal(getFeedbackIdempotencyKey('order_1'), 'feedback-test-key');
    clearFeedbackClientState();
    assert.equal(isFeedbackDismissed('customer_a', 'order_1'), false);
});