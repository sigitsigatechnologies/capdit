"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export function IconButton({
  className,
  label,
  side = "bottom",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <button
          aria-label={label}
          title={label}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/[0.08] hover:text-white disabled:pointer-events-none disabled:opacity-40",
            className
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-[60] rounded-md border border-white/10 bg-[#1b1f2a] px-2 py-1 text-[11px] text-zinc-200 shadow-xl animate-float-in"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-white/[0.06] px-4 py-4 last:border-0", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
      {icon ? <div className="mb-1 text-zinc-500">{icon}</div> : null}
      <p className="text-xs font-medium text-zinc-300">{title}</p>
      {description ? <p className="max-w-[220px] text-[11px] leading-relaxed text-muted">{description}</p> : null}
      {action}
    </div>
  );
}
