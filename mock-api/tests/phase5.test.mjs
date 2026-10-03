import test from 'node:test';
import assert from 'node:assert/strict';

import {
    resolveTimeContext,
    resolveDayContext,
    resolveVisit,
    buildRecommendations,
} from '../src/recommendation-foundation.js';
import { app } from '../src/server.js';

const menu = {
    data: {
        categories: [
            { id: 'coffee', name: 'Coffee', sortOrder: 1 },
            { id: 'desserts', name: 'Desserts', sortOrder: 2 },
            { id: 'cold', name: 'Cold Drinks', sortOrder: 3 },
        ],
        items: [
            { id: 'item_1', name: 'Iced Spanish Latte', categoryId: 'coffee', availability: 'AVAILABLE', price: 125 },
            { id: 'item_2', name: 'Cappuccino', categoryId: 'coffee', availability: 'AVAILABLE', price: 95 },
            { id: 'item_5', name: 'Berry Cheesecake', categoryId: 'desserts', availability: 'AVAILABLE', price: 135 },
            { id: 'item_7', name: 'Iced Hibiscus Tea', categoryId: 'cold', availability: 'AVAILABLE', price: 65 },
            { id: 'item_8', name: 'Cold Brew', categoryId: 'cold', availability: 'UNAVAILABLE', price: 90 },
        ],
    },
};

test('time and day context resolve deterministically', () => {
    assert.equal(resolveTimeContext(new Date('2026-10-01T09:00:00Z')), 'morning');
    assert.equal(resolveTimeContext(new Date('2026-10-01T13:00:00Z')), 'afternoon');
    assert.equal(resolveTimeContext(new Date('2026-10-01T19:00:00Z')), 'evening');
    assert.equal(resolveDayContext(new Date('2026-09-30T12:00:00Z')), 'weekday');
    assert.equal(resolveDayContext(new Date('2026-10-04T12:00:00Z')), 'weekend');
});

test('visit resolution is idempotent and remains active', () => {
    const first = resolveVisit({
        cafeId: 'cafe_nexa',
        branchId: 'branch_1',
        tableId: 'table_12',
        customerId: 'customer_walid',
        sessionId: 'session_guest_1',
    });
    const second = resolveVisit({
        cafeId: 'cafe_nexa',
        branchId: 'branch_1',
        tableId: 'table_12',
        customerId: 'customer_walid',
        sessionId: 'session_guest_1',
    });

    assert.equal(first.id, second.id);
    assert.equal(first.state, 'ACTIVE');
    assert.equal(first.customerId, 'customer_walid');
});

test('recommendations are deterministic, deduplicated, and availability-aware', () => {
    const results = buildRecommendations({
        menu,
        customerId: 'customer_walid',
        preferences: [{ preferenceType: 'category', value: 'coffee', source: 'EXPLICIT' }],
        recentOrders: [{ itemId: 'item_1' }, { itemId: 'item_7' }],
        timeContext: 'afternoon',
        occasion: 'study',
        currentItemIds: ['item_1', 'item_2', 'item_5', 'item_7'],
    });

    assert.ok(results.length >= 3);
    assert.equal(results.filter((item) => item.id === 'item_1').length, 1);
    assert.ok(results.every((item) => item.type !== 'AI'));
    assert.ok(results.every((item) => item.reason));
    assert.ok(results.every((item) => item.itemId !== 'item_8'));
});

test('recommendation API returns explainable recommendations', async (context) => {
    const server = app.listen(0);
    context.after(() => server.close());
    const base = `http://localhost:${server.address().port}/api/v1`;
    const personalizedUrl = `${base}/cafes/cafe_nexa/recommendations?branchId=branch_1&customerId=customer_walid&timeContext=afternoon`;
    assert.equal((await fetch(personalizedUrl)).status, 401);
    const response = await fetch(personalizedUrl, { headers: { 'X-Mock-Identity': 'mock-walid-context' } });
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.ok(result.data.length > 0);
    assert.ok(result.data.every((item) => ['FEATURED', 'POPULAR', 'SEASONAL', 'OCCASION', 'RECENT', 'EXPLICIT_PREFERENCE'].includes(item.source)));
    assert.ok(result.data.every((item) => item.reason && item.reason.length > 0));
    assert.ok(result.data.every((item) => item.itemId));

    const guest = await fetch(`${base}/cafes/cafe_nexa/recommendations?branchId=branch_1`);
    assert.equal(guest.status, 200);
});
