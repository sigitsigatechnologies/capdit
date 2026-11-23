import { NextResponse } from "next/server";
import { FILM_STYLES, searchFilmStyles } from "@/lib/luma/film-styles";
import type { FilmCategory } from "@/lib/luma/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const category = (url.searchParams.get("category") ?? "All") as FilmCategory | "All";
  const styles = q || category !== "All" ? searchFilmStyles(q, category) : FILM_STYLES;
  return NextResponse.json({ styles });
}
