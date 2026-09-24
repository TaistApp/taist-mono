export type UserType = 1 | 2;

export interface EditionItem {
  title: string;
  body: string;
  backlog_id?: number;
}

export interface Edition {
  id: number;
  user_type: UserType;
  kind: "regular" | "special";
  edition_number: number | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  subject: string;
  preheader: string | null;
  eyebrow: string | null;
  headline: string | null;
  intro: string | null;
  callout_title: string | null;
  callout_subtitle: string | null;
  items_heading: string | null;
  items: EditionItem[];
  closing: string | null;
  signoff: string | null;
  cta_label: string | null;
  cta_url: string | null;
  notes: string | null;
  created_by: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  display_name: string;
  send_at_et: string | null;
  send_at_label: string | null;
  effective_send_at_label: string | null;
  preview_at_label: string | null;
  preview_sent_at_label: string | null;
  sent_at_label: string | null;
  updated_at: string;
}

export interface BacklogItem {
  id: number;
  user_type: UserType;
  title: string;
  body: string | null;
  sort: number;
  used_in_edition_id: number | null;
  used_at: string | null;
}

export interface NewsletterConfig {
  notice_hours: number;
  preview_email: string;
  autosend_enabled: boolean;
  mailing_address: string;
  mailing_address_configured: boolean;
  earliest_send_at_et: string;
  max_items: number;
}

export const STATUS_STYLES: Record<Edition["status"], string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-800",
  sent: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
