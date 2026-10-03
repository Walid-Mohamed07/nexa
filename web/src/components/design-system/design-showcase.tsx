"use client";

import {
  AlertCircle,
  Bell,
  Clock3,
  FlaskConical,
  Heart,
  LoaderCircle,
  MapPin,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import {
  FadeIn,
  FadeUp,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/motion-utils";

const palette = [
  ["--color-background", "#f6f0ea"],
  ["--color-surface", "#ffffff"],
  ["--color-surface-elevated", "#f3ece6"],
  ["--color-primary", "#8a5c3c"],
  ["--color-primary-hover", "#734a2d"],
  ["--color-secondary", "#d39a68"],
  ["--color-text", "#1f1a17"],
  ["--color-text-muted", "#6a5a54"],
  ["--color-border", "#e7d9ce"],
  ["--color-success", "#2e7d5c"],
  ["--color-warning", "#b36b2a"],
  ["--color-error", "#b34e3a"],
] as const;

const icons = [
  Search,
  ShoppingBag,
  Heart,
  Star,
  MapPin,
  Clock3,
  Bell,
  Sparkles,
  UtensilsCrossed,
  Zap,
  AlertCircle,
  LoaderCircle,
];

export function DesignShowcase() {
  return (
    <main className="min-h-screen bg-[var(--color-background)] px-4 pb-32 pt-8 text-[var(--color-text)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <FadeIn>
          <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-md)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="primary">Design system</Badge>
                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  NEXA Café UI Foundation
                </h1>
              </div>
              <div className="hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 sm:flex">
                <FlaskConical
                  className="h-5 w-5 text-[var(--color-primary)]"
                  aria-hidden="true"
                />
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-base text-[var(--color-text-muted)]">
              Premium warm minimalism for a mobile-first café experience.
              Thoughtful spacing, consistent motion, and a reusable component
              system for future customer journeys.
            </p>
          </section>
        </FadeIn>

        <div className="grid gap-6 lg:grid-cols-2">
          <FadeUp>
            <Card>
              <h2 className="text-xl font-semibold">Typography</h2>
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    Display
                  </p>
                  <h3 className="text-4xl font-semibold tracking-[-0.06em]">
                    Welcome back
                  </h3>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    Heading
                  </p>
                  <h4 className="text-2xl font-semibold tracking-[-0.04em]">
                    Curated for your table
                  </h4>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    Body
                  </p>
                  <p className="text-base leading-7 text-[var(--color-text-muted)]">
                    Warm coffee, well-made pastry, and a cleaner ordering ritual
                    built around the guest’s time and mood.
                  </p>
                </div>
              </div>
            </Card>
          </FadeUp>

          <FadeUp>
            <Card>
              <h2 className="text-xl font-semibold">Color system</h2>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {palette.map(([token, value]) => (
                  <div
                    key={token}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
                  >
                    <div
                      className="h-14 rounded-[var(--radius-sm)] border border-black/5"
                      style={{ background: value }}
                    />
                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                      {token}
                    </p>
                    <p className="text-xs font-medium text-[var(--color-text)]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </FadeUp>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <FadeUp>
            <Card>
              <h2 className="text-xl font-semibold">Buttons</h2>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button>Primary action</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button size="sm" icon={Sparkles}>
                  Small
                </Button>
                <Button size="lg" icon={ShoppingBag} iconPosition="right">
                  Large
                </Button>
                <Button loading>Loading</Button>
              </div>
            </Card>
          </FadeUp>

          <FadeUp>
            <Card>
              <h2 className="text-xl font-semibold">Inputs and controls</h2>
              <div className="mt-5 space-y-4">
                <Input label="Name" placeholder="Enter your name" />
                <Input
                  label="Search"
                  placeholder="Search menu"
                  helperText="Fast local discovery"
                  icon={Search}
                />
                <div className="flex gap-3">
                  <IconButton icon={Search} label="Search" />
                  <IconButton icon={Heart} label="Favorite" />
                  <IconButton icon={ShoppingBag} label="Cart" />
                </div>
              </div>
            </Card>
          </FadeUp>
        </div>

        <section className="grid gap-6 lg:grid-cols-3">
          <FadeUp>
            <Card>
              <h2 className="text-xl font-semibold">Badges</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="primary">New</Badge>
                <Badge variant="success">Available</Badge>
                <Badge variant="warning">Popular</Badge>
                <Badge variant="info">Seasonal</Badge>
              </div>
            </Card>
          </FadeUp>

          <FadeUp>
            <Card>
              <h2 className="text-xl font-semibold">Status</h2>
              <div className="mt-5 space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </Card>
          </FadeUp>

          <FadeUp>
            <Card>
              <h2 className="text-xl font-semibold">Cards</h2>
              <div className="mt-5 space-y-3">
                <CardSkeleton />
              </div>
            </Card>
          </FadeUp>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <FadeUp>
            <Card>
              <h2 className="text-xl font-semibold">Empty state</h2>
              <div className="mt-4">
                <EmptyState
                  title="No favorites yet"
                  description="Save items that you want to revisit later."
                  action={<Button variant="secondary">Explore menu</Button>}
                />
              </div>
            </Card>
          </FadeUp>

          <FadeUp>
            <Card>
              <h2 className="text-xl font-semibold">Error state</h2>
              <div className="mt-4">
                <ErrorState
                  description="We couldn’t load the latest menu items from the café."
                  action={<Button variant="secondary">Retry</Button>}
                />
              </div>
            </Card>
          </FadeUp>
        </section>

        <FadeUp>
          <Card>
            <h2 className="text-xl font-semibold">Motion philosophy</h2>
            <StaggerContainer className="mt-5 grid gap-4 sm:grid-cols-3">
              <StaggerItem>
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    Fast
                  </p>
                  <p className="mt-2 text-base font-medium">
                    Micro-interactions
                  </p>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    Normal
                  </p>
                  <p className="mt-2 text-base font-medium">
                    Card and panel transitions
                  </p>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    Slow
                  </p>
                  <p className="mt-2 text-base font-medium">
                    Page-level storytelling
                  </p>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </Card>
        </FadeUp>

        <FadeUp>
          <Card>
            <h2 className="text-xl font-semibold">Icon library</h2>
            <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-6">
              {icons.map((Icon, index) => (
                <div
                  key={`${Icon.name}-${index}`}
                  className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4"
                >
                  <Icon
                    className="h-5 w-5 text-[var(--color-primary)]"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    {Icon.displayName || "Icon"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </FadeUp>
      </div>
    </main>
  );
}
