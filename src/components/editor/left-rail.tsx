"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RailItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export function LeftRail({
  items,
  active,
  onChange,
  footer,
}: {
  items: RailItem[];
  active: string;
  onChange: (id: string) => void;
  footer?: React.ReactNode;
}) {
  return (
    <aside className="flex w-[74px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0c0e14]">
      <div className="scrollbar-thin flex-1 overflow-y-auto py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "group relative mx-1.5 flex w-[62px] flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[9.5px] font-medium transition",
                isActive ? "bg-white/[0.07] text-white" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
              )}
            >
              {isActive && (
                <span className="absolute -left-1.5 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400" style={{ width: 2 }} />
              )}
              <Icon className={cn("size-[18px]", isActive && "text-violet-300")} strokeWidth={1.9} />
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
      {footer ? <div className="border-t border-white/[0.06] p-2">{footer}</div> : null}
    </aside>
  );
}
