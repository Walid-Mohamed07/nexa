"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  Home,
  ShoppingBag,
  UserRound,
} from "lucide-react";

const items = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Menu", href: "/menu", icon: BookOpen },
  { label: "Cart", href: "/order/cart", icon: ShoppingBag },
  { label: "Active order", href: "/order/active", icon: ClipboardList },
  { label: "Orders", href: "/order/history", icon: ShoppingBag },
  { label: "Account", href: "/account", icon: UserRound },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Customer navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[rgba(255,255,255,0.92)] px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto">
        {items.map(({ label, href, icon: Icon }) => {
          const current = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              aria-current={current ? "page" : undefined}
              className={`flex min-h-11 min-w-[60px] flex-1 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-1 py-2 text-[10px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 ${current ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
