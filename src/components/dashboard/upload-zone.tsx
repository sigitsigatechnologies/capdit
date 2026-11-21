"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, ImagePlus, Film, Music, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCEPTED_EXTENSIONS } from "@/lib/media";

export function UploadZone({
  onFiles,
  busy,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFiles(files);
    },
    [onFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-dashed transition-all",
        dragging
          ? "border-violet-400/60 bg-violet-500/[0.08] shadow-[0_0_60px_rgba(139,92,246,0.18)]"
          : "border-white/12 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.04]",
        compact ? "p-6" : "p-10"
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 size-48 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-inner">
          <UploadCloud className="size-6 text-violet-300" />
        </div>
        <div>
          <h3 className={cn("font-semibold tracking-tight", compact ? "text-sm" : "text-lg")}>
            Drop photos, videos or audio
          </h3>
          <p className="mt-1 text-xs text-muted">
            Everything is processed locally in your browser. JPG · PNG · WebP · HEIC · MP4 · MOV · WebM · MP3 · WAV
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            size={compact ? "sm" : "default"}
          >
            <Sparkles className="size-4" />
            {busy ? "Importing…" : "Choose files"}
          </Button>
          <Button variant="secondary" size={compact ? "sm" : "default"} onClick={() => inputRef.current?.click()}>
            <ImagePlus className="size-4" /> Browse media
          </Button>
        </div>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider text-muted/80">
          <span className="flex items-center gap-1.5">
            <ImagePlus className="size-3" /> Photos
          </span>
          <span className="flex items-center gap-1.5">
            <Film className="size-3" /> Videos
          </span>
          <span className="flex items-center gap-1.5">
            <Music className="size-3" /> Audio
          </span>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
