import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveCategories, formatCurrency, searchMenuItems, groupByCategory } from '../src/lib/menu-helpers.js';

const items = [
    { id: 'item_1', name: 'Iced Spanish Latte', description: 'Espresso, milk and caramel.', categoryId: 'coffee', price: 125, currency: 'EGP', availability: 'AVAILABLE', image: 'https://images.unsplash.com/photo-1497636577773-f1231844b336' },
    { id: 'item_2', name: 'Cappuccino', description: 'Classic creamy cappuccino.', categoryId: 'coffee', price: 95, currency: 'EGP', availability: 'AVAILABLE' },
    { id: 'item_3', name: 'Berry Cheesecake', description: 'Creamy cheesecake with berry compote.', categoryId: 'desserts', price: 135, currency: 'EGP', availability: 'UNAVAILABLE' },
];

test('deriveCategories builds friendly labels from category ids', () => {
    assert.deepEqual(deriveCategories(items).map((category) => category.id), ['coffee', 'desserts']);
    assert.equal(deriveCategories(items)[0].name, 'Coffee');
});

test('searchMenuItems matches item names and descriptions', () => {
    const results = searchMenuItems(items, 'latte');
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'item_1');
});

test('groupByCategory keeps items sorted by category', () => {
    const grouped = groupByCategory(items);
    assert.equal(grouped[0].items.length, 2);
    assert.equal(grouped[1].items[0].name, 'Berry Cheesecake');
});

test('formatCurrency returns a coffee-ready string', () => {
    assert.equal(formatCurrency(95, 'EGP'), 'EGP 95');
});
