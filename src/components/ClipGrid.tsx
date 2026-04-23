"use client";

import { Clip } from "@/lib/types";
import ClipCard from "./ClipCard";

interface ClipGridProps {
  clips: Clip[];
  youtubeId: string;
  subscriptionTier: string;
  onSelectClip: (clip: Clip) => void;
  onClipUpdate?: (clip: Clip) => void;
}

export default function ClipGrid({ clips, youtubeId, subscriptionTier, onSelectClip, onClipUpdate }: ClipGridProps) {
  if (clips.length === 0) return null;

  const sortedClips = [...clips].sort(
    (a, b) => (b.virality_score || 0) - (a.virality_score || 0)
  );

  return (
    <div className="w-full max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">
        Generated Clips{" "}
        <span className="text-zinc-500 text-lg font-normal">({clips.length})</span>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {sortedClips.map((clip) => (
          <ClipCard
            key={clip.id}
            clip={clip}
            youtubeId={youtubeId}
            subscriptionTier={subscriptionTier}
            onSelect={onSelectClip}
            onClipUpdate={onClipUpdate}
          />
        ))}
      </div>
    </div>
  );
}
