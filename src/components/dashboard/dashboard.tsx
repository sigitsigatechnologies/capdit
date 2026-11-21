"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Wand2,
  Crop,
  ScanFace,
  Film,
  Plus,
  FolderOpen,
  Upload,
  ArrowRight,
  Zap,
  Layers,
  HardDrive,
  Search,
  Settings2,
  Loader2,
  ImageIcon,
  Clapperboard,
  Music2,
} from "lucide-react";
import { toast } from "sonner";
import { useProjectStore } from "@/store/projects";
import { createProjectFromFiles, createProjectFromPrompt, createProjectFromTemplate } from "@/lib/project-creator";
import { STUDIO_TEMPLATES } from "@/lib/templates";
import { FILTER_PRESETS } from "@/lib/presets";
import { parseEditingPrompt } from "@/lib/ai";
import { ACCEPTED_EXTENSIONS, getAssetRecord } from "@/lib/media";
import { formatBytes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Logo } from "@/components/brand";
import { AISettingsDialog, AIStatusPill } from "@/components/ai-settings";
import { UploadZone } from "./upload-zone";
import { ProjectCard, ProjectSkeleton } from "./project-card";

const TEMPLATE_FILTERS = ["All", "Social", "YouTube", "Film", "Lifestyle", "Business", "Photo"];

export function Dashboard() {
  const router = useRouter();
  const { projects, ready, load, saveProject } = useProjectStore();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState(
    "Turn these clips into a cinematic montage with slow fades and warm tones."
  );
  const [templateFilter, setTemplateFilter] = useState("All");
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({});
  const [search, setSearch] = useState("");
  const [aspect, setAspect] = useState("16:9");
  const [mode, setMode] = useState<"photo" | "video">("video");
  const [projectName, setProjectName] = useState("");
  const pendingPreset = useRef<{ filterId: string; name: string } | null>(null);
  const pendingAI = useRef<"enhance" | "color" | null>(null);
  const pendingSmartCrop = useRef(false);
  const presetInput = useRef<HTMLInputElement>(null);
  const aiInput = useRef<HTMLInputElement>(null);
  const cropInput = useRef<HTMLInputElement>(null);
  const assistantInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    navigator.storage?.estimate?.().then((est) => setStorage({ usage: est.usage, quota: est.quota }));
  }, []);

  useEffect(() => {
    let depth = 0;
    const onEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        depth++;
        setDragging(true);
      }
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) handleFiles(files);
    };
    const onOver = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(
    files: File[],
    opts?: {
      mode?: "photo" | "video";
      filterId?: string;
      presetId?: string;
      autoEnhance?: "enhance" | "color";
      aspect?: string;
      adjustments?: Record<string, number>;
    }
  ) {
    setBusy(true);
    try {
      const { project, errors } = await createProjectFromFiles(files, opts as Parameters<typeof createProjectFromFiles>[1]);
      if (errors.length) errors.forEach((e) => toast.error(e, { duration: 6000 }));
      if (project) {
        toast.success(`Created “${project.name}”`);
        router.push(`/editor/${project.mode}/${project.id}`);
      } else {
        toast.error("No supported media found in that drop. Try JPG, PNG, WebP, MP4, WebM, MP3 or WAV.");
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSmartCrop(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    try {
      const { project, errors } = await createProjectFromFiles([files[0]], { mode: "photo", aspect: "1:1" });
      if (errors.length) errors.forEach((e) => toast.error(e));
      if (project && project.photo) {
        const record = await getAssetRecord(project.photo.assetId ?? "");
        if (record?.blob) {
          const bitmap = await createImageBitmap(record.blob);
          const size = Math.min(bitmap.width, bitmap.height);
          project.photo.crop = {
            x: (bitmap.width - size) / 2,
            y: (bitmap.height - size) / 2,
            width: size,
            height: size,
          };
          project.photo.aspect = "1:1";
          project.aspect = "1:1";
          project.thumbnail = project.thumbnail;
          await saveProject(project);
        }
        toast.success("Smart crop applied");
        router.push(`/editor/photo/${project.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleAssistantUpload(files: File[]) {
    if (!files.length) return;
    const intent = parseEditingPrompt(assistantPrompt);
    if (intent.needsProvider) {
      toast.error(
        `${intent.needsProvider} requires an AI provider. Configure it in AI settings — local tools still work.`
      );
      setAiOpen(true);
      return;
    }
    setAssistantOpen(false);
    setBusy(true);
    try {
      const { project, errors } = await createProjectFromPrompt(files, assistantPrompt);
      if (errors.length) errors.forEach((e) => toast.error(e, { duration: 6000 }));
      if (project) {
        toast.success(`Created “${project.name}”`, { description: intent.summary || "AI edit applied" });
        router.push(`/editor/${project.mode}/${project.id}`);
      } else {
        toast.error("No supported media found. Try JPG, PNG, WebP, MP4, WebM, MP3 or WAV.");
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startTemplate(templateId: string) {
    const project = await createProjectFromTemplate(templateId);
    if (!project) return;
    toast.success(`Template “${project.name}” created`);
    router.push(`/editor/${project.mode}/${project.id}`);
  }

  const filteredProjects = useMemo(
    () =>
      projects.filter((p) =>
        search.trim() ? p.name.toLowerCase().includes(search.trim().toLowerCase()) : true
      ),
    [projects, search]
  );

  const templates = useMemo(
    () =>
      templateFilter === "All"
        ? STUDIO_TEMPLATES
        : STUDIO_TEMPLATES.filter((t) => t.category === templateFilter),
    [templateFilter]
  );

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0b0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-5">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            <span className="rounded-lg bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-white">Studio</span>
            <a href="#projects" className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:text-white">
              Projects
            </a>
            <a href="#templates" className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:text-white">
              Templates
            </a>
            <a href="#presets" className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:text-white">
              Presets
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-muted lg:flex">
              <HardDrive className="size-3" />
              {storage.usage !== undefined ? formatBytes(storage.usage) : "—"} local
            </div>
            <AIStatusPill onOpen={() => setAiOpen(true)} />
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="size-4" /> New project
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 pb-24">
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] via-transparent to-transparent px-6 py-10 md:px-10 md:py-14">
          <div className="pointer-events-none absolute -right-24 -top-40 size-[480px] rounded-full bg-violet-600/15 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 size-[380px] rounded-full bg-cyan-500/10 blur-[110px]" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200">
                <span className="size-1.5 rounded-full bg-emerald-400" /> Local-first · No upload required
              </div>
              <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
                Your browser is the{" "}
                <span className="gradient-text">creative studio</span>.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
                Edit photos with real-time color grading, cut video on a multi-track timeline, add text,
                effects, transitions and audio — then export a real file. Your media never leaves this device.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <Button size="lg" onClick={() => document.getElementById("upload-zone")?.scrollIntoView({ behavior: "smooth" })}>
                  <Upload className="size-4" /> Start editing
                </Button>
                <Button size="lg" variant="secondary" onClick={() => setNewOpen(true)}>
                  <Clapperboard className="size-4" /> Blank project
                </Button>
                <Button size="lg" variant="ghost" onClick={() => setAssistantOpen(true)}>
                  <Wand2 className="size-4" /> Try AI assistant
                </Button>
              </div>
              <div className="mt-7 flex flex-wrap gap-5 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <Zap className="size-3.5 text-violet-300" /> Real-time preview
                </span>
                <span className="flex items-center gap-1.5">
                  <Layers className="size-3.5 text-cyan-300" /> Multi-track timeline
                </span>
                <span className="flex items-center gap-1.5">
                  <Film className="size-3.5 text-blue-300" /> MP4 / WebM export
                </span>
              </div>
            </div>
            <div id="upload-zone">
              <UploadZone onFiles={(files) => handleFiles(files)} busy={busy} />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <Sparkles className="size-4" />,
              title: "AI Auto Enhance",
              desc: "Histogram-balanced grade",
              action: () => {
                pendingAI.current = "enhance";
                aiInput.current?.click();
              },
              tint: "from-violet-500/20 to-violet-500/0",
            },
            {
              icon: <Wand2 className="size-4" />,
              title: "Auto Color",
              desc: "Neutralize white balance",
              action: () => {
                pendingAI.current = "color";
                aiInput.current?.click();
              },
              tint: "from-cyan-500/20 to-cyan-500/0",
            },
            {
              icon: <Crop className="size-4" />,
              title: "Smart Crop",
              desc: "Center reframe to 1:1",
              action: () => {
                pendingSmartCrop.current = true;
                cropInput.current?.click();
              },
              tint: "from-blue-500/20 to-blue-500/0",
            },
            {
              icon: <ScanFace className="size-4" />,
              title: "AI Assistant",
              desc: "Describe your edit",
              action: () => setAssistantOpen(true),
              tint: "from-fuchsia-500/20 to-fuchsia-500/0",
            },
          ].map((item) => (
            <button
              key={item.title}
              onClick={item.action}
              className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0f1118] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#12141d]"
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                  item.tint
                )}
              >
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-zinc-100">{item.title}</span>
                <span className="block truncate text-[11px] text-muted">{item.desc}</span>
              </span>
              <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-white" />
            </button>
          ))}
        </section>

        <section id="projects" className="mt-12">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Recent projects</h2>
              <p className="text-xs text-muted">Saved automatically in this browser (IndexedDB).</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects"
                  className="h-8 w-48 pl-8 text-xs"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={() => setNewOpen(true)}>
                <Plus className="size-3.5" /> New
              </Button>
            </div>
          </div>
          {!ready ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <ProjectSkeleton key={i} />
              ))}
            </div>
          ) : filteredProjects.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {filteredProjects.slice(0, 8).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.05]">
                <FolderOpen className="size-5 text-muted" />
              </div>
              <div>
                <p className="text-sm font-medium">{search ? "No matching projects" : "No projects yet"}</p>
                <p className="mt-1 text-xs text-muted">
                  {search ? "Try a different search term." : "Drop a photo or video above to get started."}
                </p>
              </div>
              {!search && (
                <Button size="sm" onClick={() => setNewOpen(true)}>
                  <Plus className="size-4" /> Create your first project
                </Button>
              )}
            </div>
          )}
        </section>

        <section id="templates" className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Templates</h2>
              <p className="text-xs text-muted">Aspect ratio, text styles and timeline presets configured for you.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setTemplateFilter(f)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] transition",
                    templateFilter === f
                      ? "border-violet-400/30 bg-violet-500/15 text-violet-200"
                      : "border-white/10 text-muted hover:border-white/20 hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => startTemplate(template.id)}
                className="group overflow-hidden rounded-xl border border-white/[0.07] bg-[#0f1118] text-left transition hover:-translate-y-0.5 hover:border-white/15"
              >
                <div
                  className="flex h-28 items-center justify-center p-3"
                  style={{ background: template.gradient }}
                >
                  <div
                    className={cn(
                      "relative flex items-center justify-center rounded-md border border-white/25 bg-black/25 shadow-lg backdrop-blur-sm",
                      template.aspect === "9:16"
                        ? "h-full w-[38%]"
                        : template.aspect === "1:1"
                          ? "size-[70%]"
                          : template.aspect === "4:5"
                            ? "h-full w-[62%]"
                            : "w-[82%]"
                    )}
                  >
                    <span className="px-1 text-center text-[8px] font-bold uppercase tracking-widest text-white/90">
                      {template.name}
                    </span>
                    {template.mode === "video" ? (
                      <Film className="absolute bottom-1 right-1 size-2.5 text-white/60" />
                    ) : (
                      <ImageIcon className="absolute bottom-1 right-1 size-2.5 text-white/60" />
                    )}
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[11px] font-semibold text-zinc-100">{template.name}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted">
                    {template.aspect} · {template.category}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section id="presets" className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Photo presets</h2>
              <p className="text-xs text-muted">Click a grade, then pick a photo. Intensity stays adjustable.</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted">
              <ImageIcon className="size-3" /> {FILTER_PRESETS.length} looks
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {FILTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  pendingPreset.current = { filterId: preset.id, name: preset.name };
                  presetInput.current?.click();
                }}
                className="group relative overflow-hidden rounded-xl border border-white/[0.07] text-left transition hover:-translate-y-0.5 hover:border-white/20"
              >
                <div
                  className="h-20"
                  style={{ background: `linear-gradient(135deg, ${preset.gradient?.[0] ?? "#111"}, ${preset.gradient?.[1] ?? "#555"})` }}
                >
                  <div className="flex size-full items-end bg-black/10 p-2">
                    <span className="rounded-md bg-black/35 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur">
                      {preset.name}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-[11px] text-muted">
          <p>Capdit Studio · Media processed locally. Projects stored in IndexedDB.</p>
          <button onClick={() => setAiOpen(true)} className="flex items-center gap-1.5 hover:text-white">
            <Settings2 className="size-3" /> AI provider settings
          </button>
        </footer>
      </main>

      {dragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080c]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-violet-400/60 bg-violet-500/5 px-20 py-16 text-center">
            <Upload className="size-9 text-violet-300" />
            <p className="text-lg font-semibold">Drop to import</p>
            <p className="text-xs text-muted">Photos, videos and audio are imported locally</p>
          </div>
        </div>
      )}

      {busy && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/10 bg-[#151821]/95 px-4 py-2.5 text-xs text-zinc-200 shadow-2xl backdrop-blur">
          <Loader2 className="size-3.5 animate-spin text-violet-300" />
          Importing & decoding media…
        </div>
      )}

      <input
        ref={presetInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          const preset = pendingPreset.current;
          pendingPreset.current = null;
          if (files.length && preset) {
            handleFiles([files[0]], {
              mode: "photo",
              filterId: preset.filterId,
              presetId: preset.filterId,
            });
          }
          e.target.value = "";
        }}
      />
      <input
        ref={aiInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          const action = pendingAI.current;
          pendingAI.current = null;
          if (files.length && action) {
            handleFiles([files[0]], { mode: "photo", autoEnhance: action });
          }
          e.target.value = "";
        }}
      />
      <input
        ref={cropInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          const should = pendingSmartCrop.current;
          pendingSmartCrop.current = false;
          if (files.length && should) handleSmartCrop(files);
          e.target.value = "";
        }}
      />
      <input
        ref={assistantInput}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) handleAssistantUpload(files);
          e.target.value = "";
        }}
      />

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new project</DialogTitle>
            <DialogDescription>Start blank, then add media in the editor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Project name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Untitled project"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Editor</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["photo", "video"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-3 text-left transition",
                      mode === m
                        ? "border-violet-400/40 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    )}
                  >
                    {m === "photo" ? (
                      <ImageIcon className="size-4 text-violet-300" />
                    ) : (
                      <Film className="size-4 text-cyan-300" />
                    )}
                    <div>
                      <p className="text-xs font-medium capitalize">{m}</p>
                      <p className="text-[10px] text-muted">
                        {m === "photo" ? "Grade & compose" : "Timeline editing"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Aspect ratio</Label>
              <Select value={aspect} onValueChange={setAspect}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 — YouTube</SelectItem>
                  <SelectItem value="9:16">9:16 — TikTok / Reels / Shorts</SelectItem>
                  <SelectItem value="1:1">1:1 — Instagram</SelectItem>
                  <SelectItem value="4:5">4:5 — Instagram Portrait</SelectItem>
                  <SelectItem value="4:3">4:3 — Classic</SelectItem>
                  <SelectItem value="21:9">21:9 — Cinematic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const store = useProjectStore.getState();
                const created = await store.createProject({
                  name: projectName || (mode === "photo" ? "Untitled photo" : "Untitled video"),
                  mode,
                  aspect,
                });
                setNewOpen(false);
                router.push(`/editor/${created.mode}/${created.id}`);
              }}
            >
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="size-4 text-violet-300" /> AI editing assistant
            </DialogTitle>
            <DialogDescription>
              Pick multiple videos or photos, then describe the result. Local prompt routing assembles a timeline
              with matching grade, pacing, transitions and effects — no API key required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              value={assistantPrompt}
              onChange={(e) => setAssistantPrompt(e.target.value)}
              rows={3}
              placeholder="Turn these clips into a cinematic montage with slow fades and warm tones."
            />
            <div className="flex flex-wrap gap-1.5">
              {[
                "Make a cinematic montage with slow fades and warm tones.",
                "Fast, energetic vertical TikTok reel.",
                "Smooth aesthetic travel video with crossfades.",
                "Moody film look with glitch cuts.",
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => setAssistantPrompt(p)}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-muted transition hover:border-white/20 hover:text-white"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted">Detected plan</p>
              <p className="mt-1 text-xs text-zinc-300">{parseEditingPrompt(assistantPrompt).summary}</p>
              {parseEditingPrompt(assistantPrompt).needsProvider && (
                <p className="mt-1 text-[10px] text-amber-300">
                  Needs an AI provider: {parseEditingPrompt(assistantPrompt).needsProvider}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssistantOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => assistantInput.current?.click()}>
              <Upload className="size-4" /> Choose media & generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AISettingsDialog open={aiOpen} onOpenChange={setAiOpen} />

      <div className="pointer-events-none fixed bottom-0 right-0 -z-10 flex gap-2 p-6 opacity-[0.03]">
        <Music2 className="size-40" />
      </div>
    </div>
  );
}
