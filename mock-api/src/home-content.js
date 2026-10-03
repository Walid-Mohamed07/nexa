export function selectActiveHomeSections(entries, now = new Date(), branchId) {
    const timestamp = now.getTime();

    return entries
        .filter((entry) => {
            if (entry.status !== 'ACTIVE') return false;
            if (entry.branchId && branchId && entry.branchId !== branchId) return false;

            const startsAt = entry.startsAt ? Date.parse(entry.startsAt) : Number.NEGATIVE_INFINITY;
            const endsAt = entry.endsAt ? Date.parse(entry.endsAt) : Number.POSITIVE_INFINITY;
            return Number.isFinite(startsAt) || startsAt === Number.NEGATIVE_INFINITY
                ? (Number.isFinite(endsAt) || endsAt === Number.POSITIVE_INFINITY) && startsAt <= timestamp && endsAt >= timestamp
                : false;
        })
        .sort((left, right) => left.priority - right.priority);
}

export function buildCafeHomeResponse(entries, menu, now = new Date(), branchId) {
    const categories = menu.data.categories ?? [];
    const categoryIds = new Set(categories.map((category) => category.id));
    const menuItems = new Map(menu.data.items.map((item) => [item.id, item]));
    const sections = selectActiveHomeSections(entries, now, branchId)
        .map((entry) => {
            const items = (entry.menuItemIds ?? [])
                .map((id) => menuItems.get(id))
                .filter((item) => item?.availability === 'AVAILABLE');
            const categoryId = categoryIds.has(entry.categoryId) ? entry.categoryId : undefined;

            if (!items.length && !categoryId) return null;

            return {
                id: entry.id,
                type: entry.type,
                title: entry.title,
                description: entry.description,
                image: entry.image,
                categoryId,
                ctaLabel: entry.ctaLabel,
                items
            };
        })
        .filter(Boolean);

    return { sections, categories };
}