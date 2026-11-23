import { NextResponse } from "next/server";
import { clampAdjustments } from "@/lib/adjustments";
import { getFilmStyle } from "@/lib/luma/film-styles";
import { buildPreset, buildXmpXml, validateXmp, xmpFileName } from "@/lib/luma/xmp";
import { exportRequestSchema } from "@/lib/luma/schemas";
import { clientKey, rateLimit } from "@/lib/luma/rate-limit";

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request), 40, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = exportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preset payload", issues: parsed.error.issues }, { status: 400 });
  }

  const style = getFilmStyle(parsed.data.styleId);
  const adjust = clampAdjustments(parsed.data.adjust);
  const preset = buildPreset(adjust, parsed.data.name, style);
  const xml = buildXmpXml(preset);
  const validation = validateXmp(xml);

  if (!validation.valid) {
    return NextResponse.json(
      { error: "Generated XMP failed validation", details: validation.errors },
      { status: 422 }
    );
  }

  const filename = xmpFileName(parsed.data.name);
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-XMP-Validation": "valid",
      "Cache-Control": "no-store",
    },
  });
}
