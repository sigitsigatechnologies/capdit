"use client";

import { useState } from "react";
import { Sparkles, Wand2, Settings2, ArrowRight, Loader2, Lock } from "lucide-react";
import { AI_TOOLS, parseEditingPrompt, type AIIntent, type AITool } from "@/lib/ai";
import { getAIProvider, isAIReady } from "@/lib/ai";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AIToolBadge } from "@/components/ai-settings";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  "Make this photo cinematic and warm",
  "Create a vintage film look",
  "Black and white portrait",
  "Brighten and sharpen",
];

export function AIPanel({
  mode,
  onTool,
  onApplyPrompt,
  onOpenSettings,
  busyTool,
}: {
  mode: "photo" | "video";
  onTool: (tool: AITool) => void;
  onApplyPrompt: (intent: AIIntent, prompt: string) => void;
  onOpenSettings: () => void;
  busyTool?: string | null;
}) {
  const [prompt, setPrompt] = useState("Make this photo look cinematic and warm.");
  const [showAll, setShowAll] = useState(false);
  const provider = typeof window !== "undefined" ? getAIProvider() : null;
  const ready = typeof window !== "undefined" ? isAIReady() : false;
  const intent = parseEditingPrompt(prompt);
  const tools = AI_TOOLS.filter((t) => t.modes.includes(mode));
  const visible = showAll ? tools : tools.slice(0, 6);

  return (
    <div className="flex h-full flex-col">
      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-3">
        <div className="rounded-xl border border-white/[0.07] bg-gradient-to-br from-violet-500/[0.07] to-cyan-500/[0.03] p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-violet-500/20">
              <Wand2 className="size-3.5 text-violet-300" />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-zinc-100">AI editing assistant</p>
              <p className="text-[9px] text-muted">Prompt → real adjustments</p>
            </div>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Describe the edit you want…"
            className="min-h-16 bg-black/25 text-xs"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-muted transition hover:border-violet-400/30 hover:text-white"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-2.5 rounded-lg border border-white/[0.06] bg-black/20 p-2">
            <p className="text-[9px] uppercase tracking-wider text-muted">Plan</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-300">{intent.summary}</p>
            {intent.needsProvider && (
              <p className="mt-1 flex items-center gap-1 text-[9px] text-amber-300">
                <Lock className="size-2.5" /> Requires AI provider: {intent.needsProvider}
              </p>
            )}
          </div>
          <Button
            size="sm"
            className="mt-2 w-full"
            onClick={() => onApplyPrompt(intent, prompt)}
            disabled={!prompt.trim()}
          >
            <Sparkles className="size-3.5" /> Apply prompt
          </Button>
        </div>

        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5 text-left transition hover:bg-white/[0.05]"
        >
          <Settings2 className="size-3.5 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-zinc-200">
              {ready ? "AI provider connected" : "Connect an AI provider"}
            </p>
            <p className="truncate text-[9px] text-muted">
              {ready && provider ? provider.baseUrl : "Required for cloud-only tools"}
            </p>
          </div>
          <ArrowRight className="size-3 text-muted" />
        </button>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">AI tools</p>
            <span className="text-[9px] text-muted">{tools.length}</span>
          </div>
          <div className="space-y-1.5">
            {visible.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onTool(tool)}
                disabled={busyTool === tool.id}
                className={cn(
                  "group flex w-full items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-left transition hover:border-white/15 hover:bg-white/[0.05]",
                  tool.kind === "provider" && "opacity-90"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-100">{tool.name}</span>
                    <AIToolBadge tool={tool} />
                    {busyTool === tool.id && <Loader2 className="size-3 animate-spin text-violet-300" />}
                  </div>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">{tool.description}</p>
                </div>
                <ArrowRight className="mt-0.5 size-3 shrink-0 text-muted transition group-hover:text-white" />
              </button>
            ))}
          </div>
          {tools.length > 6 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 w-full rounded-lg border border-white/[0.06] py-1.5 text-[10px] text-muted transition hover:text-white"
            >
              {showAll ? "Show fewer" : `Show all ${tools.length} tools`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
