"use client";

import { useState } from "react";
import { Download, Play, Star, Loader2 } from "lucide-react";
import { Clip } from "@/lib/types";
import { getClipDownloadUrl } from "@/lib/api";
import { Skeleton } from "./Skeleton";

interface ClipCardProps {
  clip: Clip;
  youtubeId: string;
  onSelect: (clip: Clip) => void;
  onClipUpdate?: (clip: Clip) => void;
}

export default function ClipCard({ clip, youtubeId, onSelect, onClipUpdate }: ClipCardProps) {
  const fallbackThumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  const thumbnailUrl = clip.thumbnail_url ? `/api/clips/${clip.id}/thumbnail` : fallbackThumbnail;
  const duration = Math.round(clip.end_time - clip.start_time);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const url = await getClipDownloadUrl(clip.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clip.title || "clip"}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert("Failed to get download link");
    } finally {
      setDownloading(false);
    }
  };

  const isRendering = clip.status === "rendering" || clip.status === "pending";

  if (isRendering) {
    return (
      <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="relative aspect-[9/16] bg-zinc-100 dark:bg-zinc-950">
          <Skeleton className="absolute inset-0 rounded-none" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-xs font-medium text-purple-300 uppercase tracking-wide">
              {clip.status}
            </span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-14 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden 
                 hover:border-purple-400 dark:hover:border-purple-500/50 transition-all cursor-pointer"
      onClick={() => onSelect(clip)}
    >
      {/* 9:16 aspect ratio container */}
      <div className="relative aspect-[9/16] bg-zinc-100 dark:bg-zinc-950">
        <img
          src={thumbnailUrl}
          alt={clip.title || "Clip"}
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        />

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-purple-600/90 flex items-center justify-center">
            <Play className="w-7 h-7 text-white ml-1" />
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 rounded-md text-xs font-mono">
          {duration}s
        </div>

        {/* Quality badge */}
        <div className="absolute bottom-3 left-3 px-2 py-1 bg-purple-600/80 rounded-md text-xs font-semibold">
          {clip.quality || "480p"}
        </div>

        {/* Status badge */}
        {clip.status !== "completed" && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-600/80 rounded-md text-xs font-semibold uppercase">
            {clip.status}
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
          {clip.title || "Untitled Clip"}
        </h3>

        <div className="flex items-center justify-between">
          {/* Virality Score */}
          {clip.virality_score !== null && (
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">
                {clip.virality_score}
              </span>
              <span className="text-xs text-zinc-500">/100</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Download button */}
            {clip.storage_url && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-purple-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
