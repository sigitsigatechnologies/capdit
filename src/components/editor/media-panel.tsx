"use client";

import { useMemo, useRef, useState } from "react";
import { Upload, Music2, Film, ImageIcon, Search, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useProjectStore } from "@/store/projects";
import type { MediaAsset } from "@/lib/types";
import { cn, formatBytes, formatTime } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/shell";
import { dbDeleteAsset } from "@/lib/db";

export function MediaPanel({
  onSelect,
  selectLabel = "Add to project",
  accept = "image/*,video/*,audio/*",
  compact = false,
}: {
  onSelect: (asset: MediaAsset) => void;
  selectLabel?: string;
  accept?: string;
  compact?: boolean;
}) {
  const { assets, importFiles, refresh } = useProjectStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "image" | "video" | "audio">("all");
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      assets.filter(
        (a) =>
          (filter === "all" || a.kind === filter) &&
          (!query.trim() || a.name.toLowerCase().includes(query.trim().toLowerCase()))
      ),
    [assets, filter, query]
  );

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setImporting(true);
    const { assets: created, errors } = await importFiles(files);
    setImporting(false);
    errors.forEach((e) => toast.error(e));
    if (created.length) toast.success(`Imported ${created.length} file${created.length === 1 ? "" : "s"}`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search media"
            className="h-7 pl-7 text-[11px]"
          />
        </div>
        <Button size="icon-sm" variant="secondary" onClick={() => inputRef.current?.click()} title="Upload">
          {importing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        </Button>
      </div>
      <div className="flex gap-1 px-3 py-2">
        {(["all", "image", "video", "audio"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 rounded-md px-1 py-1 text-[10px] capitalize transition",
              filter === f ? "bg-white/10 text-white" : "text-muted hover:bg-white/[0.05] hover:text-white"
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 ? (
          <div className="px-1 pt-2">
            <EmptyState
              icon={<Upload className="size-5" />}
              title={query ? "No media found" : "Your media library is empty"}
              description={
                query ? "Try another name." : "Upload photos, videos or audio. Files stay on this device."
              }
              action={
                <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
                  <Upload className="size-3.5" /> Upload media
                </Button>
              }
            />
          </div>
        ) : (
          <div className={cn("grid gap-1.5", compact ? "grid-cols-2" : "grid-cols-2")}>
            {filtered.map((asset) => (
              <MediaTile
                key={asset.id}
                asset={asset}
                onSelect={() => onSelect(asset)}
                onDelete={async () => {
                  await dbDeleteAsset(asset.id);
                  await refresh();
                  toast.success("Media removed from library");
                }}
                selectLabel={selectLabel}
              />
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-white/[0.06] px-3 py-2 text-[10px] text-muted">
        {assets.length} asset{assets.length === 1 ? "" : "s"} stored locally
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          handleFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

function MediaTile({
  asset,
  onSelect,
  onDelete,
  selectLabel,
}: {
  asset: MediaAsset;
  onSelect: () => void;
  onDelete: () => void;
  selectLabel: string;
}) {
  const [thumb] = useState(asset.thumbnail);
  const [deleting, setDeleting] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-capdit-asset", asset.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="group relative overflow-hidden rounded-lg border border-white/[0.07] bg-[#0e1016] transition hover:border-violet-400/40"
    >
      <button onClick={onSelect} className="block w-full text-left" title={`${selectLabel}: ${asset.name}`}>
        <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-black/30">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={asset.name} className="size-full object-cover" />
          ) : asset.kind === "audio" ? (
            <div className="flex size-full flex-col items-center justify-center gap-1 text-muted">
              <Music2 className="size-5" />
              <span className="text-[9px]">Audio</span>
            </div>
          ) : asset.kind === "video" ? (
            <Film className="size-5 text-muted" />
          ) : (
            <ImageIcon className="size-5 text-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 font-mono text-[8px] text-white/80">
            {asset.kind === "image" ? `${asset.width ?? "?"}×${asset.height ?? "?"}` : formatTime(asset.duration ?? 0)}
          </span>
          <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-black/60 px-1 py-0.5 text-[8px] uppercase tracking-wider text-white/80">
            {asset.kind === "image" ? <ImageIcon className="size-2" /> : asset.kind === "video" ? <Film className="size-2" /> : <Music2 className="size-2" />}
            {asset.kind}
          </span>
          <span className="absolute inset-x-1 bottom-1 hidden justify-center group-hover:flex">
            <span className="rounded-md bg-violet-500 px-2 py-0.5 text-[9px] font-semibold text-white shadow">
              {selectLabel}
            </span>
          </span>
        </div>
        <div className="p-1.5">
          <p className="truncate text-[10px] font-medium text-zinc-200">{asset.name}</p>
          <p className="text-[9px] text-muted">{formatBytes(asset.size)}</p>
        </div>
      </button>
      <button
        onClick={async (e) => {
          e.stopPropagation();
          if (deleting) return;
          setDeleting(true);
          await onDelete();
        }}
        className="absolute right-1 top-1 hidden size-5 items-center justify-center rounded bg-red-500/80 text-white group-hover:flex"
        title="Delete from library"
      >
        <Trash2 className="size-2.5" />
      </button>
    </div>
  );
}
