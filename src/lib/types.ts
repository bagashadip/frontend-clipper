export interface Subtitle {
  id: string;
  clip_id: string;
  word: string;
  start_timestamp: number;
  end_timestamp: number;
  sequence_index: number;
}

export interface Clip {
  id: string;
  video_id: string;
  storage_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  start_time: number;
  end_time: number;
  virality_score: number | null;
  reasoning: string | null;
  caption_style: "classic" | "hormozi" | "hormozi_dynamic" | "impact_pop" | "typewriter" | "none";
  quality: "480p" | "720p" | "1080p";
  export_format: "9:16" | "16:9";
  crop_x_percent: number;
  status: "pending" | "rendering" | "completed" | "failed";
  created_at: string;
  subtitles: Subtitle[];
}

export interface SourceVideo {
  id: string;
  user_id: string;
  youtube_url: string;
  youtube_id: string;
  title: string | null;
  duration_seconds: number | null;
  max_source_height: number | null;
  status:
    | "pending"
    | "downloading"
    | "transcribing"
    | "analyzing"
    | "rendering"
    | "completed"
    | "failed";
  error_message: string | null;
  created_at: string;
  clips: Clip[];
}

export interface ProcessURLResponse {
  video_id: string;
  status: string;
  message: string;
}
