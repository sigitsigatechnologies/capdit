import { NextResponse } from "next/server";
import { analyzeImageBuffer, buildReferenceMatch, computeStats, readImageMeta } from "@/lib/luma/analysis";
import { clientKey, rateLimit } from "@/lib/luma/rate-limit";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request), 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, or WebP are supported" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is larger than 15 MB" }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = await readImageMeta(buffer);
    if (!meta) {
      return NextResponse.json({ error: "Unsupported or corrupted image" }, { status: 422 });
    }
    const analysis = await analyzeImageBuffer(buffer);

    let reference = null;
    const refFile = form.get("reference");
    if (refFile instanceof File && ALLOWED.has(refFile.type) && refFile.size <= MAX_BYTES) {
      const refBuffer = Buffer.from(await refFile.arrayBuffer());
      if (await readImageMeta(refBuffer)) {
        const refStats = await computeStats(refBuffer);
        reference = await buildReferenceMatch(analysis, refStats);
      }
    }

    return NextResponse.json({ analysis, reference });
  } catch {
    return NextResponse.json({ error: "Could not analyze this image" }, { status: 500 });
  }
}
