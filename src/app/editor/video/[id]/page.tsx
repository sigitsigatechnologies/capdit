"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

const VideoEditor = dynamic(
  () => import("@/components/video/video-editor").then((m) => m.VideoEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[#08090d]">
        <Loader2 className="size-6 animate-spin text-violet-300" />
      </div>
    ),
  }
);

export default function VideoEditorPage() {
  const params = useParams<{ id: string }>();
  return <VideoEditor projectId={String(params.id)} />;
}
