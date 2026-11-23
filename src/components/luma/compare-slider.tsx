"use client";

import { useCallback, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompareSliderProps {
  src: string;
  alt: string;
  filter: string;
  className?: string;
}

export function CompareSlider({ src, alt, filter, className }: CompareSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-2xl border border-border bg-black",
        className
      )}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging.current) update(event.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover no-drag" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover no-drag"
        draggable={false}
        style={{ filter, clipPath: `inset(0 0 0 ${position}%)` }}
      />

      <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white/80 backdrop-blur">
        Before
      </span>
      <span className="absolute right-3 top-3 rounded-full border border-white/40 bg-white/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-black backdrop-blur">
        After
      </span>

      <div className="absolute inset-y-0 z-10 w-px bg-white/70" style={{ left: `${position}%` }}>
        <span className="absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/60 text-white shadow-lg backdrop-blur">
          <MoveHorizontal className="size-4" />
        </span>
      </div>

      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur">
        Drag to compare
      </span>
    </div>
  );
}
