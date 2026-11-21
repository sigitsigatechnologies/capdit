"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles, ShieldCheck } from "lucide-react";
import { getAIProvider, isAIReady, saveAIProvider, type AITool } from "@/lib/ai";
import type { AIProviderSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/controls";

export function AISettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [settings, setSettings] = useState<AIProviderSettings>(getAIProvider());

  useEffect(() => {
    if (open) setSettings(getAIProvider());
  }, [open]);

  const save = () => {
    saveAIProvider(settings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-300" /> AI provider settings
          </DialogTitle>
          <DialogDescription>
            Local tools work offline. Cloud AI features require your own endpoint and API key — nothing is
            sent anywhere until you configure a provider.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={settings.provider}
              onValueChange={(v) => setSettings((s) => ({ ...s, provider: v as AIProviderSettings["provider"] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not configured</SelectItem>
                <SelectItem value="openai">OpenAI-compatible</SelectItem>
                <SelectItem value="replicate">Replicate</SelectItem>
                <SelectItem value="custom">Custom endpoint</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Base URL</Label>
            <Input
              placeholder="https://api.openai.com/v1"
              value={settings.baseUrl}
              onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>API key</Label>
            <Input
              type="password"
              placeholder="sk-..."
              value={settings.apiKey}
              onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
            />
            <p className="flex items-center gap-1 text-[10px] text-muted">
              <ShieldCheck className="size-3" /> Stored only in this browser&apos;s local storage.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Model</Label>
            <Input
              placeholder="gpt-image-1 / your model id"
              value={settings.model}
              onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
            />
          </div>
          <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] p-3 text-[11px] leading-relaxed text-cyan-100/80">
            Requests are made directly from your browser to the base URL you provide. Some providers block
            cross-origin requests; use a proxy endpoint when required.
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AIToolBadge({ tool }: { tool: AITool }) {
  return (
    <span
      className={
        tool.kind === "local"
          ? "rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300"
          : "rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300"
      }
    >
      {tool.kind === "local" ? "Local" : "API"}
    </span>
  );
}

export function AIStatusPill({ onOpen }: { onOpen: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(isAIReady()), []);
  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.08]"
    >
      <RefreshCw className={`size-3 ${ready ? "text-emerald-400" : "text-muted"}`} />
      {ready ? "AI provider connected" : "Connect AI provider"}
    </button>
  );
}
