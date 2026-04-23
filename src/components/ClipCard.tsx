"use client";

import { useState } from "react";
import { Download, Play, Star, ChevronDown, Loader2, Lock } from "lucide-react";
import { Clip } from "@/lib/types";
import { updateClip, getClipDownloadUrl } from "@/lib/api";
import { Skeleton } from "./Skeleton";

const QUALITY_OPTIONS = ["480p", "720p", "1080p"] as const;

interface ClipCardProps {
  clip: Clip;
  youtubeId: string;
  subscriptionTier: string;
  onSelect: (clip: Clip) => void;
  onClipUpdate?: (clip: Clip) => void;
}

export default function ClipCard({ clip, youtubeId, subscriptionTier, onSelect, onClipUpdate }: ClipCardProps) {
  const fallbackThumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  const thumbnailUrl = clip.thumbnail_url ? `/api/clips/${clip.id}/thumbnail` : fallbackThumbnail;
  const duration = Math.round(clip.end_time - clip.start_time);
  const isPro = subscriptionTier !== "free";
  const [showQuality, setShowQuality] = useState(false);
  const [changingQuality, setChangingQuality] = useState(false);
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

  const handleQualityChange = async (quality: string) => {
    if (quality === clip.quality) {
      setShowQuality(false);
      return;
    }
    setChangingQuality(true);
    setShowQuality(false);
    try {
      const updated = await updateClip(clip.id, { quality });
      onClipUpdate?.(updated);
    } catch (err: any) {
      alert(err.message || "Failed to change quality");
    } finally {
      setChangingQuality(false);
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
              {changingQuality ? "Re-rendering" : clip.status}
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
            {clip.status === "rendering" && changingQuality ? "re-rendering" : clip.status}
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
            {/* Quality selector */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowQuality(!showQuality)}
                className="flex items-center gap-1 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-xs transition-colors"
                disabled={changingQuality}
              >
                {changingQuality ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    {clip.quality || "480p"}
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
              {showQuality && (
                <div className="absolute bottom-full mb-1 right-0 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden shadow-xl z-10">
                  {QUALITY_OPTIONS.map((q) => {
                    const locked = !isPro && q !== "480p";
                    return (
                      <button
                        key={q}
                        onClick={() => !locked && handleQualityChange(q)}
                        className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors ${
                          clip.quality === q
                            ? "bg-purple-600 text-white"
                            : locked
                            ? "text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        {q}
                        {locked && <Lock className="w-3 h-3 text-zinc-500" />}
                        {q === clip.quality && <span className="text-[10px]">✓</span>}
                      </button>
                    );
                  })}
                  {!isPro && (
                    <div className="px-3 py-2 text-[10px] text-zinc-500 border-t border-zinc-200 dark:border-zinc-700">
                      Upgrade to Pro for HD
                    </div>
                  )}
                </div>
              )}
            </div>

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
