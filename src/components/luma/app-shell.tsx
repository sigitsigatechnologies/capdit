"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Aperture,
  ArrowUpRight,
  Film,
  Folders,
  History,
  LayoutDashboard,
  Settings,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generate", label: "AI Generator", icon: Wand2 },
  { href: "/library", label: "Film Library", icon: Film },
  { href: "/presets", label: "My Presets", icon: Folders },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition group-hover:bg-primary/15">
        <Aperture className="size-[18px]" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-[0.18em] text-foreground">LUMA</span>
        <span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Film Lab
        </span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-[#0c0c0e]/80 px-4 py-6 backdrop-blur-xl md:flex">
        <div className="px-2">
          <Brand />
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-white/[0.04] hover:text-foreground"
                )}
              >
                <item.icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                <span className="font-medium">{item.label}</span>
                {active ? <span className="ml-auto size-1.5 rounded-full bg-primary" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent p-4">
          <p className="text-xs font-medium text-foreground">Real XMP presets</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Every download is validated Camera Raw XML — ready for Lightroom Classic, CC, and Mobile.
          </p>
          <Link
            href="/generate"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            Start a preset <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-30 border-b border-border bg-background/75 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 md:px-8">
            <div className="md:hidden">
              <Brand />
            </div>
            <div className="hidden md:block">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                AI film simulation studio
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/generate"
                className="hidden items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-[0_10px_30px_-14px_rgba(230,195,155,0.7)] transition hover:bg-[#f0d3b3] sm:inline-flex"
              >
                <Wand2 className="size-3.5" /> New preset
              </Link>
              <span className="grid size-9 place-items-center rounded-full border border-border bg-secondary text-[11px] font-semibold text-muted">
                LM
              </span>
            </div>
          </div>

          <nav className="scrollbar-thin flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
