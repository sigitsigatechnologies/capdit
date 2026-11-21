import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  href = "/",
  className,
}: {
  compact?: boolean;
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <span className="relative flex size-8 items-center justify-center rounded-xl gradient-accent shadow-lg shadow-violet-900/30">
        <Clapperboard className="size-4 text-white" strokeWidth={2.2} />
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-cyan-300 ring-2 ring-[#0a0b0f]" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight text-white">
            Capdit<span className="text-violet-400">.</span>
          </span>
          <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-muted">Studio</span>
        </span>
      )}
    </Link>
  );
}
