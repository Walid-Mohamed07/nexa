import type { MenuItem } from "@/lib/api";

export type MenuCategorySummary = {
  id: string;
  name: string;
  count: number;
};

function normalizeCategoryLabel(categoryId: string) {
  if (!categoryId) return "Featured";

  return categoryId
    .split(/[\-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function deriveCategories(items: MenuItem[]) {
  const categories = new Map<string, MenuCategorySummary>();

  items.forEach((item) => {
    const categoryId = item.categoryId || "featured";
    const current = categories.get(categoryId) ?? {
      id: categoryId,
      name: normalizeCategoryLabel(categoryId),
      count: 0,
    };

    current.count += 1;
    categories.set(categoryId, current);
  });

  return Array.from(categories.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function groupByCategory(items: MenuItem[]) {
  const categoryMap = new Map<string, MenuItem[]>();

  items.forEach((item) => {
    const categoryId = item.categoryId || "featured";
    const existing = categoryMap.get(categoryId) ?? [];
    existing.push(item);
    categoryMap.set(categoryId, existing);
  });

  return deriveCategories(items)
    .map((category) => ({
      ...category,
      items: categoryMap.get(category.id) ?? [],
    }))
    .filter((category) => category.items.length > 0);
}

export function searchMenuItems(items: MenuItem[], query: string) {
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    return items;
  }

  return items.filter((item) => {
    const haystack = [
      item.name,
      item.description ?? "",
      item.categoryId ?? "",
      normalizeCategoryLabel(item.categoryId ?? ""),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(trimmed);
  });
}

export function formatCurrency(amount: number, currency = "EGP") {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${currency} ${safeAmount.toFixed(0)}`;
}
