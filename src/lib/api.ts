import { SourceVideo, ProcessURLResponse, Clip } from "./types";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function processURL(youtube_url: string): Promise<ProcessURLResponse> {
  const res = await fetch(`${API_BASE}/process-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ youtube_url }),
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
