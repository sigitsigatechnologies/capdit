"use client";

import { downloadBlob, safeFileName } from "@/lib/utils";
import type { Adjustments } from "@/lib/adjustments";

export async function downloadPresetXmp(input: {
  name: string;
  styleId: string;
  adjust: Adjustments;
}): Promise<string> {
  const response = await fetch("/api/export/xmp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Could not generate the XMP preset");
  }

  const blob = await response.blob();
  const base = safeFileName(input.name || "LUMA Preset");
  const filename = base.startsWith("LUMA") ? `${base}.xmp` : `LUMA_${base}.xmp`;
  downloadBlob(blob, filename);
  return filename;
}
