import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { buildCafeHomeResponse } from './home-content.js';
import {
    buildRecommendations,
    resolveDayContext,
    resolveTimeContext,
    resolveVisit,
    visitRegistry,
} from './recommendation-foundation.js';

const app = express();
const port = process.env.PORT || 4010;

app.use(cors({ exposedHeaders: ['X-Mock-Identity'] }));
app.use(express.json());

const response = {
    data: {
        id: 'cafe_nexa',
        name: 'NEXA Café',
        slug: 'nexa-cafe',
        description: 'A modern café experience for coffee, desserts, and quick bites.',
        currency: 'EGP',
        timezone: 'Africa/Cairo',
        logo: 'https://images.example.com/nexa-logo.png',
        status: 'ACTIVE',
        googlePlaceId: 'ChIJXyXQ3YQq9x0R3uUu_bXxG9Q',
        googleReviewUrl: 'https://www.google.com/search?q=NEXA+Caf%C3%A9+Cairo'
    },
    meta: {}
};

const validCafeIds = new Set(['nexa-cafe', 'cafe_nexa']);
const customers = new Map();
const createdOrders = new Map();
const attempts = new Map();
const customerPreferences = new Map();
const feedbackByOrder = new Map();
const feedbackAttempts = new Map();
const returningCustomer = {
    id: 'customer_walid',
    name: 'Walid Hassan',
    phone: '+20 100 123 4567',
    createdAt: '2026-08-14T10:00:00.000Z'
};
customers.set(returningCustomer.id, returningCustomer);
const mockIdentityCustomers = new Map([['mock-walid-context', returningCustomer.id]]);
createdOrders.set('order_walid_1', {
    id: 'order_walid_1',
    orderNumber: 'NX-1000',
    cafeId: 'cafe_nexa',
    branchId: 'branch_1',
    tableId: 'table_12',
    sessionId: 'session_guest_1',
    customerId: returningCustomer.id,
    items: [
        { id: 'line_walid_1', menuItemId: 'item_1', itemNameSnapshot: 'Iced Spanish Latte', unitPrice: 105, quantity: 1, total: 105, modifiers: [] },
        { id: 'line_walid_2', menuItemId: 'item_8', itemNameSnapshot: 'Cold Brew', unitPrice: 90, quantity: 1, total: 90, modifiers: [] }
    ],
    subtotal: 195,
    total: 195,
    currency: 'EGP',
    status: 'PREPARING',
    createdAt: '2026-09-30T09:00:00.000Z'
});
createdOrders.set('order_walid_2', {
    id: 'order_walid_2',
    orderNumber: 'NX-0999',
    cafeId: 'cafe_nexa',
    branchId: 'branch_1',
    tableId: 'table_12',
    sessionId: 'session_guest_1',
    customerId: returningCustomer.id,
    items: [
        { id: 'line_walid_3', menuItemId: 'item_1', itemNameSnapshot: 'Iced Spanish Latte', unitPrice: 105, quantity: 1, total: 105, modifiers: [] },
        { id: 'line_walid_4', menuItemId: 'item_8', itemNameSnapshot: 'Cold Brew', unitPrice: 90, quantity: 1, total: 90, modifiers: [] }
    ],
    subtotal: 195,
    total: 195,
    currency: 'EGP',
    status: 'COMPLETED',
    createdAt: '2026-10-01T09:00:00.000Z'
});
const fail = (res, code, message) => res.status(400).json({ error: { code, message } });

function authorizeCustomer(req, res, customerId) {
    const identity = req.get('X-Mock-Identity');
    const authenticatedCustomerId = identity ? mockIdentityCustomers.get(identity) : null;
    if (!authenticatedCustomerId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Customer identity is required.' } });
        return false;
    }
    if (authenticatedCustomerId !== customerId) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Customer context does not own this resource.' } });
        return false;
    }
    return true;
}

function authorizeOrder(req, res, orderId) {
    const identity = req.get('X-Mock-Identity');
    const authenticatedCustomerId = identity ? mockIdentityCustomers.get(identity) : null;
    if (!authenticatedCustomerId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Customer identity is required.' } });
        return false;
    }
    const order = createdOrders.get(orderId);
    if (!order) {
        res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.', details: { orderId } } });
        return false;
    }
    if (order.customerId !== authenticatedCustomerId) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Customer context does not own this order.' } });
        return false;
    }
    return true;
}

function normalizePreference(value) {
    const normalized = String(value || '').trim().toLowerCase();
    const valid = new Set(['coffee', 'cold', 'desserts', 'breakfast']);
    return valid.has(normalized) ? normalized : null;
}

function getCustomerPreferences(customerId) {
    const all = customerPreferences.get(customerId) ?? [];
    return [...all].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

const menu = {
    data: {
        items: [
            { id: 'item_1', name: 'Iced Spanish Latte', description: 'Espresso, milk and caramel.', image: 'https://images.unsplash.com/photo-1497636577773-f1231844b336?auto=format&fit=crop&w=1200&q=80', price: 125, currency: 'EGP', categoryId: 'coffee', featured: true, availability: 'AVAILABLE' },
            { id: 'item_2', name: 'Cappuccino', description: 'Classic creamy cappuccino.', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80', price: 95, currency: 'EGP', categoryId: 'coffee', featured: true, availability: 'AVAILABLE' },
            { id: 'item_3', name: 'Americano', description: 'Bold and balanced espresso.', image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80', price: 80, currency: 'EGP', categoryId: 'coffee', featured: false, availability: 'AVAILABLE' },
            { id: 'item_4', name: 'Caramel Macchiato', description: 'Velvety milk and caramel finish.', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80', price: 110, currency: 'EGP', categoryId: 'coffee', featured: true, availability: 'AVAILABLE' },
            { id: 'item_5', name: 'Berry Cheesecake', description: 'Creamy cheesecake with berry compote.', image: '/images/nexa-cafe-still-life.svg', price: 135, currency: 'EGP', categoryId: 'desserts', featured: false, availability: 'AVAILABLE' },
            { id: 'item_6', name: 'Butter Croissant', description: 'Flaky, golden and served warm.', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80', price: 70, currency: 'EGP', categoryId: 'breakfast', featured: true, availability: 'AVAILABLE' },
            { id: 'item_7', name: 'Iced Hibiscus Tea', description: 'Bright, floral and refreshing.', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80', price: 65, currency: 'EGP', categoryId: 'teas', featured: false, availability: 'AVAILABLE' },
            { id: 'item_8', name: 'Cold Brew', description: 'Smooth and naturally sweet.', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1200&q=80', price: 90, currency: 'EGP', categoryId: 'cold', featured: true, availability: 'UNAVAILABLE' }
        ],
        categories: [
            { id: 'coffee', name: 'Coffee', sortOrder: 1 },
            { id: 'cold', name: 'Cold Drinks', sortOrder: 2 },
            { id: 'teas', name: 'Tea & Infusions', sortOrder: 3 },
            { id: 'desserts', name: 'Desserts', sortOrder: 4 },
            { id: 'breakfast', name: 'Breakfast', sortOrder: 5 }
        ]
    },
    meta: {}
};

const homeContent = [
    {
        id: 'featured_iced_spanish_latte', type: 'FEATURED', title: 'A little extra, over ice',
        description: 'Espresso, milk and caramel, made for a slower moment.',
        image: menu.data.items.find(item => item.id === 'item_1').image,
        status: 'ACTIVE', priority: 1, startsAt: '2026-01-01T00:00:00Z', endsAt: '2027-01-01T00:00:00Z',
        branchId: 'branch_1', menuItemIds: ['item_1'], ctaLabel: 'View item'
    },
    {
        id: 'popular_at_nexa', type: 'POPULAR', title: 'Popular at NEXA',
        description: 'Familiar favorites, poured and prepared with care.',
        status: 'ACTIVE', priority: 2, startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-12-31T23:59:59Z',
        branchId: 'branch_1', menuItemIds: ['item_2', 'item_1', 'item_4'], ctaLabel: 'View item'
    },
    {
        id: 'new_iced_hibiscus', type: 'NEW', title: 'A new kind of pause',
        description: 'Meet our bright, floral iced hibiscus tea.',
        image: menu.data.items.find(item => item.id === 'item_7').image,
        status: 'ACTIVE', priority: 3, startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-12-31T23:59:59Z',
        branchId: 'branch_1', menuItemIds: ['item_7'], ctaLabel: 'View item'
    },
    {
        id: 'seasonal_summer_sips', type: 'SEASONAL', title: 'The last of the long afternoons',
        description: 'A cool, floral sip for the changing season.',
        image: menu.data.items.find(item => item.id === 'item_7').image,
        status: 'ACTIVE', priority: 4, startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-10-31T23:59:59Z',
        branchId: 'branch_1', menuItemIds: ['item_7'], ctaLabel: 'View item'
    },
    {
        id: 'afternoon_favorites', type: 'OCCASION', title: 'Afternoon favorites',
        description: 'A considered pause between plans.',
        status: 'ACTIVE', priority: 5, startsAt: '2026-09-01T00:00:00Z', endsAt: '2027-01-01T00:00:00Z',
        branchId: 'branch_1', categoryId: 'desserts', menuItemIds: ['item_5'], ctaLabel: 'Explore category'
    }
];

const session = {
    data: {
        id: 'session_guest_1',
        status: 'ACTIVE',
        customerId: null,
        startedAt: '2026-09-08T10:00:00Z',
        lastActivityAt: '2026-09-08T10:42:00Z',
        cafeId: 'cafe_nexa',
        branchId: 'branch_1',
        tableId: 'table_12'
    },
    meta: {}
};

const qrResolve = {
    data: {
        cafe: response.data,
        branch: { id: 'branch_1', name: 'Downtown Branch' },
        table: { id: 'table_12', name: 'T12' },
        session: { id: 'session_guest_1', status: 'ACTIVE' }
    },
    meta: {}
};

app.get('/api/v1/health', (_, res) => {
    res.json({ ok: true, service: 'nexa mock api' });
});

app.get('/api/v1/cafes/:cafeId', (req, res) => {
    if (!validCafeIds.has(req.params.cafeId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cafe not found', details: { cafeId: req.params.cafeId } } });
    }
    return res.json(response);
});

app.get('/api/v1/cafes/:cafeId/menu', (req, res) => {
    if (!validCafeIds.has(req.params.cafeId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cafe menu not found', details: { cafeId: req.params.cafeId } } });
    }
    res.json(menu);
});

app.get('/api/v1/cafes/:cafeId/home', (req, res) => {
    if (!validCafeIds.has(req.params.cafeId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cafe home not found.', details: { cafeId: req.params.cafeId } } });
    }
    const data = buildCafeHomeResponse(homeContent, menu, new Date(), req.query.branchId);
    res.json({ data, meta: {} });
});

app.get('/api/v1/visits/resolve', (req, res) => {
    const { cafeId, branchId, tableId, customerId, sessionId } = req.query;
    if (!cafeId || !branchId || !tableId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'cafeId, branchId, and tableId are required.' } });
    }
    if (customerId && !authorizeCustomer(req, res, String(customerId))) return;

    const visit = resolveVisit({
        cafeId: String(cafeId),
        branchId: String(branchId),
        tableId: String(tableId),
        customerId: customerId ? String(customerId) : null,
        sessionId: sessionId ? String(sessionId) : null,
        startedAt: new Date().toISOString(),
    });

    res.json({
        data: visit,
        meta: {
            timeContext: resolveTimeContext(new Date()),
            dayContext: resolveDayContext(new Date()),
        },
    });
});

app.get('/api/v1/cafes/:cafeId/recommendations', (req, res) => {
    if (!validCafeIds.has(req.params.cafeId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recommendations not found.', details: { cafeId: req.params.cafeId } } });
    }

    const customerId = req.query.customerId ? String(req.query.customerId) : null;
    if (customerId && !authorizeCustomer(req, res, customerId)) return;
    const visitId = req.query.visitId ? String(req.query.visitId) : null;
    const timeContext = req.query.timeContext ? String(req.query.timeContext) : resolveTimeContext(new Date());
    const occasion = req.query.occasion ? String(req.query.occasion) : (timeContext === 'afternoon' ? 'study' : 'breakfast');
    const preferences = customerId ? getCustomerPreferences(customerId) : [];
    const recentOrders = customerId && createdOrders.size
        ? [...createdOrders.values()]
            .filter((order) => order.customerId === customerId)
            .flatMap((order) =>
                (order.items ?? []).map((item) => ({
                    itemId: item.menuItemId || item.id,
                    quantity: item.quantity || 1,
                })),
            )
        : [];

    const recommendations = buildRecommendations({
        menu,
        customerId,
        preferences,
        recentOrders,
        timeContext,
        occasion,
        currentItemIds: menu.data.items.filter((item) => item.availability === 'AVAILABLE').map((item) => item.id),
    }).slice(0, 6);

    res.json({
        data: recommendations.map((entry, index) => ({
            ...entry,
            id: visitId ? `${visitId}-${index}` : entry.id,
            priority: index + 1,
        })),
        meta: { timeContext, dayContext: resolveDayContext(new Date()), visitId },
    });
});

app.get('/api/v1/customers/:customerId/preferences', (req, res) => {
    if (!authorizeCustomer(req, res, req.params.customerId)) return;
    if (!customers.has(req.params.customerId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found', details: { customerId: req.params.customerId } } });
    }
    res.json({ data: getCustomerPreferences(req.params.customerId), meta: {} });
});

app.post('/api/v1/customers/:customerId/preferences', (req, res) => {
    if (!authorizeCustomer(req, res, req.params.customerId)) return;
    const { preferenceType, value, source = 'EXPLICIT' } = req.body || {};
    if (!customers.has(req.params.customerId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found', details: { customerId: req.params.customerId } } });
    }
    const normalizedValue = normalizePreference(value);
    if (!preferenceType || !normalizedValue || !['EXPLICIT', 'SYSTEM_DEFAULT'].includes(source)) {
        return fail(res, 'VALIDATION_ERROR', 'Use explicit preference values such as coffee, cold, desserts, or breakfast.');
    }

    const existing = getCustomerPreferences(req.params.customerId).find((entry) => entry.value === normalizedValue && entry.preferenceType === preferenceType);
    const createdAt = new Date().toISOString();
    const record = existing || {
        id: randomUUID(),
        customerId: req.params.customerId,
        preferenceType,
        value: normalizedValue,
        source,
        createdAt,
        updatedAt: createdAt,
    };

    const next = getCustomerPreferences(req.params.customerId).filter((entry) => !(entry.value === normalizedValue && entry.preferenceType === preferenceType));
    next.push({ ...record, source, updatedAt: createdAt });
    customerPreferences.set(req.params.customerId, next);

    res.status(201).json({ data: next.find((entry) => entry.value === normalizedValue && entry.preferenceType === preferenceType), meta: {} });
});

app.delete('/api/v1/customers/:customerId/preferences', (req, res) => {
    if (!authorizeCustomer(req, res, req.params.customerId)) return;
    if (!customers.has(req.params.customerId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found', details: { customerId: req.params.customerId } } });
    }
    customerPreferences.delete(req.params.customerId);
    res.json({ data: [], meta: {} });
});

app.get('/api/v1/sessions/:sessionId', (req, res) => {
    if (req.params.sessionId !== 'session_guest_1') {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found', details: { sessionId: req.params.sessionId } } });
    }
    res.json(session);
});

app.get('/api/v1/customers/:customerId/orders', (req, res) => {
    if (!authorizeCustomer(req, res, req.params.customerId)) return;
    if (!customers.has(req.params.customerId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found', details: { customerId: req.params.customerId } } });
    }
    res.json({ data: [...createdOrders.values()].filter(order => order.customerId === req.params.customerId), meta: {} });
});

app.get('/api/v1/customers/:customerId/feedback', (req, res) => {
    if (!authorizeCustomer(req, res, req.params.customerId)) return;
    if (!customers.has(req.params.customerId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found.', details: { customerId: req.params.customerId } } });
    }
    const data = [...feedbackByOrder.values()]
        .filter(feedback => feedback.customerId === req.params.customerId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    res.json({ data, meta: {} });
});

app.get('/api/v1/qr/:token/resolve', (req, res) => {
    if (req.params.token !== 'table-12') {
        return res.status(400).json({ error: { code: 'INVALID_QR', message: 'The QR code is invalid or expired.', details: { token: req.params.token } } });
    }
    res.json({ ...qrResolve, data: { ...qrResolve.data, session: session.data } });
});

app.post('/api/v1/sessions', (req, res) => {
    const { cafeId, tableId } = req.body || {};
    if (!cafeId || !tableId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Cafe ID and table ID are required.', details: { cafeId, tableId } } });
    }
    res.status(201).json({
        data: {
            id: 'session_guest_2',
            status: 'ACTIVE',
            cafeId,
            tableId,
            customerId: null,
            startedAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString()
        },
        meta: {}
    });
});

app.post('/api/v1/orders', (req, res) => {
    const payload = req.body || {};
    const { customerId } = payload;
    if (!authorizeCustomer(req, res, customerId)) return;
    const key = req.get('Idempotency-Key');
    if (!key || key.length > 200) return fail(res, 'VALIDATION_ERROR', 'A retry key is required.');
    const fingerprint = JSON.stringify(payload);
    const previous = attempts.get(key);
    if (previous) {
        if (previous.fingerprint !== fingerprint) return fail(res, 'VALIDATION_ERROR', 'Retry payload changed.');
        return res.status(201).json({ data: previous.order, meta: {} });
    }
    const { cafeId, branchId, tableId, sessionId, items } = payload;
    if (sessionId !== session.data.id || session.data.status !== 'ACTIVE') return fail(res, 'SESSION_EXPIRED', 'Please scan your table again.');
    if (cafeId !== session.data.cafeId || branchId !== session.data.branchId || tableId !== session.data.tableId) return fail(res, 'FORBIDDEN', 'Table context does not match the session.');
    if (!customers.has(customerId)) return fail(res, 'VALIDATION_ERROR', 'Customer is required.');
    if (!Array.isArray(items) || !items.length || items.length > 100) return fail(res, 'VALIDATION_ERROR', 'Choose at least one item.');
    const snapshots = [];
    for (const line of items) {
        if (!line || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99 || (line.modifiers !== undefined && (!Array.isArray(line.modifiers) || line.modifiers.length))) return fail(res, 'VALIDATION_ERROR', 'Check item quantities and options.');
        const product = menu.data.items.find(item => item.id === line.menuItemId);
        if (!product || product.availability !== 'AVAILABLE') return fail(res, 'ITEM_UNAVAILABLE', 'Some items are no longer available.');
        snapshots.push({ id: randomUUID(), menuItemId: product.id, itemNameSnapshot: product.name, unitPrice: product.price, quantity: line.quantity, total: product.price * line.quantity, modifiers: [] });
    }
    const subtotal = snapshots.reduce((sum, line) => sum + line.total, 0);
    const order = { id: randomUUID(), orderNumber: `NX-${1000 + createdOrders.size}`, cafeId, branchId, tableId, sessionId, customerId, items: snapshots, subtotal, total: subtotal, currency: 'EGP', status: 'PENDING', createdAt: new Date().toISOString() };
    createdOrders.set(order.id, order);
    attempts.set(key, { fingerprint, order });
    return res.status(201).json({ data: order, meta: {} });
});

app.get('/api/v1/orders/:orderId', (req, res) => {
    if (!authorizeOrder(req, res, req.params.orderId)) return;
    res.json({ data: createdOrders.get(req.params.orderId), meta: {} });
});

app.post('/api/v1/customers', (req, res) => {
    const { name, phone } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || typeof phone !== 'string' || !/^\+?[\d ()-]{7,30}$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15) return fail(res, 'VALIDATION_ERROR', 'Please check your name and phone number.');
    const customer = { id: randomUUID(), name: name.trim(), phone, createdAt: new Date().toISOString() };
    customers.set(customer.id, customer);
    const mockIdentity = randomUUID();
    mockIdentityCustomers.set(mockIdentity, customer.id);
    res.set('X-Mock-Identity', mockIdentity);
    res.status(201).json({ data: customer, meta: {} });
});

app.get('/api/v1/customers/:customerId', (req, res) => {
    if (!authorizeCustomer(req, res, req.params.customerId)) return;
    const customer = customers.get(req.params.customerId);
    if (!customer) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found.' } });
    res.json({ data: customer, meta: {} });
});

app.get('/api/v1/customers/:customerId/favorites', (req, res) => {
    if (!authorizeCustomer(req, res, req.params.customerId)) return;
    if (!customers.has(req.params.customerId)) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found.' } });
    res.json({
        data: [
            { id: 'favorite_1', customerId: req.params.customerId, itemId: 'item_1', itemName: 'Iced Spanish Latte' },
            { id: 'favorite_2', customerId: req.params.customerId, itemId: 'item_5', itemName: 'Cheesecake' }
        ],
        meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 }
    });
});

app.post('/api/v1/customers/:customerId/favorites', (req, res) => {
    if (!authorizeCustomer(req, res, req.params.customerId)) return;
    if (!customers.has(req.params.customerId)) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found.' } });
    const { itemId } = req.body || {};
    if (!itemId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'itemId is required.', details: {} } });
    }
    res.status(201).json({ data: { id: 'favorite_new', customerId: req.params.customerId, itemId }, meta: {} });
});

app.delete('/api/v1/customers/:customerId/favorites/:itemId', (req, res) => {
    if (!authorizeCustomer(req, res, req.params.customerId)) return;
    if (!customers.has(req.params.customerId)) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found.' } });
    res.status(204).send();
});

app.post('/api/v1/orders/:orderId/review', (req, res) => {
    if (!authorizeOrder(req, res, req.params.orderId)) return;
    const order = createdOrders.get(req.params.orderId);
    const key = req.get('Idempotency-Key');
    if (!key || key.length > 200) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'An idempotency key is required.' } });
    }
    const { rating, comment = '', visitId = null } = req.body || {};
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof comment !== 'string' || comment.length > 1000) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Rating must be 1 to 5 and comment must be 1000 characters or fewer.' } });
    }

    const normalizedComment = comment.trim();
    const fingerprint = JSON.stringify({ orderId: order.id, rating, comment: normalizedComment, visitId });
    const priorAttempt = feedbackAttempts.get(key);
    if (priorAttempt) {
        if (priorAttempt.fingerprint !== fingerprint || priorAttempt.orderId !== order.id) {
            return res.status(409).json({ error: { code: 'IDEMPOTENCY_CONFLICT', message: 'This idempotency key was already used for different feedback.' } });
        }
        return res.status(200).json({ data: priorAttempt.feedback, meta: {} });
    }

    const existingFeedback = feedbackByOrder.get(order.id);
    if (existingFeedback) {
        feedbackAttempts.set(key, { fingerprint, orderId: order.id, feedback: existingFeedback });
        return res.status(200).json({ data: existingFeedback, meta: {} });
    }
    if (order.status !== 'COMPLETED') {
        return res.status(409).json({ error: { code: 'FEEDBACK_NOT_ELIGIBLE', message: 'Feedback is available after an order is completed.' } });
    }

    if (visitId) {
        const visit = [...visitRegistry.values()].find(entry => entry.id === visitId);
        if (!visit || visit.cafeId !== order.cafeId || visit.branchId !== order.branchId || visit.tableId !== order.tableId || visit.sessionId !== order.sessionId || (visit.customerId && visit.customerId !== order.customerId)) {
            return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Visit context does not match this order.' } });
        }
    }

    const feedback = {
        id: randomUUID(),
        customerId: order.customerId,
        visitId,
        orderId: order.id,
        cafeId: order.cafeId,
        branchId: order.branchId,
        rating,
        comment: normalizedComment,
        createdAt: new Date().toISOString(),
    };
    feedbackByOrder.set(order.id, feedback);
    feedbackAttempts.set(key, { fingerprint, orderId: order.id, feedback });
    res.status(201).json({ data: feedback, meta: {} });
});

export { app };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    app.listen(port, () => console.log(`NEXA Mock API listening on http://localhost:${port}`));
}
