import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCafeHomeResponse, selectActiveHomeSections } from '../src/home-content.js';
import { app } from '../src/server.js';

const now = new Date('2026-10-01T12:00:00.000Z');

test('filters inactive and out-of-season content, then orders active sections by priority', () => {
    const entries = [
        { id: 'later', status: 'ACTIVE', priority: 4 },
        { id: 'inactive', status: 'INACTIVE', priority: 1 },
        { id: 'future', status: 'ACTIVE', priority: 0, startsAt: '2026-10-02T00:00:00.000Z' },
        { id: 'expired', status: 'ACTIVE', priority: 0, endsAt: '2026-09-30T23:59:59.000Z' },
        { id: 'first', status: 'ACTIVE', priority: 1, startsAt: '2026-10-01T00:00:00.000Z', endsAt: '2026-10-01T23:59:59.000Z' }
    ];

    assert.deepEqual(selectActiveHomeSections(entries, now).map((entry) => entry.id), ['first', 'later']);
});

test('home sections resolve only available menu items and valid category references', () => {
    const menu = {
        data: {
            categories: [{ id: 'coffee', name: 'Coffee', sortOrder: 1 }],
            items: [
                { id: 'item_1', name: 'Latte', availability: 'AVAILABLE' },
                { id: 'item_2', name: 'Cold brew', availability: 'UNAVAILABLE' }
            ]
        }
    };
    const entries = [
        { id: 'featured', type: 'FEATURED', title: 'Featured', status: 'ACTIVE', priority: 1, menuItemIds: ['item_1', 'item_2', 'missing'] },
        { id: 'category', type: 'OCCASION', title: 'Study break', status: 'ACTIVE', priority: 2, categoryId: 'coffee' },
        { id: 'bad-category', type: 'OCCASION', title: 'Invalid category', status: 'ACTIVE', priority: 3, categoryId: 'missing' }
    ];
    const home = buildCafeHomeResponse(entries, menu, now);

    assert.equal(home.sections.length, 2);
    assert.deepEqual(home.sections[0].items.map((item) => item.id), ['item_1']);
    assert.equal(home.sections[1].categoryId, 'coffee');
    assert.deepEqual(home.categories, menu.data.categories);
});

test('keeps category discovery useful when no content is active', () => {
    const categories = [{ id: 'coffee', name: 'Coffee', sortOrder: 1 }];
    const home = buildCafeHomeResponse([], { data: { categories, items: [] } }, now);

    assert.deepEqual(home.sections, []);
    assert.deepEqual(home.categories, categories);
});

test('café Home API returns active linked content and existing categories', async (context) => {
    const server = app.listen(0);
    context.after(() => server.close());
    const base = `http://localhost:${server.address().port}/api/v1`;
    const response = await fetch(`${base}/cafes/cafe_nexa/home?branchId=branch_1`);
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(result.data.sections.map((section) => section.type), [
        'FEATURED', 'POPULAR', 'NEW', 'SEASONAL', 'OCCASION'
    ]);
    assert.ok(result.data.sections.find((section) => section.type === 'FEATURED').items.some((item) => item.id === 'item_1'));
    assert.ok(result.data.sections.find((section) => section.type === 'OCCASION').categoryId === 'desserts');
    assert.ok(result.data.categories.some((category) => category.id === 'coffee'));

    const otherBranch = await fetch(`${base}/cafes/cafe_nexa/home?branchId=branch_other`).then((res) => res.json());
    assert.deepEqual(otherBranch.data.sections, []);
    assert.equal(otherBranch.data.categories.length, 5);
    assert.equal((await fetch(`${base}/cafes/unknown/home`)).status, 404);
});