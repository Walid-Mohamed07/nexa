import { randomUUID } from 'node:crypto';

const visitRegistry = new Map();

export function resolveTimeContext(currentTime = new Date()) {
    const hour = Number(currentTime?.getUTCHours?.() ?? 12);
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
}

export function resolveDayContext(currentTime = new Date()) {
    const day = Number(currentTime?.getUTCDay?.() ?? 1);
    return day === 0 || day === 6 ? 'weekend' : 'weekday';
}

export function resolveVisit({
    cafeId,
    branchId,
    tableId,
    customerId = null,
    sessionId = null,
    startedAt = new Date().toISOString(),
}) {
    const key = `${cafeId}:${branchId}:${tableId}:${customerId ?? 'guest'}:${sessionId ?? 'anonymous'}`;
    const existing = visitRegistry.get(key);
    if (existing) {
        return existing;
    }

    const visit = {
        id: randomUUID(),
        cafeId,
        branchId,
        tableId,
        customerId,
        sessionId,
        startedAt,
        state: 'ACTIVE',
    };

    visitRegistry.set(key, visit);
    return visit;
}

export function buildRecommendations({
    menu,
    customerId,
    preferences = [],
    recentOrders = [],
    timeContext = 'afternoon',
    occasion = 'study',
    currentItemIds = [],
}) {
    const availableItems = (menu?.data?.items ?? []).filter((item) => item?.availability === 'AVAILABLE');
    const itemMap = new Map(availableItems.map((item) => [item.id, item]));
    const preferenceCategorySet = new Set(
        (preferences ?? [])
            .filter((entry) => entry?.source === 'EXPLICIT' || entry?.source === 'SYSTEM_DEFAULT')
            .map((entry) => entry?.value)
            .filter(Boolean),
    );

    const explicitCategoryIds = [];
    if (preferenceCategorySet.has('coffee')) explicitCategoryIds.push('coffee');
    if (preferenceCategorySet.has('cold')) explicitCategoryIds.push('cold');
    if (preferenceCategorySet.has('desserts')) explicitCategoryIds.push('desserts');
    if (preferenceCategorySet.has('breakfast')) explicitCategoryIds.push('breakfast');

    const recentItemIds = (recentOrders ?? [])
        .map((entry) => entry?.itemId)
        .filter((itemId) => itemId && itemMap.has(itemId));

    const picks = new Map();

    const addPick = (itemId, source, reason, priority) => {
        if (!itemId || !itemMap.has(itemId)) return;
        const current = picks.get(itemId);
        if (!current || priority > current.priority) {
            picks.set(itemId, {
                id: itemId,
                itemId,
                title: itemMap.get(itemId).name,
                reason,
                source,
                priority,
                type: source,
            });
        }
    };

    const featuredIds = availableItems.filter((item) => item.featured).map((item) => item.id);
    const popularIds = ['item_2', 'item_1'];
    const seasonalIds = ['item_7'];
    const occasionIds = timeContext === 'afternoon' ? ['item_5'] : ['item_7'];

    for (const itemId of featuredIds) addPick(itemId, 'FEATURED', 'Popular at NEXA', 1);
    for (const itemId of popularIds) addPick(itemId, 'POPULAR', 'Popular at NEXA', 2);
    for (const itemId of seasonalIds) addPick(itemId, 'SEASONAL', 'Seasonal favorite', 3);
    for (const itemId of occasionIds) addPick(itemId, 'OCCASION', `Perfect for ${occasion || timeContext} breaks`, 4);
    for (const itemId of recentItemIds) addPick(itemId, 'RECENT', 'From your recent orders', 5);

    for (const item of availableItems) {
        if (explicitCategoryIds.includes(item.categoryId)) {
            addPick(item.id, 'EXPLICIT_PREFERENCE', 'Based on your selected preferences', 6);
        }
    }

    const filtered = [...picks.values()].filter((item) => {
        if (!currentItemIds.length) return true;
        return currentItemIds.includes(item.itemId);
    });

    return filtered
        .sort((left, right) => right.priority - left.priority || left.title.localeCompare(right.title))
        .map(({ id, itemId, title, reason, source, priority }) => ({
            id,
            itemId,
            title,
            reason,
            source,
            priority,
        }));
}

export { visitRegistry };
