"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { moreModules, primaryNav, sidebarNav } from "@/lib/modules";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/more") {
    return (
      pathname === "/more" ||
      moreModules.some(({ slug }) => pathname.startsWith(`/${slug}`))
    );
  }
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
    >
      <ul className="grid grid-cols-5">
        {primaryNav.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <Icon aria-hidden size={22} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-line bg-surface p-4 md:flex print:hidden"
    >
      <p className="px-3 pt-2 font-semibold">Bradford Seamless Gutters</p>
      <ul className="flex flex-col gap-1">
        {sidebarNav.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                  active ? "bg-brand-soft text-brand" : "text-muted hover:bg-page"
                }`}
              >
                <Icon aria-hidden size={18} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
