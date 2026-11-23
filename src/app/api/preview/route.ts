import { NextResponse } from "next/server";
import { clampAdjustments } from "@/lib/adjustments";
import { adjustmentsSchema } from "@/lib/luma/schemas";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = adjustmentsSchema.safeParse((body as { adjust?: unknown })?.adjust ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid adjustments" }, { status: 400 });
  }
  const a = clampAdjustments(parsed.data);
  const brightness = Math.pow(2, a.exposure).toFixed(3);
  const contrast = (1 + (a.contrast / 100) * 0.8).toFixed(3);
  const saturate = Math.max(0, 1 + (a.saturation + a.vibrance * 0.5) / 100).toFixed(3);
  const sepia = ((Math.max(0, a.temperature) / 100) * 0.25).toFixed(3);
  const hue = Math.max(-40, Math.min(40, -a.temperature * 0.15 + a.tint * 0.1)).toFixed(1);
  const filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) sepia(${sepia}) hue-rotate(${hue}deg)`;
  return NextResponse.json({
    filter,
    approximate: true,
    disclaimer:
      "This is an approximate CSS preview. Actual Lightroom rendering uses Camera Raw color science and may differ.",
  });
}
