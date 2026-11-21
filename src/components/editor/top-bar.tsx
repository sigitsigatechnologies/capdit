"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  Download,
  Play,
  Check,
  Loader2,
  Cloud,
  Clapperboard,
  Images,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/shell";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";

export function EditorTopBar({
  mode,
  name,
  onRename,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onExport,
  onPreview,
  saveState,
}: {
  mode: "photo" | "video";
  name: string;
  onRename: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExport: () => void;
  onPreview?: () => void;
  saveState: "saved" | "saving" | "dirty" | "error";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(name), [name]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setDraft(name);
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0b0c11]/90 px-3 backdrop-blur-xl">
      <Link
        href="/"
        className="flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-white/[0.07] hover:text-white"
        aria-label="Back to studio"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <Logo compact className="mr-1" />
      <div className="hidden h-5 w-px bg-white/10 sm:block" />
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
          {mode === "photo" ? <Images className="size-2.5" /> : <Clapperboard className="size-2.5" />}
          {mode}
        </span>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(name);
                setEditing(false);
              }
            }}
            className="w-48 rounded-md border border-violet-400/40 bg-white/[0.06] px-2 py-1 text-sm font-medium outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="max-w-[240px] truncate rounded-md px-1.5 py-1 text-sm font-medium text-zinc-100 transition hover:bg-white/[0.05]"
            title="Rename project"
          >
            {name}
          </button>
        )}
        <span className="hidden items-center gap-1 text-[10px] text-muted md:flex">
          {saveState === "saving" ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving…
            </>
          ) : saveState === "saved" ? (
            <>
              <Check className="size-3 text-emerald-400" /> Saved
            </>
          ) : saveState === "error" ? (
            <>
              <Cloud className="size-3 text-red-400" /> Save failed
            </>
          ) : (
            <>
              <Cloud className="size-3" /> Unsaved changes
            </>
          )}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <div className="mr-1 flex items-center rounded-lg bg-white/[0.03] p-0.5">
          <IconButton label="Undo (⌘Z)" disabled={!canUndo} onClick={onUndo}>
            <Undo2 className="size-4" />
          </IconButton>
          <IconButton label="Redo (⇧⌘Z)" disabled={!canRedo} onClick={onRedo}>
            <Redo2 className="size-4" />
          </IconButton>
        </div>
        {onPreview && (
          <Button variant="ghost" size="sm" onClick={onPreview} className="hidden sm:flex">
            <Play className="size-3.5" /> Preview
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onSave} className={cn("hidden sm:flex")}>
          <Save className="size-3.5" /> Save
        </Button>
        <Button size="sm" onClick={onExport}>
          <Download className="size-3.5" /> Export
        </Button>
      </div>
    </header>
  );
}
