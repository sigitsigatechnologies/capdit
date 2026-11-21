"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

const PhotoEditor = dynamic(
  () => import("@/components/photo/photo-editor").then((m) => m.PhotoEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[#08090d]">
        <Loader2 className="size-6 animate-spin text-violet-300" />
      </div>
    ),
  }
);

export default function PhotoEditorPage() {
  const params = useParams<{ id: string }>();
  return <PhotoEditor projectId={String(params.id)} />;
}
