"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SignOutButton } from "@/components/sign-out-button";

export type SiteNavLink = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string, homeHref: string) {
  if (href === homeHref) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function BrandMark({ href }: { href: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-charcoal shadow-[0_0_20px_rgba(245,158,11,0.25)]">
        L
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight text-white">
          Leadyfy
        </span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
          OS
        </span>
      </span>
    </Link>
  );
}

function NavLinks({
  links,
  pathname,
  homeHref,
  onNavigate,
  stacked = false,
}: {
  links: SiteNavLink[];
  pathname: string;
  homeHref: string;
  onNavigate?: () => void;
  stacked?: boolean;
}) {
  return (
    <nav
      className={
        stacked
          ? "flex flex-col gap-1"
          : "flex flex-wrap items-center gap-1"
      }
    >
      {links.map((link) => {
        const active = isActivePath(pathname, link.href, homeHref);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
              stacked ? "w-full" : ""
            } ${
              active
                ? "bg-brand/15 text-brand"
                : "text-white/55 hover:bg-white/5 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteHeader({
  homeHref,
  links,
  userLabel,
  roleLabel,
  feedHref,
  signOutTo = "/login",
}: {
  homeHref: string;
  links: SiteNavLink[];
  userLabel?: string | null;
  roleLabel?: string | null;
  feedHref: string;
  signOutTo?: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = (userLabel?.trim()?.[0] ?? "U").toUpperCase();
  const prettyRole = roleLabel ? formatRole(roleLabel) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-charcoal/90 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <BrandMark href={homeHref} />

          <div className="flex items-center gap-2">
            <NotificationBell feedHref={feedHref} />
            {(userLabel || prettyRole) && (
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand">
                  {initial}
                </span>
                <span className="max-w-40 leading-tight">
                  {userLabel ? (
                    <span className="block truncate text-xs text-white/80">
                      {userLabel}
                    </span>
                  ) : null}
                  {prettyRole ? (
                    <span className="block text-[10px] uppercase tracking-wide text-white/40">
                      {prettyRole}
                    </span>
                  ) : null}
                </span>
              </div>
            )}
            <div className="hidden sm:block">
              <SignOutButton callbackUrl={signOutTo} />
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white md:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="sr-only">Menu</span>
              <span className="flex flex-col gap-1">
                <span
                  className={`block h-0.5 w-4 bg-current transition ${
                    menuOpen ? "translate-y-1.5 rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-4 bg-current transition ${
                    menuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-4 bg-current transition ${
                    menuOpen ? "-translate-y-1.5 -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        <div className="hidden border-t border-white/5 py-2 md:block">
          <NavLinks links={links} pathname={pathname} homeHref={homeHref} />
        </div>

        {menuOpen ? (
          <div className="border-t border-white/10 py-3 md:hidden">
            <NavLinks
              links={links}
              pathname={pathname}
              homeHref={homeHref}
              stacked
              onNavigate={() => setMenuOpen(false)}
            />
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3 sm:hidden">
              {userLabel ? (
                <p className="truncate text-xs text-white/50">
                  {userLabel}
                  {prettyRole ? ` · ${prettyRole}` : ""}
                </p>
              ) : (
                <span />
              )}
              <SignOutButton callbackUrl={signOutTo} />
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
