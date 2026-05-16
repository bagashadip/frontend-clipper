"use client";

/**
 * Multi-step submission wizard:
 *   Step 0: YouTube URL → fetch metadata
 *   Step 1: Pick at least 2 categories (Humor, Shock, ...)
 *   Step 2: Pick caption style
 *   Step 3: Pick resolution (gated by tier + source)
 *   Step 4: Submit
 *
 * State is preserved across Back navigation. Persisted to sessionStorage so a
 * full reload mid-wizard doesn't lose the user's choices.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Zap,
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  Crown,
  Sparkles,
} from "lucide-react";
import {
  ALL_CATEGORIES,
  CategoryId,
  CaptionStyleId,
  Resolution,
  YoutubeMetadata,
  getYoutubeMetadata,
} from "@/lib/api";

// ── Static catalogs ──────────────────────────────────────────────────────

const CATEGORY_META: Record<
  CategoryId,
  { emoji: string; label: string; description: string }
> = {
  humor: {
    emoji: "😂",
    label: "Humor",
    description: "Punchlines, comedic timing, witty roasts.",
  },
  shock: {
    emoji: "😱",
    label: "Shock",
    description: "Plot twists, jaw-dropping facts, big reveals.",
  },
  controversy: {
    emoji: "🔥",
    label: "Controversy",
    description: "Hot takes, debates, sharp opinions.",
  },
  emotional: {
    emoji: "😢",
    label: "Emotional",
    description: "Vulnerable moments, heartfelt storytelling.",
  },
  insight: {
    emoji: "💡",
    label: "Insight",
    description: "Mindset shifts, rare tips, sharp analogies.",
  },
  motivation: {
    emoji: "🚀",
    label: "Motivation",
    description: "Wake-up calls, success stories, inspiration.",
  },
};

const CAPTION_STYLES: {
  id: CaptionStyleId;
  label: string;
  description: string;
  preview: string; // tailwind class string for visual flavour
}[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Clean white text, black outline. Goes with anything.",
    preview: "text-white",
  },
  {
    id: "hormozi",
    label: "Hormozi",
    description: "Bold yellow, bigger, attention-grabbing.",
    preview: "text-yellow-400",
  },
  {
    id: "hormozi_dynamic",
    label: "Hormozi Dynamic",
    description: "Yellow per-word karaoke highlight. Viral standard.",
    preview: "text-yellow-300",
  },
  {
    id: "impact_pop",
    label: "Impact Pop",
    description: "Cyan flash + scale pop on the active word.",
    preview: "text-cyan-300",
  },
  {
    id: "typewriter",
    label: "Typewriter",
    description: "Letter-by-letter reveal, monospaced.",
    preview: "text-white font-mono",
  },
  {
    id: "none",
    label: "No Captions",
    description: "Burn nothing. Just the cropped video.",
    preview: "text-zinc-400",
  },
];

const RESOLUTIONS: { id: Resolution; label: string; subtitle: string }[] = [
  { id: 480, label: "480p", subtitle: "854 × 480" },
  { id: 720, label: "720p", subtitle: "1280 × 720" },
  { id: 1080, label: "1080p", subtitle: "1920 × 1080" },
];

// ── Persistence ──────────────────────────────────────────────────────────

const STORAGE_KEY = "zclip:wizard:v1";

interface WizardState {
  step: number;
  url: string;
  metadata: YoutubeMetadata | null;
  categories: CategoryId[];
  captionStyle: CaptionStyleId;
  resolution: Resolution;
}

const DEFAULT_STATE: WizardState = {
  step: 0,
  url: "",
  metadata: null,
  categories: [],
  captionStyle: "classic",
  resolution: 480,
};

function loadState(): WizardState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: WizardState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* sessionStorage may be full or disabled — ignore */
  }
}

function clearState() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ── Component ────────────────────────────────────────────────────────────

interface SubmitWizardProps {
  subscriptionTier: string;
  onSubmit: (payload: {
    youtube_url: string;
    selected_categories: CategoryId[];
    caption_style: CaptionStyleId;
    resolution: Resolution;
  }) => void;
  isSubmitting: boolean;
}

export default function SubmitWizard({
  subscriptionTier,
  onSubmit,
  isSubmitting,
}: SubmitWizardProps) {
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // Persist on every change after hydration
  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const isFreeTier = subscriptionTier === "free";

  // ── Step 0: URL submission ─────────────────────────────────────────────
  const handleFetchMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.url.trim()) return;
    setMetaError(null);
    setMetaLoading(true);
    try {
      const meta = await getYoutubeMetadata(state.url.trim());
      setState((s) => ({ ...s, metadata: meta, step: 1 }));
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : "Could not load video info");
    } finally {
      setMetaLoading(false);
    }
  };

  // ── Step 1: Categories ─────────────────────────────────────────────────
  const toggleCategory = (id: CategoryId) => {
    setState((s) => ({
      ...s,
      categories: s.categories.includes(id)
        ? s.categories.filter((c) => c !== id)
        : [...s.categories, id],
    }));
  };

  const selectAllCategories = () => {
    setState((s) => ({
      ...s,
      categories:
        s.categories.length === ALL_CATEGORIES.length ? [] : [...ALL_CATEGORIES],
    }));
  };

  // ── Step 3: Resolution gating ──────────────────────────────────────────
  const maxRes = state.metadata?.max_resolution ?? 0;

  const isResolutionDisabled = (r: Resolution): { disabled: boolean; reason: string | null } => {
    if (isFreeTier && r > 480) {
      return {
        disabled: true,
        reason: "Upgrade to Pro for High-Definition rendering.",
      };
    }
    if (maxRes > 0 && r > maxRes) {
      return {
        disabled: true,
        reason: `Original video resolution is too low for ${r}p.`,
      };
    }
    return { disabled: false, reason: null };
  };

  // Auto-fix invalid resolution when entering step 3
  useEffect(() => {
    if (state.step !== 3) return;
    const { disabled } = isResolutionDisabled(state.resolution);
    if (disabled) {
      const next = ([480, 720, 1080] as Resolution[]).find(
        (r) => !isResolutionDisabled(r).disabled
      );
      if (next && next !== state.resolution) {
        setState((s) => ({ ...s, resolution: next }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step, isFreeTier, maxRes]);

  // ── Step 4: Submit ─────────────────────────────────────────────────────
  const handleFinalSubmit = () => {
    if (!state.metadata) return;
    onSubmit({
      youtube_url: state.url,
      selected_categories: state.categories,
      caption_style: state.captionStyle,
      resolution: state.resolution,
    });
    clearState();
  };

  const goBack = () => setState((s) => ({ ...s, step: Math.max(0, s.step - 1) }));
  const goNext = () => setState((s) => ({ ...s, step: Math.min(3, s.step + 1) }));

  // ── Validation per step ───────────────────────────────────────────────
  const canAdvance = useMemo(() => {
    if (state.step === 0) return state.metadata !== null;
    if (state.step === 1) return state.categories.length >= 2;
    if (state.step === 2) return !!state.captionStyle;
    if (state.step === 3) return !isResolutionDisabled(state.resolution).disabled;
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!hydrated) {
    return (
      <div className="w-full max-w-2xl mx-auto h-40 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Step indicator */}
      <StepIndicator current={state.step} total={4} />

      <div className="mt-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl p-6 md:p-8">
        {/* ── Step 0: URL input ─────────────────────────────────────── */}
        {state.step === 0 && (
          <form onSubmit={handleFetchMetadata} className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                Paste your YouTube URL
              </h3>
              <p className="text-sm text-zinc-500">
                We&apos;ll check resolution and runtime before the next step.
              </p>
            </div>

            <input
              type="url"
              value={state.url}
              onChange={(e) => setState((s) => ({ ...s, url: e.target.value, metadata: null }))}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 text-base bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl
                         text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2
                         focus:ring-purple-500 focus:border-transparent transition-all"
              disabled={metaLoading}
              autoFocus
            />

            {metaError && (
              <div className="flex items-start gap-2 text-red-500 bg-red-500/10 px-3 py-2 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{metaError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={metaLoading || !state.url.trim()}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:cursor-not-allowed
                         rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
            >
              {metaLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking video…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── Step 1: Categories ────────────────────────────────────── */}
        {state.step === 1 && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                  Pick clip categories
                </h3>
                <p className="text-sm text-zinc-500">
                  Choose at least 2. AI will only return clips that match these.
                </p>
              </div>
              <button
                type="button"
                onClick={selectAllCategories}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700
                           text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                {state.categories.length === ALL_CATEGORIES.length
                  ? "Clear all"
                  : "Select all"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_CATEGORIES.map((id) => {
                const meta = CATEGORY_META[id];
                const checked = state.categories.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleCategory(id)}
                    className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3
                      ${
                        checked
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                  >
                    <span className="text-2xl shrink-0">{meta.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {meta.label}
                        </span>
                        {checked && <Check className="w-4 h-4 text-purple-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {meta.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {state.categories.length === 1 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Pick one more category to continue.
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: Caption style ─────────────────────────────────── */}
        {state.step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                Caption style
              </h3>
              <p className="text-sm text-zinc-500">
                Pick how subtitles look. You can change this per-clip later in
                the editor.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CAPTION_STYLES.map((style) => {
                const checked = state.captionStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setState((s) => ({ ...s, captionStyle: style.id }))}
                    className={`text-left p-3 rounded-xl border transition-all
                      ${
                        checked
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {style.label}
                      </span>
                      {checked && <Check className="w-4 h-4 text-purple-500" />}
                    </div>
                    <div className="bg-zinc-900 rounded-lg py-3 mb-2 flex items-center justify-center">
                      <span className={`text-sm font-bold uppercase tracking-wider ${style.preview}`}>
                        Sample Text
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {style.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: Resolution ────────────────────────────────────── */}
        {state.step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                Output resolution
              </h3>
              <p className="text-sm text-zinc-500">
                {maxRes > 0
                  ? `Source video is ${maxRes}p.`
                  : "Source resolution unknown — limits may apply."}{" "}
                Vertical 9:16 clips.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {RESOLUTIONS.map((r) => {
                const { disabled, reason } = isResolutionDisabled(r.id);
                const checked = state.resolution === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setState((s) => ({ ...s, resolution: r.id }))}
                    className={`text-left p-4 rounded-xl border transition-all relative
                      ${
                        checked && !disabled
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10"
                          : disabled
                          ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 opacity-60 cursor-not-allowed"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                        {r.label}
                      </span>
                      {checked && !disabled && (
                        <Check className="w-4 h-4 text-purple-500" />
                      )}
                      {disabled && r.id > 480 && isFreeTier && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{r.subtitle}</p>
                    {disabled && reason && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 leading-snug">
                        {reason}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer nav ────────────────────────────────────────────── */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={state.step === 0 || isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400
                       hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {state.step < 3 && state.step > 0 && (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg
                         bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:cursor-not-allowed
                         text-white transition-colors"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {state.step === 3 && (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={!canAdvance || isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg
                         bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:cursor-not-allowed
                         text-white transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Clips
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Title preview when metadata loaded */}
      {state.metadata && state.step > 0 && (
        <div className="mt-4 px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
          <p className="text-zinc-900 dark:text-zinc-200 font-medium truncate">
            {state.metadata.title}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {Math.floor(state.metadata.duration / 60)}m {state.metadata.duration % 60}s
            {state.metadata.max_resolution > 0 &&
              ` • Source ${state.metadata.max_resolution}p`}
            {state.metadata.cached && " • cached"}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
              ${
                i < current
                  ? "bg-purple-600 text-white"
                  : i === current
                  ? "bg-purple-600 text-white ring-4 ring-purple-500/20"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
              }`}
          >
            {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`w-8 h-0.5 transition-colors ${
                i < current ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
