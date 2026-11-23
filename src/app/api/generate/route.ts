import { NextResponse } from "next/server";
import { getFilmStyle } from "@/lib/luma/film-styles";
import { generateAdaptivePreset } from "@/lib/luma/adaptive";
import { generateRequestSchema } from "@/lib/luma/schemas";
import type { ImageAnalysis } from "@/lib/luma/types";
import { clientKey, rateLimit } from "@/lib/luma/rate-limit";

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request), 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const style = getFilmStyle(parsed.data.styleId);
  if (!style) {
    return NextResponse.json({ error: "Unknown film style" }, { status: 404 });
  }

  const analysis = parsed.data.analysis as unknown as ImageAnalysis;
  const preset = generateAdaptivePreset(analysis, style, {
    intensity: parsed.data.intensity,
    adaptive: parsed.data.adaptive,
    reference: parsed.data.reference,
  });

  return NextResponse.json({ preset });
}
