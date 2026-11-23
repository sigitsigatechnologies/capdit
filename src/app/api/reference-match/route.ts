import { NextResponse } from "next/server";
import { computeStats, readImageMeta } from "@/lib/luma/analysis";
import { clientKey, rateLimit } from "@/lib/luma/rate-limit";

export const runtime = "nodejs";
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request), 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });

  const source = form.get("source");
  const reference = form.get("reference");
  if (!(source instanceof File) || !(reference instanceof File)) {
    return NextResponse.json({ error: "Both source and reference images are required" }, { status: 400 });
  }
  if (!ALLOWED.has(source.type) || !ALLOWED.has(reference.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, or WebP are supported" }, { status: 415 });
  }
  if (source.size > MAX_BYTES || reference.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is larger than 15 MB" }, { status: 413 });
  }

  try {
    const sourceBuffer = Buffer.from(await source.arrayBuffer());
    const referenceBuffer = Buffer.from(await reference.arrayBuffer());
    if (!(await readImageMeta(sourceBuffer)) || !(await readImageMeta(referenceBuffer))) {
      return NextResponse.json({ error: "Unsupported or corrupted image" }, { status: 422 });
    }
    const sourceStats = await computeStats(sourceBuffer);
    const refStats = await computeStats(referenceBuffer);
    const diff =
      (Math.abs(refStats.temperature - sourceStats.temperature) / 2 +
        Math.abs(refStats.saturation - sourceStats.saturation) +
        Math.abs(refStats.contrast - sourceStats.contrast) +
        Math.abs(refStats.brightness - sourceStats.brightness)) /
      4;
    const similarity = Math.round(Math.max(0, Math.min(100, 100 - diff)));
    return NextResponse.json({
      reference: {
        stats: refStats,
        similarity,
        summary: `Reference palette is ${similarity}% close to the source.`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not compare these images" }, { status: 500 });
  }
}
