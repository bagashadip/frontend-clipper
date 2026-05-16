import { SourceVideo, ProcessURLResponse, Clip } from "./types";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Wizard types ──────────────────────────────────────────────────────────

export type CategoryId =
  | "humor"
  | "shock"
  | "controversy"
  | "emotional"
  | "insight"
  | "motivation";

export const ALL_CATEGORIES: CategoryId[] = [
  "humor",
  "shock",
  "controversy",
  "emotional",
  "insight",
  "motivation",
];

export type CaptionStyleId =
  | "classic"
  | "hormozi"
  | "hormozi_dynamic"
  | "impact_pop"
  | "typewriter"
  | "kenergy"
  | "midnight"
  | "cleanboss"
  | "staccato"
  | "serenity"
  | "none";

export type Resolution = 480 | 720 | 1080;

export interface YoutubeMetadata {
  max_resolution: number;
  title: string;
  duration: number;
  cached: boolean;
}

export interface ProcessURLPayload {
  youtube_url: string;
  selected_categories?: CategoryId[];
  caption_style?: CaptionStyleId;
  resolution?: Resolution;
}

// ── Wizard API calls ──────────────────────────────────────────────────────

export async function getYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
  const res = await fetch(
    `${API_BASE}/youtube/metadata?url=${encodeURIComponent(url)}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to fetch video metadata");
  }
  return res.json();
}

export async function processURL(
  payload: string | ProcessURLPayload
): Promise<ProcessURLResponse> {
  const body =
    typeof payload === "string" ? { youtube_url: payload } : payload;
  const res = await fetch(`${API_BASE}/process-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to process URL");
  }
  return res.json();
}

export async function getVideo(videoId: string): Promise<SourceVideo> {
  const res = await fetch(`${API_BASE}/videos/${videoId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch video");
  return res.json();
}

export async function getClip(clipId: string): Promise<Clip> {
  const res = await fetch(`${API_BASE}/clips/${clipId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch clip");
  return res.json();
}

export async function getClipDownloadUrl(clipId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/clips/${clipId}/download`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to get download URL");
  const data = await res.json();
  return data.url;
}

export async function getClipPreviewUrl(clipId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/clips/${clipId}/preview`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to get preview URL");
  const data = await res.json();
  return data.url;
}

export async function updateClip(
  clipId: string,
  data: { start_time?: number; end_time?: number; caption_style?: string; quality?: string; export_format?: string; crop_x_percent?: number }
): Promise<Clip> {
  const res = await fetch(`${API_BASE}/clips/${clipId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update clip");
  return res.json();
}

export async function updateSubtitle(
  subtitleId: string,
  word: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/subtitles/${subtitleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ word }),
  });
  if (!res.ok) throw new Error("Failed to update subtitle");
}

export async function createSubtitle(data: {
  clip_id: string;
  word: string;
  start_timestamp: number;
  end_timestamp: number;
}): Promise<{ id: string; sequence_index: number }> {
  const res = await fetch(`${API_BASE}/subtitles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create subtitle");
  return res.json();
}

export async function deleteSubtitle(subtitleId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/subtitles/${subtitleId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete subtitle");
}

export async function getClipProxyUrl(clipId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/clips/${clipId}/proxy`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to generate proxy");
  }
  const data = await res.json();
  return data.proxy_url;
}

export async function listVideos(): Promise<SourceVideo[]> {
  const res = await fetch(`${API_BASE}/videos`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch videos");
  return res.json();
}

export interface UserProfile {
  id: string;
  email: string;
  subscription_tier: string;
  quota_seconds_remaining: number;
}

export async function getMe(): Promise<UserProfile> {
  const res = await fetch(`/auth/me`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function getQuota(): Promise<{ quota_seconds_remaining: number; subscription_tier: string }> {
  const res = await fetch(`${API_BASE}/quota`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch quota");
  return res.json();
}

export async function fetchSnapToken(tierId: string, amount: number): Promise<string> {
  const res = await fetch(`${API_BASE}/payment/snap-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ tier_id: tierId, amount }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to generate payment token. Please try again.");
  }
  const data = await res.json();
  if (!data.snap_token) throw new Error("Invalid token received from server.");
  return data.snap_token;
}

export interface VerifyPaymentResponse {
  status: string;
  upgraded: boolean;
  message: string;
  subscription_tier: string;
  quota_seconds_remaining: number;
}

export async function verifyPayment(orderId: string): Promise<VerifyPaymentResponse> {
  const res = await fetch(`${API_BASE}/payment/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to verify payment");
  }
  return res.json();
}

export interface ReconcileResponse {
  subscription_tier: string;
  quota_seconds_remaining: number;
  checked: { order_id: string; status?: string; upgraded?: boolean; message?: string; error?: string }[];
}

export async function reconcilePayments(): Promise<ReconcileResponse> {
  const res = await fetch(`${API_BASE}/payment/reconcile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to reconcile payments");
  }
  return res.json();
}
