"use client";

import { useState, useRef, useEffect } from "react";
import { X, Save, RotateCcw, Type, Plus, Trash2, Clock, Move, Monitor, Smartphone, Crop, Sparkles, ArrowLeft } from "lucide-react";
import { Clip, Subtitle } from "@/lib/types";
import { updateClip, updateSubtitle, createSubtitle, deleteSubtitle, getClipPreviewUrl, getClipProxyUrl } from "@/lib/api";

interface EditorModalProps {
  clip: Clip;
  subscriptionTier: string;
  onClose: () => void;
  onSaved: () => void;
}

const CAPTION_STYLES = [
  { key: "classic" as const, label: "Classic", desc: "White text, black stroke" },
  { key: "hormozi" as const, label: "Hormozi Style", desc: "Yellow bold, heavy stroke" },
  { key: "hormozi_dynamic" as const, label: "Hormozi Dynamic", desc: "Word-by-word animated highlight" },
  { key: "impact_pop" as const, label: "Impact Pop", desc: "Green highlight, orange background" },
  { key: "typewriter" as const, label: "Typewriter", desc: "Letter-by-letter reveal, monospace font" },
  { key: "none" as const, label: "No Captions", desc: "Clean video only" },
];

export default function EditorModal({ clip, subscriptionTier, onClose, onSaved }: EditorModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const proxyVideoRef = useRef<HTMLVideoElement>(null);
  const [startTime, setStartTime] = useState(clip.start_time);
  const [endTime, setEndTime] = useState(clip.end_time);
  const [captionStyle, setCaptionStyle] = useState(clip.caption_style);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [subtitles, setSubtitles] = useState<Subtitle[]>(clip.subtitles);
  const [saving, setSaving] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [addingAfterIdx, setAddingAfterIdx] = useState<number | null>(null);
  const [newWord, setNewWord] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Proxy editing state (pro only)
  const isPro = subscriptionTier !== "free";
  const [exportFormat, setExportFormat] = useState<"9:16" | "16:9">(clip.export_format || "9:16");
  const [cropXPercent, setCropXPercent] = useState(clip.crop_x_percent ?? 50);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [proxyLoading, setProxyLoading] = useState(false);
  const [proxyError, setProxyError] = useState<string | null>(null);
  const [cropEditMode, setCropEditMode] = useState(false);

  const duration = clip.end_time - clip.start_time;

  // Fetch lightweight preview URL for editor playback
  useEffect(() => {
    if (clip.storage_url) {
      getClipPreviewUrl(clip.id).then(setVideoUrl).catch(() => setVideoUrl(null));
    }
  }, [clip.id, clip.storage_url]);

  // Load proxy video only when crop edit mode is activated (on demand)
  useEffect(() => {
    if (!cropEditMode || proxyUrl) return;
    let cancelled = false;
    const MAX_RETRIES = 6;
    const RETRY_DELAY = 3000;

    async function loadProxy(attempt: number) {
      if (cancelled) return;
      if (attempt === 0) {
        setProxyLoading(true);
        setProxyError(null);
      }
      try {
        const url = await getClipProxyUrl(clip.id);
        if (!cancelled) {
          setProxyUrl(url);
          setProxyLoading(false);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (attempt < MAX_RETRIES) {
          setTimeout(() => loadProxy(attempt + 1), RETRY_DELAY);
        } else {
          setProxyError(err instanceof Error ? err.message : "Failed to load proxy");
          setProxyLoading(false);
        }
      }
    }

    loadProxy(0);
    return () => { cancelled = true; };
  }, [clip.id, cropEditMode, proxyUrl]);
  const maxAdjust = 10; // seconds of adjustment allowed

  // Track video playback time
  useEffect(() => {
    const video = cropEditMode ? proxyVideoRef.current : videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [videoUrl, proxyUrl, cropEditMode]);

  // Convert current video time to absolute time (relative to original video)
  const absoluteTime = clip.start_time + currentTime;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(2);
    return `${m}:${parseFloat(s) < 10 ? "0" : ""}${s}`;
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubtitleClick = (sub: Subtitle) => {
    setEditingSubId(sub.id);
    setEditValue(sub.word);
  };

  const handleSubtitleSave = async (subId: string) => {
    try {
      await updateSubtitle(subId, editValue);
      setSubtitles((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, word: editValue } : s))
      );
    } catch (err) {
      console.error("Failed to update subtitle:", err);
    }
    setEditingSubId(null);
  };

  const handleAddSubtitle = async () => {
    const start = parseFloat(newStartTime);
    const end = parseFloat(newEndTime);
    if (!newWord.trim() || isNaN(start) || isNaN(end) || end <= start) return;

    try {
      const result = await createSubtitle({
        clip_id: clip.id,
        word: newWord.trim(),
        start_timestamp: start,
        end_timestamp: end,
      });
      // Insert into local state at the right position
      const newSub: Subtitle = {
        id: result.id,
        clip_id: clip.id,
        word: newWord.trim(),
        start_timestamp: start,
        end_timestamp: end,
        sequence_index: result.sequence_index,
      };
      setSubtitles((prev) => {
        const updated = prev.map((s) =>
          s.sequence_index >= result.sequence_index
            ? { ...s, sequence_index: s.sequence_index + 1 }
            : s
        );
        updated.push(newSub);
        return updated.sort((a, b) => a.sequence_index - b.sequence_index);
      });
    } catch (err) {
      console.error("Failed to add subtitle:", err);
    }
    setAddingAfterIdx(null);
    setNewWord("");
    setNewStartTime("");
    setNewEndTime("");
  };

  const handleDeleteSubtitle = async (subId: string) => {
    try {
      await deleteSubtitle(subId);
      setSubtitles((prev) => prev.filter((s) => s.id !== subId));
    } catch (err) {
      console.error("Failed to delete subtitle:", err);
    }
  };

  const openAddForm = (afterIndex: number) => {
    // Pre-fill timestamps based on neighboring words
    const afterSub = subtitles.find((s) => s.sequence_index === afterIndex);
    const nextSub = subtitles.find((s) => s.sequence_index === afterIndex + 1);
    const suggestedStart = afterSub ? afterSub.end_timestamp : clip.start_time;
    const suggestedEnd = nextSub ? nextSub.start_timestamp : suggestedStart + 0.5;
    setAddingAfterIdx(afterIndex);
    setNewStartTime(suggestedStart.toFixed(2));
    setNewEndTime(suggestedEnd.toFixed(2));
    setNewWord("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        start_time: startTime,
        end_time: endTime,
        caption_style: captionStyle,
      };
      if (isPro) {
        payload.export_format = exportFormat;
        payload.crop_x_percent = cropXPercent;
      }
      await updateClip(clip.id, payload as Parameters<typeof updateClip>[1]);
      onSaved();
    } catch (err) {
      console.error("Failed to save clip:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-lg font-bold truncate">{clip.title || "Untitled Clip"}</h2>
            <div className="flex items-center gap-3 mt-1">
              {clip.virality_score != null && (
                <div className="flex items-center gap-1.5">
                  <Sparkles className={`w-3.5 h-3.5 ${
                    clip.virality_score >= 8 ? "text-yellow-400" :
                    clip.virality_score >= 5 ? "text-purple-400" :
                    "text-zinc-500"
                  }`} />
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          clip.virality_score >= 8 ? "bg-yellow-400" :
                          clip.virality_score >= 5 ? "bg-purple-500" :
                          "bg-zinc-500"
                        }`}
                        style={{ width: `${clip.virality_score * 10}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold tabular-nums ${
                      clip.virality_score >= 8 ? "text-yellow-400" :
                      clip.virality_score >= 5 ? "text-purple-400" :
                      "text-zinc-500"
                    }`}>
                      {clip.virality_score}/10
                    </span>
                  </div>
                </div>
              )}
              {clip.reasoning && (
                <span className="text-xs text-zinc-500 truncate" title={clip.reasoning}>
                  {clip.reasoning}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto flex flex-col md:flex-row">
          {/* Left: Video Player */}
          <div className="md:w-1/2 p-6 flex flex-col items-center">
            {/* Crop Edit Mode: proxy with overlay */}
            {cropEditMode ? (
              <>
                {/* Format Toggle */}
                <div className="w-full max-w-[440px] mb-4 flex gap-2">
                  <button
                    onClick={() => setExportFormat("9:16")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                      exportFormat === "9:16"
                        ? "border-purple-500 bg-purple-600/10 text-purple-300"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Portrait 9:16
                  </button>
                  <button
                    onClick={() => setExportFormat("16:9")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                      exportFormat === "16:9"
                        ? "border-purple-500 bg-purple-600/10 text-purple-300"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    Landscape 16:9
                  </button>
                </div>

                {/* Proxy Video with Crop Overlay */}
                <div className="w-full max-w-[440px] relative">
                  <div className="w-full aspect-video bg-zinc-950 rounded-xl overflow-hidden relative">
                    {proxyLoading ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Generating preview, this may take a moment...</span>
                      </div>
                    ) : proxyError ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 text-sm px-4 text-center gap-2">
                        <span>{proxyError}</span>
                        <button
                          onClick={() => { setProxyError(null); setProxyUrl(null); }}
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          Retry
                        </button>
                      </div>
                    ) : proxyUrl ? (
                      <>
                        <video
                          ref={proxyVideoRef}
                          src={proxyUrl}
                          controls
                          preload="metadata"
                          className="w-full h-full object-contain"
                        />
                        {/* 9:16 Crop Overlay (only shown for portrait mode) */}
                        {exportFormat === "9:16" && (
                          <div
                            className="absolute top-0 bottom-0 pointer-events-none"
                            style={{ left: 0, right: 0 }}
                          >
                            {/* Dark overlays on sides */}
                            <div
                              className="absolute top-0 bottom-0 left-0 bg-black/60"
                              style={{
                                width: `${Math.max(0, (cropXPercent / 100) * (1 - 9 / 16) * 100)}%`,
                              }}
                            />
                            <div
                              className="absolute top-0 bottom-0 right-0 bg-black/60"
                              style={{
                                width: `${Math.max(0, ((100 - cropXPercent) / 100) * (1 - 9 / 16) * 100)}%`,
                              }}
                            />
                            {/* Crop frame border */}
                            <div
                              className="absolute top-0 bottom-0 border-2 border-purple-500/80 border-dashed"
                              style={{
                                width: `${(9 / 16) * 100}%`,
                                left: `${(cropXPercent / 100) * (1 - 9 / 16) * 100}%`,
                              }}
                            >
                              <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-purple-600/80 text-[10px] text-white px-1.5 py-0.5 rounded">
                                9:16
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Type className="w-12 h-12" />
                      </div>
                    )}
                  </div>

                  {/* Crop Position Slider (only for 9:16) */}
                  {exportFormat === "9:16" && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Move className="w-3.5 h-3.5" />
                          Crop Position
                        </div>
                        <span className="text-xs font-mono text-purple-300">{cropXPercent.toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={cropXPercent}
                        onChange={(e) => setCropXPercent(parseFloat(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
                        <span>Left</span>
                        <span>Center</span>
                        <span>Right</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Back to preview button */}
                <button
                  onClick={() => {
                    setCropXPercent(clip.crop_x_percent ?? 50);
                    setExportFormat(clip.export_format || "9:16");
                    setCropEditMode(false);
                  }}
                  className="mt-4 flex items-center justify-center gap-2 px-4 py-2 w-full max-w-[440px] border border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-sm text-zinc-300 hover:text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back without changes
                </button>
              </>
            ) : (
              /* Default: Show rendered clip video */
              <>
                <div className="w-full max-w-[280px] aspect-[9/16] bg-zinc-950 rounded-xl overflow-hidden">
                  {videoUrl ? (
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <Type className="w-12 h-12" />
                    </div>
                  )}
                </div>

                {/* Edit Crop Position button (pro only) */}
                {isPro && (
                  <button
                    onClick={() => setCropEditMode(true)}
                    className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-300 
                               bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/30 
                               rounded-xl transition-all"
                  >
                    <Crop className="w-4 h-4" />
                    Edit Crop Position
                  </button>
                )}
              </>
            )}

            {/* Live Time Tracker */}
            <div className={`w-full ${cropEditMode ? 'max-w-[440px]' : 'max-w-[280px]'} mt-4 p-3 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-zinc-400">Current Position</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-green-500 animate-pulse" : "bg-zinc-500"}`} />
              </div>
              <div className="mt-1.5 flex items-baseline gap-3">
                <div>
                  <span className="text-xs text-zinc-500">Clip: </span>
                  <span className="text-lg font-mono font-bold text-white">{formatTime(currentTime)}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500">Original: </span>
                  <span className="text-sm font-mono text-purple-300">{absoluteTime.toFixed(2)}s</span>
                </div>
              </div>
            </div>

            {/* Timeline Scrubber */}
            <div className={`w-full ${cropEditMode ? 'max-w-[440px]' : 'max-w-[280px]'} mt-4 space-y-4`}>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">
                  Start Time: {startTime.toFixed(1)}s
                </label>
                <input
                  type="range"
                  min={Math.max(0, clip.start_time - maxAdjust)}
                  max={clip.start_time + maxAdjust}
                  step={0.1}
                  value={startTime}
                  onChange={(e) => setStartTime(parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">
                  End Time: {endTime.toFixed(1)}s
                </label>
                <input
                  type="range"
                  min={Math.max(0, clip.end_time - maxAdjust)}
                  max={clip.end_time + maxAdjust}
                  step={0.1}
                  value={endTime}
                  onChange={(e) => setEndTime(parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Right: Transcript Editor & Style Toggle */}
          <div className="md:w-1/2 p-6 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
            {cropEditMode ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500 px-6">
                <Crop className="w-10 h-10 mb-3 text-purple-400/50" />
                <p className="text-sm font-medium text-zinc-300 mb-1">Crop Edit Mode</p>
                <p className="text-xs mb-6">Adjust the crop position and format using the controls on the left. Subtitle editing is available in the main preview.</p>
                <button
                  onClick={() => {
                    setCropXPercent(clip.crop_x_percent ?? 50);
                    setExportFormat(clip.export_format || "9:16");
                    setCropEditMode(false);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 border border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-sm text-zinc-300 hover:text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back without changes
                </button>
              </div>
            ) : (
            <>
            {/* Caption Style Toggle */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Caption Style</h3>
              <div className="grid grid-cols-3 gap-2">
                {CAPTION_STYLES.map((style) => (
                  <button
                    key={style.key}
                    onClick={() => setCaptionStyle(style.key)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      captionStyle === style.key
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-600/10"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
                    }`}
                  >
                    <div className="text-sm font-medium">{style.label}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript Editor */}
            <div className="flex-1 overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-300">Transcript</h3>
                <button
                  onClick={() => openAddForm(subtitles.length > 0 ? subtitles[subtitles.length - 1].sequence_index : -1)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-purple-400 hover:text-purple-300 
                             hover:bg-purple-600/10 rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Word
                </button>
              </div>

              {/* Add form */}
              {addingAfterIdx !== null && (
                <div className="mb-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl space-y-2">
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Word or phrase..."
                    autoFocus
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded-lg text-sm 
                               text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddSubtitle();
                      if (e.key === "Escape") setAddingAfterIdx(null);
                    }}
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-zinc-500 mb-0.5 block">Start (s)</label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={newStartTime}
                          onChange={(e) => setNewStartTime(e.target.value)}
                          className="w-full px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-xs 
                                     text-white outline-none focus:border-purple-500"
                        />
                        <button
                          onClick={() => setNewStartTime(absoluteTime.toFixed(2))}
                          className="px-1.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-600/50 
                                     rounded text-[10px] text-purple-300 whitespace-nowrap transition-colors"
                          title="Use current video position"
                        >
                          Use
                        </button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-zinc-500 mb-0.5 block">End (s)</label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={newEndTime}
                          onChange={(e) => setNewEndTime(e.target.value)}
                          className="w-full px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-xs 
                                     text-white outline-none focus:border-purple-500"
                        />
                        <button
                          onClick={() => setNewEndTime(absoluteTime.toFixed(2))}
                          className="px-1.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-600/50 
                                     rounded text-[10px] text-purple-300 whitespace-nowrap transition-colors"
                          title="Use current video position"
                        >
                          Use
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setAddingAfterIdx(null)}
                      className="px-3 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSubtitle}
                      disabled={!newWord.trim() || !newStartTime || !newEndTime}
                      className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 
                                 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {subtitles.map((sub) => (
                  <span key={sub.id} className="group relative">
                    {editingSubId === sub.id ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSubtitleSave(sub.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSubtitleSave(sub.id);
                          if (e.key === "Escape") setEditingSubId(null);
                        }}
                        autoFocus
                        className="px-2 py-1 bg-purple-600/20 border border-purple-500 rounded text-sm 
                                   text-white outline-none min-w-[40px]"
                        style={{ width: `${Math.max(40, editValue.length * 9)}px` }}
                      />
                    ) : (
                      <button
                        onClick={() => handleSubtitleClick(sub)}
                        className={`px-2 py-1 rounded text-sm transition-colors cursor-pointer relative ${
                          absoluteTime >= sub.start_timestamp && absoluteTime < sub.end_timestamp
                            ? "bg-purple-600/30 ring-1 ring-purple-500 text-purple-200"
                            : "bg-zinc-800 hover:bg-zinc-700"
                        }`}
                        title={`${sub.start_timestamp.toFixed(2)}s – ${sub.end_timestamp.toFixed(2)}s | Right-click to delete`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (confirm(`Delete "${sub.word}"?`)) {
                            handleDeleteSubtitle(sub.id);
                          }
                        }}
                      >
                        {sub.word}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${sub.word}"?`)) {
                              handleDeleteSubtitle(sub.id);
                            }
                          }}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 hover:bg-red-500 
                                     rounded-full items-center justify-center text-[10px] cursor-pointer
                                     hidden group-hover:flex transition-all"
                        >
                          ×
                        </span>
                      </button>
                    )}
                    {/* Insert button between words */}
                    <button
                      onClick={() => openAddForm(sub.sequence_index)}
                      className="ml-0.5 w-4 h-4 items-center justify-center text-zinc-600 hover:text-purple-400 
                                 hover:bg-purple-600/10 rounded-full text-[10px] hidden group-hover:inline-flex 
                                 transition-all align-middle"
                      title="Insert word after"
                    >
                      +
                    </button>
                  </span>
                ))}
              </div>
            </div>
            </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => {
              setStartTime(clip.start_time);
              setEndTime(clip.end_time);
              setCaptionStyle(clip.caption_style);
              setSubtitles(clip.subtitles);
              setExportFormat(clip.export_format || "9:16");
              setCropXPercent(clip.crop_x_percent ?? 50);
              setCropEditMode(false);
            }}
            className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white 
                       transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 
                       disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl 
                       font-semibold transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save & Re-render"}
          </button>
        </div>
      </div>
    </div>
  );
}
