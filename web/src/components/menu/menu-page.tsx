"use client";

import * as React from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  ArrowLeft,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { useEntry } from "@/lib/entry-context";
import { fetchMenu, type MenuCategory, type MenuItem } from "@/lib/api";
import {
  deriveCategories,
  formatCurrency,
  groupByCategory,
  searchMenuItems,
} from "@/lib/menu-helpers";
import { useCart } from "@/lib/cart";

const EMPTY_IMAGE =
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80";

export function MenuPage() {
  const { state } = useEntry();
  const {
    items: cartItems,
    subtotal,
    addItem,
    updateQuantity,
    clearCart,
    itemCount,
  } = useCart();
  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = React.useState<MenuCategory[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [selectedItem, setSelectedItem] = React.useState<MenuItem | null>(null);
  const [itemQuantity, setItemQuantity] = React.useState(1);
  const [cartOpen, setCartOpen] = React.useState(false);

  const sectionRefs = React.useRef<Record<string, HTMLElement | null>>({});
  React.useEffect(() => {
    if (!selectedItem && !cartOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(
      cartOpen ? '[aria-label="Your cart"]' : '[role="dialog"]',
    );
    const main = document.querySelector("main");
    if (main) main.inert = true;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedItem(null);
        setCartOpen(false);
      }
      if (event.key !== "Tab" || !dialog) return;
      const targets = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], input:not(:disabled)",
        ),
      );
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (main) main.inert = false;
      previous?.focus();
    };
  }, [selectedItem, cartOpen]);

  React.useEffect(() => {
    if (state.status !== "resolved") {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    fetchMenu(state.cafe.id)
      .then((response) => {
        if (!active) return;
        const items = (response.data?.items ?? []).filter(
          (item) => item.availability !== "HIDDEN",
        );
        setMenuItems(items);
        setMenuCategories(response.data?.categories ?? []);
        const params = new URLSearchParams(window.location.search);
        const requestedCategory = params.get("category");
        const requestedItemId = params.get("item");
        const requestedItem = items.find((item) => item.id === requestedItemId);
        const categoryExists = items.some(
          (item) => item.categoryId === requestedCategory,
        );

        setSelectedCategory(
          categoryExists ? requestedCategory! : (items[0]?.categoryId ?? "all"),
        );
        if (requestedItem) {
          setSelectedItem(requestedItem);
          setItemQuantity(1);
        }
      })
      .catch(() => {
        if (!active) return;
        setError("We couldn't load the menu. Please try again.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [state]);

  const filteredItems = React.useMemo(() => {
    const results = searchMenuItems(menuItems, query);

    if (query.trim() || !selectedCategory || selectedCategory === "all") {
      return results;
    }

    return results.filter((item) => item.categoryId === selectedCategory);
  }, [menuItems, query, selectedCategory]);

  const categories = React.useMemo(() => {
    const orderById = new Map(
      menuCategories.map((category) => [category.id, category.sortOrder ?? 0]),
    );
    const nameById = new Map(
      menuCategories.map((category) => [category.id, category.name]),
    );
    return deriveCategories(menuItems)
      .map((category) => ({
        ...category,
        name: nameById.get(category.id) ?? category.name,
      }))
      .sort(
        (left, right) =>
          (orderById.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
            (orderById.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name),
      );
  }, [menuItems, menuCategories]);
  const groupedItems = React.useMemo(
    () => groupByCategory(filteredItems),
    [filteredItems],
  );

  const openItemDrawer = (item: MenuItem) => {
    setSelectedItem(item);
    setItemQuantity(1);
  };

  const clearSearch = () => {
    setQuery("");
    setSelectedCategory("all");
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setTimeout(() => {
      const container = sectionRefs.current[categoryId];
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  if (state.status !== "resolved") {
    return (
      <main className="min-h-screen bg-[var(--color-background)] px-4 py-10 text-[var(--color-text)] sm:px-6">
        <div className="mx-auto max-w-md space-y-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-md)]">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Table Context
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.05em]">
            Menu unavailable
          </h1>
          <p className="text-base text-[var(--color-text-muted)]">
            Please scan the QR code at your table to access the café menu.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-[var(--color-on-primary)]"
          >
            Back to entry
          </Link>
        </div>
      </main>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="menu-page min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
        <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/home"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-sm font-medium text-[var(--color-text)]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="min-w-0">
                <p className="truncate text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {state.cafe.name}
                </p>
                <h1 className="truncate text-base font-semibold tracking-[-0.03em] sm:text-lg">
                  Our Menu
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Table
                </p>
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {state.table.name}
                </p>
              </div>
              <button
                type="button"
                aria-label="Open cart"
                onClick={() => setCartOpen(true)}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-sm)]"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                {itemCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-semibold text-[var(--color-on-primary)]">
                    {itemCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Badge
                variant="primary"
                className="inline-flex items-center gap-2"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Crafted for your table
              </Badge>
              <h2 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                Something good awaits.
              </h2>
              <p className="max-w-xl text-base text-[var(--color-text-muted)]">
                Fresh pours, comforting bites, and favorites made for slow
                moments.
              </p>
            </div>

            <div className="max-w-2xl">
              <Input
                aria-label="Search the menu"
                type="search"
                placeholder="Search the menu"
                icon={Search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                  <span>
                    Showing {filteredItems.length} result
                    {filteredItems.length === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="font-medium text-[var(--color-primary)]"
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>
          </motion.section>

          {loading ? (
            <div className="mt-8 space-y-6">
              <div className="flex gap-2 overflow-hidden">
                {[1, 2, 3, 4, 5].map((item) => (
                  <Skeleton key={item} className="h-10 w-24 rounded-full" />
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div
                    key={item}
                    className="space-y-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                  >
                    <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="mt-12">
              <ErrorState
                title="We couldn't load the menu."
                description="Please try again."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </Button>
                }
              />
            </div>
          ) : menuItems.length === 0 ? (
            <div className="mt-10">
              <EmptyState
                title="The menu is currently unavailable."
                description="Please check again shortly."
              />
            </div>
          ) : (
            <>
              <nav
                aria-label="Category navigation"
                className="mt-7 overflow-x-auto pb-1"
              >
                <div className="flex min-w-max gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={[
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200",
                      selectedCategory === "all"
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
                    ].join(" ")}
                  >
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategorySelect(category.id)}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200",
                        selectedCategory === category.id
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
                      ].join(" ")}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </nav>

              <div className="mt-8 space-y-8">
                {groupedItems.length === 0 ? (
                  <EmptyState
                    title="Nothing matched your search."
                    description="Try another item or category."
                    action={
                      <Button variant="secondary" onClick={clearSearch}>
                        Clear search
                      </Button>
                    }
                  />
                ) : (
                  groupedItems.map((section) => (
                    <section
                      key={section.id}
                      ref={(node) => {
                        sectionRefs.current[section.id] = node;
                      }}
                      className="scroll-mt-24"
                    >
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text)]">
                          {section.name}
                        </h3>
                        <span className="text-sm text-[var(--color-text-muted)]">
                          {section.items.length}
                        </span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {section.items.map((item) => {
                          const unavailable =
                            item.availability === "UNAVAILABLE" ||
                            item.availability === "HIDDEN";

                          return (
                            <motion.article
                              key={item.id}
                              layout
                              className={[
                                "overflow-hidden rounded-[var(--radius-xl)] border bg-[var(--color-surface)] shadow-[var(--shadow-sm)]",
                                unavailable
                                  ? "border-[var(--color-border)] opacity-80"
                                  : "border-[var(--color-border)]",
                              ].join(" ")}
                            >
                              <button
                                type="button"
                                onClick={() => openItemDrawer(item)}
                                className="block w-full text-left"
                                aria-label={`View details for ${item.name}`}
                              >
                                <div className="relative h-44 w-full overflow-hidden bg-[var(--color-surface-elevated)]">
                                  <Image
                                    src={item.image || EMPTY_IMAGE}
                                    alt={item.name}
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                    className="object-cover"
                                  />
                                </div>
                                <div className="space-y-3 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <h4 className="truncate text-lg font-semibold tracking-[-0.03em] text-[var(--color-text)]">
                                        {item.name}
                                      </h4>
                                      <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                                        {item.description ||
                                          "Freshly made for your table."}
                                      </p>
                                    </div>
                                    <span className="shrink-0 text-base font-semibold text-[var(--color-text)]">
                                      {formatCurrency(
                                        item.price,
                                        item.currency || "EGP",
                                      )}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between gap-3">
                                    <Badge
                                      variant={
                                        unavailable ? "warning" : "success"
                                      }
                                    >
                                      {unavailable
                                        ? "Currently unavailable"
                                        : "Available"}
                                    </Badge>
                                    <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]">
                                      View item
                                    </span>
                                  </div>
                                </div>
                              </button>
                            </motion.article>
                          );
                        })}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedItem ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/35"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="menu-sheet absolute inset-x-0 bottom-0 mx-auto max-w-2xl rounded-t-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-lg)] sm:p-6"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Details for ${selectedItem.name}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Item details
                </span>
                <button
                  type="button"
                  aria-label="Close item details"
                  onClick={() => setSelectedItem(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="overflow-hidden rounded-[var(--radius-lg)]">
                <Image
                  src={selectedItem.image || EMPTY_IMAGE}
                  alt={selectedItem.name}
                  width={1200}
                  height={600}
                  className="h-52 w-full object-cover"
                />
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text)]">
                      {selectedItem.name}
                    </h3>
                    <span className="text-lg font-semibold text-[var(--color-text)]">
                      {formatCurrency(
                        selectedItem.price,
                        selectedItem.currency || "EGP",
                      )}
                    </span>
                  </div>
                  <p className="mt-2 text-base text-[var(--color-text-muted)]">
                    {selectedItem.description || "Freshly prepared to order."}
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    Availability
                  </span>
                  <Badge
                    variant={
                      selectedItem.availability === "UNAVAILABLE"
                        ? "warning"
                        : "success"
                    }
                  >
                    {selectedItem.availability === "UNAVAILABLE"
                      ? "Currently unavailable"
                      : "Available"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Quantity
                  </p>
                  <div className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() =>
                        setItemQuantity((current) => Math.max(1, current - 1))
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text)]"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="min-w-10 text-center text-lg font-semibold text-[var(--color-text)]">
                      {itemQuantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() =>
                        setItemQuantity((current) => Math.min(99, current + 1))
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text)]"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  disabled={
                    selectedItem.availability === "UNAVAILABLE" ||
                    selectedItem.availability === "HIDDEN"
                  }
                  onClick={() => {
                    addItem(selectedItem, itemQuantity);
                    setSelectedItem(null);
                    setCartOpen(true);
                  }}
                >
                  Add to cart •{" "}
                  {formatCurrency(
                    selectedItem.price * itemQuantity,
                    selectedItem.currency || "EGP",
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30"
            onClick={() => setCartOpen(false)}
          >
            <motion.aside
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Your cart"
              className="menu-sheet absolute inset-x-0 bottom-0 mx-auto max-w-2xl rounded-t-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-lg)] sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Your bag
                  </p>
                  <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text)]">
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close cart"
                  onClick={() => setCartOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {cartItems.length === 0 ? (
                <EmptyState
                  title="Your bag is empty."
                  description="Explore the menu and find something you'll love."
                />
              ) : (
                <div className="space-y-4">
                  {cartItems.map((cartItem) => (
                    <div
                      key={cartItem.id}
                      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3"
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-background)]">
                        <Image
                          src={cartItem.menuItem.image || EMPTY_IMAGE}
                          alt={cartItem.menuItem.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--color-text)]">
                          {cartItem.menuItem.name}
                        </p>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          {formatCurrency(
                            cartItem.menuItem.price,
                            cartItem.menuItem.currency || "EGP",
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Decrease quantity for ${cartItem.menuItem.name}`}
                          onClick={() =>
                            updateQuantity(cartItem.id, cartItem.quantity - 1)
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]"
                        >
                          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-medium text-[var(--color-text)]">
                          {cartItem.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity for ${cartItem.menuItem.name}`}
                          onClick={() =>
                            updateQuantity(cartItem.id, cartItem.quantity + 1)
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
                    <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
                      <span>Subtotal</span>
                      <span className="font-semibold text-[var(--color-text)]">
                        {formatCurrency(subtotal, "EGP")}
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/order/cart"
                    className="order-primary-link w-full"
                  >
                    Review your order
                  </Link>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setCartOpen(false)}
                    >
                      Continue browsing
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        if (window.confirm("Clear all items from your bag?")) {
                          clearCart();
                          setCartOpen(false);
                        }
                      }}
                    >
                      Clear bag
                    </Button>
                  </div>
                </div>
              )}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <MobileBottomNav />
    </MotionConfig>
  );
}
