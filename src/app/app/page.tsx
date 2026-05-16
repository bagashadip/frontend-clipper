"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  FolderOpen,
  Plus,
  Clock,
  CheckCircle2,
  Loader2,
  XCircle,
  ChevronLeft,
  LogOut,
  Crown,
  User,
  Zap,
  Sun,
  Moon,
} from "lucide-react";
import Image from "next/image";
import URLInput from "@/components/URLInput";
import SubmitWizard from "@/components/SubmitWizard";
import ProgressBar from "@/components/ProgressBar";
import ClipGrid from "@/components/ClipGrid";
import EditorModal from "@/components/EditorModal";
import { SidebarProjectSkeleton, ProjectDetailSkeleton, ClipGridSkeleton, Skeleton } from "@/components/Skeleton";
import { useTheme } from "@/components/ThemeProvider";
import { processURL, getVideo, getQuota, getMe, listVideos } from "@/lib/api";
import type { UserProfile, ProcessURLPayload, CategoryId, CaptionStyleId, Resolution } from "@/lib/api";
import { SourceVideo, Clip } from "@/lib/types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const PROCESSING_STATUSES = [
  "pending",
  "downloading",
  "transcribing",
  "analyzing",
  "rendering",
];

function formatDuration(seconds: number | null) {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function statusIcon(status: string) {
  if (PROCESSING_STATUSES.includes(status))
    return <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />;
  if (status === "completed")
    return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
  if (status === "failed")
    return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  return <Clock className="w-3.5 h-3.5 text-zinc-500" />;
}

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      }
    >
      <Home />
    </Suspense>
  );
}

function Home() {
  const [projects, setProjects] = useState<SourceVideo[]>([]);
  const [activeProject, setActiveProject] = useState<SourceVideo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingProject, setLoadingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  // Redirect to login if no token, fetch tier + projects
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      window.location.href = `${BACKEND_URL}/auth/login`;
      return;
    }
    getMe()
      .then((u) => {
        setUserProfile(u);
        setSubscriptionTier(u.subscription_tier);
      })
      .catch(() => {
        // Fallback to quota endpoint
        getQuota()
          .then((q) => setSubscriptionTier(q.subscription_tier))
          .catch(() => {});
      });
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const videos = await listVideos();
      setProjects(videos);
      return videos;
    } catch {
      // Ignore — may fail on first load
      return [];
    } finally {
      setLoadingProjects(false);
    }
  };

  // On mount (and when projects load), select project from URL param.
  // Use a ref to ensure this runs at most once per project ID — without it,
  // every poll-driven `setProjects` would re-trigger selectProject and cause
  // a skeleton flash mid-render.
  const initialSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const projectId = searchParams.get("project");
    if (!projectId) return;
    if (submittedRef.current) return;
    if (initialSelectedRef.current === projectId) return;
    if (projects.length === 0) return;

    const found = projects.find((p) => p.id === projectId);
    if (found) {
      initialSelectedRef.current = projectId;
      selectProject(found);
    }
  }, [projects, searchParams]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollVideo = useCallback(
    (videoId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const data = await getVideo(videoId);
          setActiveProject(data);

          // Also update in project list
          setProjects((prev) =>
            prev.map((p) => (p.id === data.id ? data : p))
          );

          // Stop only when the video itself AND all clips are in a terminal state.
          // Without the clips check, polling stops while clips are still
          // "pending"/"rendering", leaving ClipCards stuck in their loading skeleton.
          const videoSettled = !PROCESSING_STATUSES.includes(data.status);
          const allClipsSettled = data.clips.every(
            (c) => c.status === "completed" || c.status === "failed"
          );

          if (videoSettled && allClipsSettled) {
            stopPolling();
            setLoading(false);
          }
        } catch {
          stopPolling();
          setLoading(false);
        }
      }, 3000);
    },
    [stopPolling]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Auto-submit if URL passed from landing page
  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam && !submittedRef.current) {
      submittedRef.current = true;
      // Legacy deeplink path: skip the wizard, use defaults
      handleSubmit(urlParam);
    }
  }, [searchParams]);

  const selectProject = async (project: SourceVideo) => {
    stopPolling();
    setError(null);

    // Show the existing data immediately. Only show the skeleton if we
    // genuinely have nothing to display (no project yet selected, or the
    // selected one has no clips). This prevents the skeleton flash when
    // navigating between already-loaded projects or refreshing the page
    // while a clip is rendering.
    const hasUsableData =
      activeProject?.id === project.id || project.clips !== undefined;
    setActiveProject(project);
    setLoadingProject(!hasUsableData);

    // Update URL
    router.replace(`/app?project=${project.id}`, { scroll: false });

    // Always fetch fresh data in the background
    try {
      const fresh = await getVideo(project.id);
      setActiveProject(fresh);

      // Start polling if the video is processing OR if any clip is still
      // rendering (video.status can be "completed" while clips are mid-render).
      const hasActiveTasks =
        PROCESSING_STATUSES.includes(fresh.status) ||
        fresh.clips.some(
          (c) => c.status === "pending" || c.status === "rendering"
        );

      if (hasActiveTasks) {
        // Don't toggle the global "loading" overlay — clips are already
        // visible with their per-card rendering states. We just want polling.
        pollVideo(fresh.id);
      } else {
        setLoading(false);
      }
    } catch {
      setError("Failed to load project");
    } finally {
      setLoadingProject(false);
    }
  };

  const handleSubmit = async (
    payload: string | {
      youtube_url: string;
      selected_categories: CategoryId[];
      caption_style: CaptionStyleId;
      resolution: Resolution;
    }
  ) => {
    setError(null);
    setLoading(true);
    setActiveProject(null);
    // Prevent the ?project= param effect from calling selectProject
    // after router.replace below, which would cause a skeleton flash
    submittedRef.current = true;

    try {
      const result = await processURL(
        typeof payload === "string" ? payload : (payload as ProcessURLPayload)
      );
      const data = await getVideo(result.video_id);
      setActiveProject(data);

      // Add to projects list at the top
      setProjects((prev) => [data, ...prev]);

      // Update URL to project
      router.replace(`/app?project=${data.id}`, { scroll: false });

      pollVideo(result.video_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const handleNewProject = () => {
    stopPolling();
    setActiveProject(null);
    setError(null);
    setLoading(false);
    submittedRef.current = false;
    router.replace("/app", { scroll: false });
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const handleClipSelect = (clip: Clip) => {
    setSelectedClip(clip);
  };

  const handleEditorSaved = () => {
    setSelectedClip(null);
    if (activeProject) {
      // Don't re-fetch immediately — the clip just entered "pending".
      // Polling will pick up the updated state within 3s without causing a flash.
      if (!pollRef.current) {
        pollVideo(activeProject.id);
      }
    }
  };

  const handleClipUpdate = (updatedClip: Clip) => {
    if (activeProject) {
      const updated = {
        ...activeProject,
        clips: activeProject.clips.map((c) =>
          c.id === updatedClip.id ? updatedClip : c
        ),
      };
      setActiveProject(updated);
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );

      // If the clip just entered a re-render queue, start polling the video
      // so the UI updates automatically when rendering finishes.
      const isRerendering =
        updatedClip.status === "pending" || updatedClip.status === "rendering";
      if (isRerendering && !pollRef.current) {
        pollVideo(activeProject.id);
      }
    }
  };

  const isProcessing =
    activeProject && PROCESSING_STATUSES.includes(activeProject.status);

  return (
    <main className="h-screen flex overflow-hidden">
      {/* ── Sidebar: Project List ── */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } shrink-0 border-r border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950 transition-all duration-200 overflow-hidden flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Projects
              </span>
            </div>
            <button
              onClick={handleNewProject}
              className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
              title="New Project"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto">
          {loadingProjects ? (
            <SidebarProjectSkeleton />
          ) : projects.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              No projects yet.
              <br />
              Paste a YouTube URL to start.
            </div>
          ) : (
            <div className="py-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => selectProject(project)}
                  className={`w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors border-b border-zinc-100 dark:border-white/[0.03] ${
                    activeProject?.id === project.id
                      ? "bg-purple-50 dark:bg-purple-600/10 border-l-2 border-l-purple-500"
                      : "border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {statusIcon(project.status)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {project.title || "Untitled"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-zinc-500">
                          {formatDuration(project.duration_seconds)}
                        </span>
                        <span className="text-xs text-zinc-600">·</span>
                        <span className="text-xs text-zinc-500">
                          {project.clips?.length || 0} clips
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-0.5 truncate">
                        {new Date(project.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Account Panel ── */}
        <div className="shrink-0 border-t border-zinc-200 dark:border-white/5 p-3 space-y-2">
          {/* Quota Bar */}
          {userProfile && (
            <div className="px-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                <span>Quota</span>
                <span>
                  {Math.floor(userProfile.quota_seconds_remaining / 60)}m left
                </span>
              </div>
              <div className="h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (userProfile.quota_seconds_remaining / 36000) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* User Info */}
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">
                {userProfile?.email?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-800 dark:text-zinc-200 truncate">
                {userProfile?.email || "Loading..."}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {subscriptionTier === "free" ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                    <Zap className="w-2.5 h-2.5" />
                    Free
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    <Crown className="w-2.5 h-2.5" />
                    {subscriptionTier.charAt(0).toUpperCase() +
                      subscriptionTier.slice(1)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1.5">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-white/5 rounded-lg transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => router.push("/app/account")}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              Account
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-zinc-200 dark:border-white/5 bg-white/50 dark:bg-zinc-950/50 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded transition-colors"
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform ${
                !sidebarOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {activeProject && (
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
              {activeProject.title || "Processing..."}
            </h2>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Initial page load skeleton */}
          {loadingProjects && !activeProject && !loading && (
            <section className="px-6 pt-8">
              <div className="flex flex-col items-center justify-center pt-16 pb-8 animate-pulse">
                <div className="flex items-center gap-3 mb-6">
                  <Skeleton className="w-14 h-14 rounded-2xl" />
                  <Skeleton className="h-9 w-52" />
                </div>
                <Skeleton className="h-4 w-80 mb-2" />
                <Skeleton className="h-4 w-64 mb-10" />
                <Skeleton className="h-14 w-full max-w-xl rounded-2xl" />
              </div>
            </section>
          )}

          {/* No project selected — show wizard */}
          {!activeProject && !loading && !loadingProjects && (
            <section className="flex flex-col items-center pt-16 pb-16 px-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-600/20 rounded-2xl">
                  <Image src="/assets/zclip-icon.png" alt="Logo" width={48} height={48} className="w-18 h-18" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  New <span className="text-purple-400">Project</span>
                </h1>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-base mb-8 text-center max-w-xl">
                Configure your clip generation in 4 quick steps. AI will find
                the most viral moments and render ready-to-post clips.
              </p>

              <SubmitWizard
                subscriptionTier={subscriptionTier}
                onSubmit={handleSubmit}
                isSubmitting={loading}
              />

              {error && (
                <div className="mt-6 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-3 rounded-xl max-w-2xl w-full">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </section>
          )}

          {/* Loading new project (before activeProject is set) */}
          {!activeProject && loading && (
            <section className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6">
              {/* Animated ring */}
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
                <div className="absolute inset-[14px] rounded-full bg-purple-500/20 animate-pulse" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                  Submitting your video
                </p>
                <p className="text-sm text-zinc-500">
                  AI is preparing to analyze your content…
                </p>
              </div>
            </section>
          )}

          {/* Active project loading skeleton */}
          {activeProject && loadingProject && (
            <section className="px-6 pt-8">
              <ProjectDetailSkeleton />
              <ClipGridSkeleton />
            </section>
          )}

          {/* Active project exists */}
          {activeProject && !loadingProject && (
            <>
              {/* Processing State */}
              {isProcessing && (
                <section className="px-6 pt-8">
                  <ProgressBar status={activeProject.status} />
                </section>
              )}

              {/* Failed State */}
              {activeProject.status === "failed" && (
                <section className="px-6 pt-8 text-center">
                  <div className="max-w-md mx-auto bg-red-400/10 border border-red-500/20 rounded-2xl p-6">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <h3 className="font-semibold text-red-400 mb-2">
                      Processing Failed
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {activeProject.error_message ||
                        "An unknown error occurred. Please try again."}
                    </p>
                  </div>
                </section>
              )}

              {/* Clip Grid */}
              {activeProject.clips.length > 0 && (
                <section className="px-6 py-8">
                  <ClipGrid
                    clips={activeProject.clips}
                    youtubeId={activeProject.youtube_id}
                    onSelectClip={handleClipSelect}
                    onClipUpdate={handleClipUpdate}
                  />
                </section>
              )}

              {/* Completed but no clips */}
              {activeProject.status === "completed" &&
                activeProject.clips.length === 0 && (
                  <section className="px-6 pt-8 text-center">
                    <p className="text-zinc-400">
                      No clips were generated for this video.
                    </p>
                  </section>
                )}

              {/* Error from submit */}
              {error && (
                <div className="mx-6 mt-4 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {selectedClip && (
        <EditorModal
          clip={selectedClip}
          maxSourceHeight={activeProject?.max_source_height ?? null}
          subscriptionTier={subscriptionTier}
          onClose={() => setSelectedClip(null)}
          onSaved={handleEditorSaved}
        />
      )}
    </main>
  );
}
