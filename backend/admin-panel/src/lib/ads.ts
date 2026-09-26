export interface AdContent {
  angle: string | null;
  primary_text: string | null;
  headline: string | null;
  description: string | null;
  cta: string;
  link_url: string | null;
  image_url: string | null;
  dish_photo_id: number | null;
  backlog_id: number | null;
}

export interface Ad extends AdContent {
  id: number;
  batch_id: number;
  sort: number;
  cta_label: string;
  meta_ad_id: string | null;
}

export type BatchStatus = "draft" | "scheduled" | "ready" | "live" | "ended" | "cancelled";

export interface AdBatch {
  id: number;
  batch_number: number | null;
  status: BatchStatus;
  created_by: string;
  notes: string | null;
  ads: Ad[];
  display_name: string;
  go_live_at_et: string | null;
  go_live_at_label: string | null;
  effective_go_live_at_label: string | null;
  preview_at_label: string | null;
  preview_sent_at_label: string | null;
  launched_at_label: string | null;
  ends_at_label: string | null;
  updated_at: string;
}

export interface AdBacklogItem {
  id: number;
  angle: string;
  primary_text: string | null;
  headline: string | null;
  description: string | null;
  cta: string | null;
  link_url: string | null;
  image_url: string | null;
  sort: number;
  used_in_batch_id: number | null;
  used_at: string | null;
}

export interface AdSettings {
  auto_schedule: boolean;
  cadence_days: number;
  ads_per_batch: number;
  go_live_time: string;
  run_days: number;
}

export interface AdsConfig {
  notice_hours: number;
  notice_label: string;
  preview_email: string;
  automation_enabled: boolean;
  earliest_go_live_at_et: string;
  max_ads: number;
  ctas: Record<string, string>;
  limits: { primary_text: number; headline: number; description: number };
  default_link_url: string;
}

export const BATCH_STATUS_STYLES: Record<BatchStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  ready: "bg-amber-100 text-amber-800",
  live: "bg-green-100 text-green-700",
  ended: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  draft: "draft",
  scheduled: "scheduled",
  ready: "ready to launch",
  live: "live",
  ended: "ended",
  cancelled: "cancelled",
};
