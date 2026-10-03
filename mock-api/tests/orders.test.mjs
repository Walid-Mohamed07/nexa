import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { app } from '../src/server.js';

test('provides a deterministic returning customer with order history and an active order', async context => {
    const server = app.listen(0);
    context.after(() => server.close());
    const base = `http://localhost:${server.address().port}/api/v1`;
    const identity = { 'X-Mock-Identity': 'mock-walid-context' };
    const customer = await fetch(base + '/customers/customer_walid', { headers: identity }).then(response => response.json());
    const orders = await fetch(base + '/customers/customer_walid/orders', { headers: identity }).then(response => response.json());
    const activeOrder = await fetch(base + '/orders/order_walid_1', { headers: identity }).then(response => response.json());
    assert.equal(customer.data.name, 'Walid Hassan');
    assert.equal(orders.data[0].orderNumber, 'NX-1000');
    const historicalOrder = orders.data.find(order => order.id === 'order_walid_2');
    assert.equal(historicalOrder.items[0].unitPrice, 105);
    assert.equal(historicalOrder.items[1].menuItemId, 'item_8');
    assert.equal(activeOrder.data.status, 'PREPARING');
});

test('customer and order contract over HTTP', async context => {
    const server = app.listen(0);
    context.after(() => server.close());
    const base = `http://localhost:${server.address().port}/api/v1`;
    let identity = null;
    const request = async (path, body, key = randomUUID()) => {
        const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': key };
        if (identity) headers['X-Mock-Identity'] = identity;
        const response = await fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) });
        return { status: response.status, ...await response.json() };
    };
    for (const customer of [{ name: '', phone: '1234567' }, { name: 'Guest', phone: 'abc' }, { name: 'Guest', phone: '12' }]) {
        assert.equal((await request('/customers', customer)).error.code, 'VALIDATION_ERROR');
    }
    const customerResponse = await fetch(base + '/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test Guest', phone: '+20 (100) 123-4567' }) });
    const customer = (await customerResponse.json()).data;
    identity = customerResponse.headers.get('X-Mock-Identity');
    const resolved = await fetch(base + '/qr/table-12/resolve').then(response => response.json());
    assert.equal(resolved.data.cafe.googleReviewUrl, 'https://www.google.com/search?q=NEXA+Caf%C3%A9+Cairo');
    const payload = { cafeId: resolved.data.cafe.id, branchId: resolved.data.branch.id, tableId: resolved.data.table.id, sessionId: resolved.data.session.id, customerId: customer.id, items: [{ menuItemId: 'item_1', quantity: 2, unitPrice: 0 }, { menuItemId: 'item_6', quantity: 1 }] };
    const key = randomUUID();
    const [first, replay] = await Promise.all([request('/orders', payload, key), request('/orders', payload, key)]);
    assert.equal(first.status, 201);
    assert.equal(first.data.total, 320);
    assert.equal(first.data.subtotal, 320);
    assert.equal(first.data.tableId, 'table_12');
    assert.equal(first.data.customerId, customer.id);
    assert.equal(first.data.items[0].unitPrice, 125);
    assert.equal(first.data.id, replay.data.id);
    assert.equal((await request('/orders', { ...payload, items: [] }, key)).error.code, 'VALIDATION_ERROR');
    for (const quantity of [0, -1, 1.5, 100, '2']) {
        assert.equal((await request('/orders', { ...payload, items: [{ menuItemId: 'item_1', quantity }] })).error.code, 'VALIDATION_ERROR');
    }
    assert.equal((await request('/orders', { ...payload, items: [] })).error.code, 'VALIDATION_ERROR');
    assert.equal((await request('/orders', { ...payload, items: [{ menuItemId: 'item_8', quantity: 1 }] })).error.code, 'ITEM_UNAVAILABLE');
    assert.equal((await request('/orders', { ...payload, items: [{ menuItemId: 'unknown', quantity: 1 }] })).error.code, 'ITEM_UNAVAILABLE');
    assert.equal((await request('/orders', { ...payload, tableId: 'table_99' })).error.code, 'FORBIDDEN');
    assert.equal((await request('/orders', { ...payload, sessionId: 'expired' })).error.code, 'SESSION_EXPIRED');
    assert.equal((await request('/orders', { ...payload, customerId: 'unknown' })).error.code, 'FORBIDDEN');
    const history = await fetch(base + `/customers/${customer.id}/orders`, { headers: { 'X-Mock-Identity': identity } }).then(response => response.json());
    assert.equal(history.data.length, 1);
    const stored = await fetch(base + `/orders/${first.data.id}`, { headers: { 'X-Mock-Identity': identity } }).then(response => response.json());
    assert.deepEqual(stored.data, first.data);
    assert.equal((await fetch(base + '/qr/unknown/resolve')).status, 400);
});

test('mock customer identity denies anonymous and cross-customer private data access', async context => {
    const server = app.listen(0);
    context.after(() => server.close());
    const base = `http://localhost:${server.address().port}/api/v1`;
    const walidIdentity = { 'X-Mock-Identity': 'mock-walid-context' };
    const anonymousOrders = await fetch(base + '/customers/customer_walid/orders');
    assert.equal(anonymousOrders.status, 401);

    const ownOrders = await fetch(base + '/customers/customer_walid/orders', { headers: walidIdentity });
    assert.equal(ownOrders.status, 200);

    const ownPreferences = await fetch(base + '/customers/customer_walid/preferences', { headers: walidIdentity });
    assert.equal(ownPreferences.status, 200);
    const ownPreferenceWrite = await fetch(base + '/customers/customer_walid/preferences', {
        method: 'POST',
        headers: { ...walidIdentity, 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferenceType: 'category', value: 'coffee', source: 'EXPLICIT' })
    });
    assert.equal(ownPreferenceWrite.status, 201);
    assert.equal((await fetch(base + '/customers/customer_walid/preferences')).status, 401);
    assert.equal((await fetch(base + '/customers/customer_walid')).status, 401);
    assert.equal((await fetch(base + '/customers/customer_walid/favorites')).status, 401);
    assert.equal((await fetch(base + '/customers/customer_walid/favorites', { headers: walidIdentity })).status, 200);
    assert.equal((await fetch(base + '/customers/customer_walid/feedback')).status, 401);
    assert.deepEqual((await fetch(base + '/customers/customer_walid/feedback', { headers: walidIdentity }).then(response => response.json())).data, []);

    const customerBResponse = await fetch(base + '/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Customer B', phone: '+20 100 111 2233' })
    });
    const customerB = (await customerBResponse.json()).data;
    const customerBIdentity = customerBResponse.headers.get('X-Mock-Identity');

    const crossCustomerOrders = await fetch(base + `/customers/${customerB.id}/orders`, { headers: walidIdentity });
    assert.equal(crossCustomerOrders.status, 403);

    const crossCustomerPreferences = await fetch(base + `/customers/${customerB.id}/preferences`, { headers: walidIdentity });
    assert.equal(crossCustomerPreferences.status, 403);
    assert.equal((await fetch(base + `/customers/${customerB.id}/feedback`, { headers: walidIdentity })).status, 403);

    const crossCustomerPreferenceWrite = await fetch(base + `/customers/${customerB.id}/preferences`, {
        method: 'POST',
        headers: { ...walidIdentity, 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferenceType: 'category', value: 'coffee', source: 'EXPLICIT' })
    });
    assert.equal(crossCustomerPreferenceWrite.status, 403);

    const ownOrderDetails = await fetch(base + '/orders/order_walid_1', { headers: walidIdentity });
    assert.equal(ownOrderDetails.status, 200);

    const crossCustomerOrderDetails = await fetch(base + '/orders/order_walid_1', { headers: { 'X-Mock-Identity': customerBIdentity } });
    assert.equal(crossCustomerOrderDetails.status, 403);

    const visitUrl = `${base}/visits/resolve?cafeId=cafe_nexa&branchId=branch_1&tableId=table_12&customerId=customer_walid&sessionId=session_guest_1`;
    const visit = await fetch(visitUrl, { headers: walidIdentity }).then(response => response.json());
    const reviewPayload = { rating: 5, comment: 'Good', visitId: visit.data.id };
    const reviewKey = randomUUID();
    const ownReview = await fetch(base + '/orders/order_walid_2/review', {
        method: 'POST',
        headers: { ...walidIdentity, 'Content-Type': 'application/json', 'Idempotency-Key': reviewKey },
        body: JSON.stringify(reviewPayload)
    });
    assert.equal(ownReview.status, 201);
    const feedback = (await ownReview.json()).data;
    assert.equal(feedback.customerId, 'customer_walid');
    assert.equal(feedback.orderId, 'order_walid_2');
    assert.equal(feedback.cafeId, 'cafe_nexa');
    assert.equal(feedback.branchId, 'branch_1');
    assert.equal(feedback.visitId, visit.data.id);

    const replay = await fetch(base + '/orders/order_walid_2/review', {
        method: 'POST',
        headers: { ...walidIdentity, 'Content-Type': 'application/json', 'Idempotency-Key': reviewKey },
        body: JSON.stringify(reviewPayload)
    });
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).data.id, feedback.id);

    const conflictingReplay = await fetch(base + '/orders/order_walid_2/review', {
        method: 'POST',
        headers: { ...walidIdentity, 'Content-Type': 'application/json', 'Idempotency-Key': reviewKey },
        body: JSON.stringify({ ...reviewPayload, rating: 4 })
    });
    assert.equal(conflictingReplay.status, 409);

    const duplicateForOrder = await fetch(base + '/orders/order_walid_2/review', {
        method: 'POST',
        headers: { ...walidIdentity, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
        body: JSON.stringify({ rating: 3 })
    });
    assert.equal(duplicateForOrder.status, 200);
    assert.equal((await duplicateForOrder.json()).data.id, feedback.id);

    const activeOrderFeedback = await fetch(base + '/orders/order_walid_1/review', {
        method: 'POST',
        headers: { ...walidIdentity, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
        body: JSON.stringify({ rating: 5 })
    });
    assert.equal(activeOrderFeedback.status, 409);
    assert.equal((await activeOrderFeedback.json()).error.code, 'FEEDBACK_NOT_ELIGIBLE');

    for (const rating of [0, 1.5, 6]) {
        const invalid = await fetch(base + '/orders/order_walid_1/review', {
            method: 'POST',
            headers: { ...walidIdentity, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
            body: JSON.stringify({ rating })
        });
        assert.equal(invalid.status, 400);
    }
    const excessiveComment = await fetch(base + '/orders/order_walid_1/review', {
        method: 'POST',
        headers: { ...walidIdentity, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
        body: JSON.stringify({ rating: 5, comment: 'x'.repeat(1001) })
    });
    assert.equal(excessiveComment.status, 400);

    const ownFeedback = await fetch(base + '/customers/customer_walid/feedback', { headers: walidIdentity }).then(response => response.json());
    assert.equal(ownFeedback.data.length, 1);
    assert.equal(ownFeedback.data[0].id, feedback.id);

    const otherReview = await fetch(base + '/orders/order_walid_1/review', {
        method: 'POST',
        headers: { 'X-Mock-Identity': customerBIdentity, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
        body: JSON.stringify({ rating: 5, comment: 'Unauthorized' })
    });
    assert.equal(otherReview.status, 403);

    const unauthorizedOrderDetails = await fetch(base + '/orders/order_walid_1');
    assert.equal(unauthorizedOrderDetails.status, 401);

    assert.equal((await fetch(visitUrl)).status, 401);
    assert.equal((await fetch(visitUrl, { headers: walidIdentity })).status, 200);
});