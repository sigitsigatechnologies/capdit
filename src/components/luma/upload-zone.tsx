"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFile: (file: File) => void;
  title: string;
  hint: string;
  compact?: boolean;
  className?: string;
}

export function UploadZone({ onFile, title, hint, compact, className }: UploadZoneProps) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        pick(event.dataTransfer.files);
      }}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed text-center outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40",
        compact ? "gap-2 p-4" : "min-h-64 gap-3 p-8",
        over
          ? "border-primary/60 bg-primary/[0.06]"
          : "border-foreground/15 bg-foreground/[0.015] hover:border-foreground/30 hover:bg-foreground/[0.03]",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => pick(event.target.files)}
      />
      <span
        className={cn(
          "grid place-items-center rounded-full border border-border bg-secondary text-primary transition group-hover:border-foreground/30",
          compact ? "size-8" : "size-11"
        )}
      >
        <ImagePlus className={compact ? "size-4" : "size-5"} />
      </span>
      <div>
        <p className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
