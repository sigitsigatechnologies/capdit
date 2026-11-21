"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  MoreVertical,
  Trash2,
  Copy,
  Pencil,
  Images,
  Film,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { ProjectRecord } from "@/lib/types";
import { useProjectStore } from "@/store/projects";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GRADIENTS = [
  "linear-gradient(135deg,#1e1b4b,#7c3aed)",
  "linear-gradient(135deg,#0c4a6e,#0891b2)",
  "linear-gradient(135deg,#3b0764,#db2777)",
  "linear-gradient(135deg,#422006,#d97706)",
  "linear-gradient(135deg,#052e16,#16a34a)",
];

function gradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return GRADIENTS[hash % GRADIENTS.length];
}

export function ProjectCard({ project }: { project: ProjectRecord }) {
  const router = useRouter();
  const { renameProject, deleteProject, duplicateProject } = useProjectStore();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [busy, setBusy] = useState(false);

  const open = () => router.push(`/editor/${project.mode}/${project.id}`);

  const clipCount = project.video?.clips.length ?? project.photo?.objects.length ?? 0;

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101219] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-2xl hover:shadow-black/40">
        <button onClick={open} className="block w-full text-left">
          <div
            className="relative flex aspect-[16/10] items-center justify-center overflow-hidden"
            style={{ background: gradientFor(project.id) }}
          >
            {project.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.thumbnail}
                alt={project.name}
                className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/50">
                {project.mode === "photo" ? <Images className="size-8" /> : <Film className="size-8" />}
                <span className="text-[10px] font-medium uppercase tracking-[0.18em]">{project.mode}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur">
              {project.mode === "photo" ? <Images className="size-2.5" /> : <Film className="size-2.5" />}
              {project.mode}
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <p className="truncate text-sm font-semibold text-white">{project.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/60">
                <Clock className="size-2.5" />
                {new Date(project.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
                {clipCount ? ` · ${clipCount} layers` : ""}
              </p>
            </div>
          </div>
        </button>
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex size-7 items-center justify-center rounded-lg bg-black/40 text-white/80 opacity-0 backdrop-blur transition hover:bg-black/60 group-hover:opacity-100 data-[state=open]:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setRenameOpen(true);
                  setName(project.name);
                }}
              >
                <Pencil className="size-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const copy = await duplicateProject(project.id);
                  if (copy) toast.success("Project duplicated");
                }}
              >
                <Copy className="size-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-300 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-200"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim()}
              onClick={async () => {
                await renameProject(project.id, name.trim());
                setRenameOpen(false);
                toast.success("Project renamed");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">
            &ldquo;{project.name}&rdquo; will be removed from this browser. Exported files are not affected.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await deleteProject(project.id);
                setBusy(false);
                setDeleteOpen(false);
                toast.success("Project deleted");
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ProjectSkeleton() {
  return (
    <div className={cn("aspect-[16/10] animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]")} />
  );
}
