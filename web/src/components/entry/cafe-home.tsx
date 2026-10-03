"use client";

import Link from "next/link";
import Image from "next/image";
import * as React from "react";
import { ArrowRight, ArrowUpRight, Coffee, ReceiptText } from "lucide-react";
import {
  FadeUp,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/motion-utils";
import { useEntry } from "@/lib/entry-context";
import { useOrder } from "@/lib/order-context";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { statusLabel } from "@/lib/order-helpers";
import { deriveCategories, formatCurrency } from "@/lib/menu-helpers";
import {
  fetchCafeHome,
  fetchMenu,
  fetchRecommendations,
  fetchOrdersByCustomer,
  type CafeHomeResponse,
  type CafeHomeSection,
  type MenuCategory,
  type MenuResponse,
  type Order,
  type Recommendation,
} from "@/lib/api";
import { resolveTimeContext } from "@/lib/recommendation-context";
import { TableBadge } from "./table-badge";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { OrderAgainButton } from "@/components/order/order-again-button";

type HomeData = CafeHomeResponse["data"];
const HOME_IMAGE_FALLBACK = "/images/nexa-cafe-still-life.svg";

function DiscoveryImage({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);

  return (
    <Image
      src={failed || !src ? HOME_IMAGE_FALLBACK : src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      onError={() => setFailed(true)}
      className="object-cover"
    />
  );
}

function fallbackCategories(menu: MenuResponse): MenuCategory[] {
  if (menu.data.categories?.length) return menu.data.categories;
  return deriveCategories(menu.data.items).map((category, index) => ({
    id: category.id,
    name: category.name,
    sortOrder: index + 1,
  }));
}

function DiscoveryItemLink({
  item,
  label,
}: {
  item: CafeHomeSection["items"][number];
  label?: string;
}) {
  return (
    <Link
      href={`/menu?item=${encodeURIComponent(item.id)}`}
      aria-label={`${label || "View item"}: ${item.name}`}
      className="group block w-[min(78vw,280px)] shrink-0 snap-start overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-shadow hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] md:w-auto"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-elevated)]">
        <DiscoveryImage
          src={item.image}
          alt={item.name}
          sizes="(max-width: 768px) 78vw, 280px"
        />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="wrap-break-word font-semibold text-[var(--color-text)]">
            {item.name}
          </h3>
          <span className="shrink-0 text-sm font-semibold">
            {formatCurrency(item.price, item.currency)}
          </span>
        </div>
        {item.description ? (
          <p className="line-clamp-2 text-sm leading-6 text-[var(--color-text-muted)]">
            {item.description}
          </p>
        ) : null}
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">
          {label || "View item"}
          <ArrowUpRight size={15} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

function DiscoverySection({ section }: { section: CafeHomeSection }) {
  return (
    <section aria-labelledby={`discovery-${section.id}`} className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2
            id={`discovery-${section.id}`}
            className="text-xl font-semibold text-[var(--color-text)] sm:text-2xl"
          >
            {section.title}
          </h2>
          {section.description ? (
            <p className="max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
              {section.description}
            </p>
          ) : null}
        </div>
        {section.categoryId ? (
          <Link
            href={`/menu?category=${encodeURIComponent(section.categoryId)}`}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            {section.ctaLabel || "Explore"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {section.items.length ? (
        <div
          aria-label={`${section.title} menu items`}
          tabIndex={0}
          className="-mx-4 grid snap-x snap-mandatory auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3 overflow-x-auto px-4 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] sm:mx-0 sm:px-0 md:grid-flow-row md:grid-cols-3 md:overflow-visible"
        >
          {section.items.map((item) => (
            <DiscoveryItemLink key={item.id} item={item} />
          ))}
        </div>
      ) : section.categoryId ? (
        <Link
          href={`/menu?category=${encodeURIComponent(section.categoryId)}`}
          className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          {section.ctaLabel || "Explore category"}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}

export function CafeHome() {
  const { state } = useEntry();
  const flow = useOrder();
  const [discovery, setDiscovery] = React.useState<HomeData | null>(null);
  const [recommendations, setRecommendations] = React.useState<
    Recommendation[]
  >([]);
  const [customerOrders, setCustomerOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  const customerId = flow.customer?.id;

  React.useEffect(() => {
    if (state.status !== "resolved") return;
    let active = true;
    setLoading(true);
    setError(false);

    fetchCafeHome(state.cafe.id, state.branch.id)
      .then((response) => {
        if (active) setDiscovery(response.data);
      })
      .catch(async () => {
        if (!active) return;
        setError(true);
        try {
          const menu = await fetchMenu(state.cafe.id);
          if (active) {
            setDiscovery({
              sections: [],
              categories: fallbackCategories(menu),
            });
          }
        } catch {
          if (active) setDiscovery({ sections: [], categories: [] });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    fetchRecommendations({
      cafeId: state.cafe.id,
      branchId: state.branch.id,
      customerId: flow.customer?.id,
      visitId: state.visit?.id,
      timeContext: resolveTimeContext(),
    })
      .then((response) => {
        if (active) setRecommendations(response.data);
      })
      .catch(() => {
        if (active) setRecommendations([]);
      });

    return () => {
      active = false;
    };
  }, [state, flow.customer?.id, retry]);

  React.useEffect(() => {
    if (!customerId) {
      setCustomerOrders([]);
      return;
    }

    let active = true;
    fetchOrdersByCustomer(customerId)
      .then((response) => {
        const nextOrders = response.data
          .filter((order) => order.customerId === customerId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        if (active) setCustomerOrders(nextOrders);
      })
      .catch(() => {
        if (active) setCustomerOrders([]);
      });

    return () => {
      active = false;
    };
  }, [customerId]);

  if (state.status !== "resolved") {
    return null;
  }

  const { cafe, table } = state;
  const firstName = flow.customer?.name.trim().split(/\s+/)[0];
  const activeOrder =
    flow.customer &&
    flow.order?.customerId === flow.customer.id &&
    !["COMPLETED", "CANCELLED"].includes(flow.order.status)
      ? flow.order
      : customerOrders.find(
          (order) => !["COMPLETED", "CANCELLED"].includes(order.status),
        ) || null;
  const recentOrder = customerOrders[0];
  const featured = discovery?.sections.find(
    (section) => section.type === "FEATURED",
  );
  const featuredItem = featured?.items[0];
  const otherSections = discovery?.sections.filter(
    (section) => section.type !== "FEATURED",
  );

  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-primary)]/10 p-2">
              <Coffee
                className="h-5 w-5 text-[var(--color-primary)]"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-text)]">
              {cafe.name}
            </h1>
          </div>
          <p className="hidden text-sm text-[var(--color-text-muted)] sm:block">
            {state.branch.name}
          </p>
          <TableBadge />
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-7 pb-32 sm:space-y-14 sm:px-6 sm:py-10 lg:px-8">
        <FadeUp className="grid items-end gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-medium text-[var(--color-text-muted)]">
              {firstName
                ? `A good day at your table, ${firstName}.`
                : `Welcome to ${cafe.name}`}
            </p>
            <h2 className="wrap-break-word text-3xl font-semibold text-[var(--color-text)] sm:text-4xl">
              {firstName
                ? `Welcome back, ${firstName}`
                : "A good day starts here."}
            </h2>
            <p className="max-w-xl text-base leading-7 text-[var(--color-text-muted)]">
              Coffee, fresh bakes, and a little room to find your next favorite.
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {state.branch.name} · {table.name}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:min-w-52">
            <Link
              href="/menu"
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              Explore Menu <ArrowRight size={18} aria-hidden="true" />
            </Link>
            {activeOrder ? (
              <Link
                href="/order/active"
                onClick={() => {
                  try {
                    window.sessionStorage.setItem(
                      "nexa-order-id",
                      activeOrder.id,
                    );
                  } catch {}
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <ReceiptText size={16} aria-hidden="true" />
                Your order {activeOrder.orderNumber} ·{" "}
                {statusLabel(activeOrder.status)}
              </Link>
            ) : null}
          </div>
        </FadeUp>

        {recentOrder ? (
          <section
            aria-labelledby="order-again-home"
            className="flex flex-wrap items-center justify-between gap-4 border-y border-[var(--color-border)] py-5"
          >
            <div>
              <h2
                id="order-again-home"
                className="font-semibold text-[var(--color-text)]"
              >
                Order again
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {recentOrder.items
                  .map((item) => item.itemNameSnapshot)
                  .join(", ")}
              </p>
            </div>
            <OrderAgainButton order={recentOrder} size="md" />
          </section>
        ) : null}

        {recommendations.length ? (
          <section aria-labelledby="recommended-for-you" className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Helpful picks
                </p>
                <h2
                  id="recommended-for-you"
                  className="text-xl font-semibold text-[var(--color-text)] sm:text-2xl"
                >
                  Recommended for you
                </h2>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recommendations.map((item) => (
                <Link
                  key={item.id}
                  href={`/menu?item=${encodeURIComponent(item.itemId)}`}
                  className="group block min-h-24 w-[min(76vw,260px)] shrink-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-shadow hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    {item.source.replace("_", " ")}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-[var(--color-text)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                    {item.reason}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">
                    View item <ArrowUpRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {featured && featuredItem ? (
          <FadeUp>
            <section
              aria-labelledby={`featured-${featured.id}`}
              className="grid overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] md:grid-cols-[1.05fr_0.95fr]"
            >
              <div className="relative aspect-[4/3] min-h-56 bg-[var(--color-surface-elevated)] md:aspect-auto md:min-h-[360px]">
                <DiscoveryImage
                  src={featured.image || featuredItem.image}
                  alt={featuredItem.name}
                  priority
                  sizes="(max-width: 768px) 100vw, 55vw"
                />
              </div>
              <div className="flex flex-col justify-center gap-5 p-5 sm:p-8 lg:p-10">
                <Badge variant="primary">Featured today</Badge>
                <div className="space-y-3">
                  <h2
                    id={`featured-${featured.id}`}
                    className="wrap-break-word text-2xl font-semibold text-[var(--color-text)] sm:text-3xl"
                  >
                    {featured.title}
                  </h2>
                  {featured.description ? (
                    <p className="max-w-lg leading-7 text-[var(--color-text-muted)]">
                      {featured.description}
                    </p>
                  ) : null}
                  <p className="font-medium text-[var(--color-text)]">
                    {featuredItem.name} ·{" "}
                    {formatCurrency(featuredItem.price, featuredItem.currency)}
                  </p>
                </div>
                <Link
                  href={`/menu?item=${encodeURIComponent(featuredItem.id)}`}
                  className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  {featured.ctaLabel || "View item"}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </section>
          </FadeUp>
        ) : null}

        <section aria-labelledby="home-categories" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Find your usual, or something new
              </p>
              <h2
                id="home-categories"
                className="mt-1 text-xl font-semibold sm:text-2xl"
              >
                Browse the menu
              </h2>
            </div>
            <Link
              href="/menu"
              className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              All menu <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          {discovery?.categories.length ? (
            <nav aria-label="Menu categories" className="overflow-x-auto pb-2">
              <div className="flex min-w-max gap-2">
                {discovery.categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/menu?category=${encodeURIComponent(category.id)}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </nav>
          ) : null}
        </section>

        {error ? (
          <ErrorState
            title="Today's café picks couldn't load."
            description="You can still browse the menu and its categories."
            action={
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                Try again
              </button>
            }
          />
        ) : null}

        {loading && !discovery ? (
          <section aria-label="Loading café discoveries" className="space-y-4">
            <Skeleton className="h-7 w-48" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="aspect-[4/3] w-full" />
            </div>
          </section>
        ) : null}

        {discovery?.sections.length ? (
          <StaggerContainer className="space-y-10 sm:space-y-12">
            {otherSections?.map((section) => (
              <StaggerItem key={section.id}>
                <DiscoverySection section={section} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        ) : null}

        {!loading && discovery && !discovery.sections.length && !error ? (
          <EmptyState
            title="A good place to start."
            description="Today's picks are taking a quiet moment. Explore the menu and find something made for you."
          />
        ) : null}

        <section className="max-w-2xl space-y-3 border-t border-[var(--color-border)] pt-6">
          <h2 className="text-sm font-semibold uppercase text-[var(--color-text-muted)]">
            About {cafe.name}
          </h2>
          <p className="leading-7 text-[var(--color-text-muted)]">
            {cafe.description ||
              "A modern café experience crafted for coffee lovers and those who appreciate fine details in every cup."}
          </p>
        </section>
      </div>

      <MobileBottomNav />
    </main>
  );
}
