"use client";

import { useEffect, useState } from "react";
import { getAssetUrl } from "@/lib/media";

const cache = new Map<string, string>();

export function useMediaUrl(assetId?: string | null) {
  const [url, setUrl] = useState<string | undefined>(() => (assetId ? cache.get(assetId) : undefined));

  useEffect(() => {
    let cancelled = false;
    if (!assetId) {
      setUrl(undefined);
      return;
    }
    const existing = cache.get(assetId);
    if (existing) {
      setUrl(existing);
      return;
    }
    getAssetUrl(assetId).then((resolved) => {
      if (cancelled || !resolved) return;
      cache.set(assetId, resolved);
      setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return url;
}

export async function resolveMediaUrl(assetId?: string | null) {
  if (!assetId) return undefined;
  const cached = cache.get(assetId);
  if (cached) return cached;
  const url = await getAssetUrl(assetId);
  if (url) cache.set(assetId, url);
  return url;
}
