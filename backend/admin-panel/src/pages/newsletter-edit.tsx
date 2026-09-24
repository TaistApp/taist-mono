import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  STATUS_STYLES,
  type BacklogItem,
  type Edition,
  type EditionItem,
  type NewsletterConfig,
} from "@/lib/newsletters";
import { NewsletterConfigAlerts } from "@/components/newsletter-config-alerts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  CalendarX,
  AlertTriangle,
  Plus,
  Save,
  Send,
  Trash2,
  ListPlus,
} from "lucide-react";

type FormState = Pick<
  Edition,
  | "subject"
  | "preheader"
  | "eyebrow"
  | "headline"
  | "intro"
  | "callout_title"
  | "callout_subtitle"
  | "items_heading"
  | "items"
  | "closing"
  | "signoff"
  | "cta_label"
  | "cta_url"
  | "notes"
> & { send_at_et: string };

interface ShowData {
  edition: Edition;
  warnings: string[];
  recipient_count: number;
  config: NewsletterConfig;
}

interface RenderData {
  subject: string;
  html: string;
  sample: { first_name: string } | null;
  warnings: string[];
}

function toForm(e: Edition): FormState {
  return {
    subject: e.subject ?? "",
    preheader: e.preheader ?? "",
    eyebrow: e.eyebrow ?? "",
    headline: e.headline ?? "",
    intro: e.intro ?? "",
    callout_title: e.callout_title ?? "",
    callout_subtitle: e.callout_subtitle ?? "",
    items_heading: e.items_heading ?? "",
    items: (e.items ?? []).map((i) => ({ ...i, body: i.body ?? "" })),
    closing: e.closing ?? "",
    signoff: e.signoff ?? "",
    cta_label: e.cta_label ?? "",
    cta_url: e.cta_url ?? "",
    notes: e.notes ?? "",
    send_at_et: e.send_at_et ?? "",
  };
}

function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export default function NewsletterEditPage() {
  const { id } = useParams();

  const { data, isLoading } = useQuery<ShowData>({
    queryKey: ["newsletter", id],
    queryFn: () => api.get(`/newsletters/${id}`).then((r) => r.data),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  // Remount on every saved change so the form starts from the stored edition.
  return <EditionEditor key={`${data.edition.id}-${data.edition.updated_at}`} data={data} />;
}

function EditionEditor({ data }: { data: ShowData }) {
  const edition = data.edition;
  const id = edition.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(edition));
  const savedForm = useMemo(() => JSON.stringify(toForm(edition)), [edition]);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState(data.config.preview_email);

  const { data: index } = useQuery<{ backlog: Record<number, BacklogItem[]> }>({
    queryKey: ["newsletters"],
    queryFn: () => api.get("/newsletters").then((r) => r.data),
  });

  const editable = edition.status === "draft" || edition.status === "scheduled";
  const dirty = JSON.stringify(form) !== savedForm;
  const maxItems = data.config.max_items;

  // Live preview: re-render (debounced) from unsaved form content.
  const [preview, setPreview] = useState<RenderData | null>(null);
  const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderPayload = useMemo(() => JSON.stringify(form), [form]);
  useEffect(() => {
    if (renderTimer.current) clearTimeout(renderTimer.current);
    renderTimer.current = setTimeout(() => {
      const { send_at_et: _ignored, ...content } = JSON.parse(renderPayload) as FormState;
      void _ignored;
      api
        .post("/newsletters/render", { id, ...content })
        .then((r) => setPreview(r.data))
        .catch(() => undefined);
    }, 500);
    return () => {
      if (renderTimer.current) clearTimeout(renderTimer.current);
    };
  }, [renderPayload, id]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["newsletter", String(id)] });
    queryClient.invalidateQueries({ queryKey: ["newsletters"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/newsletters/${id}`, form).then((r) => r.data),
    onSuccess: () => {
      toast.success("Saved.");
      invalidate();
    },
    onError: (err) => toast.error(apiError(err, "Couldn't save.")),
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/newsletters/${id}`, form);
      return api.post(`/newsletters/${id}/schedule`, { send_at_et: form.send_at_et }).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success("Scheduled. The preview email goes out 48 hours before it sends.");
      invalidate();
    },
    onError: (err) => toast.error(apiError(err, "Couldn't schedule.")),
  });

  const unscheduleMutation = useMutation({
    mutationFn: () => api.post(`/newsletters/${id}/unschedule`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Unscheduled. It's a draft again.");
      invalidate();
    },
    onError: (err) => toast.error(apiError(err, "Couldn't unschedule.")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/newsletters/${id}`),
    onSuccess: () => {
      toast.success("Deleted.");
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
      navigate("/admin-new/newsletters");
    },
    onError: (err) => toast.error(apiError(err, "Couldn't delete.")),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (dirty) await api.put(`/newsletters/${id}`, form);
      return api.post(`/newsletters/${id}/test`, { email: testEmail });
    },
    onSuccess: () => {
      toast.success(`Test sent to ${testEmail}.`);
      setTestOpen(false);
      if (dirty) invalidate();
    },
    onError: (err) => toast.error(apiError(err, "Test send failed.")),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setItem = (index: number, patch: Partial<EditionItem>) =>
    set(
      "items",
      form.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  const moveItem = (index: number, delta: number) => {
    const items = [...form.items];
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    set("items", items);
  };

  const usedBacklogIds = new Set(form.items.map((i) => i.backlog_id).filter(Boolean));
  const backlogOptions = (index?.backlog?.[edition.user_type] ?? []).filter(
    (b) => !b.used_at && !usedBacklogIds.has(b.id),
  );
  const warnings = preview?.warnings ?? data.warnings;
  const audience = edition.user_type === 2 ? "chefs" : "customers";

  return (
    <div>
      <Link
        to="/admin-new/newsletters"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Newsletters
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{edition.display_name}</h1>
        <Badge className={STATUS_STYLES[edition.status]}>{edition.status}</Badge>
        <span className="text-sm text-muted-foreground">
          {edition.status === "sent"
            ? `Sent ${edition.sent_at_label} · ${edition.sent_count}/${edition.recipient_count} delivered${
                edition.failed_count ? ` · ${edition.failed_count} failed` : ""
              }`
            : `${data.recipient_count} ${audience} would receive it`}
        </span>
      </div>

      <NewsletterConfigAlerts config={data.config} />

      {edition.status === "scheduled" && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Sends <strong>{edition.effective_send_at_label}</strong>.{" "}
          {edition.preview_sent_at_label
            ? `Preview emailed ${edition.preview_sent_at_label}.`
            : `Preview goes to ${data.config.preview_email} ${edition.preview_at_label}.`}{" "}
          Edits you save here go out as-is; no need to reschedule.
        </div>
      )}
      {edition.status === "draft" && edition.notes && (
        <div className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm">{edition.notes}</div>
      )}

      {warnings.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {warnings.map((w) => (
            <div key={w} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {editable && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
          <div>
            <Label htmlFor="send_at" className="mb-1 block text-xs">
              Send at (Eastern)
            </Label>
            <Input
              id="send_at"
              type="datetime-local"
              value={form.send_at_et}
              min={data.config.earliest_send_at_et}
              onChange={(e) => set("send_at_et", e.target.value)}
              className="w-[220px]"
            />
          </div>
          <Button className="gap-1" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
          {edition.status === "draft" ? (
            <Button
              variant="outline"
              className="gap-1"
              disabled={!form.send_at_et || scheduleMutation.isPending}
              onClick={() => scheduleMutation.mutate()}
            >
              <CalendarClock className="h-4 w-4" />
              Save & schedule
            </Button>
          ) : (
            <Button
              variant="outline"
              className="gap-1"
              disabled={unscheduleMutation.isPending}
              onClick={() => unscheduleMutation.mutate()}
            >
              <CalendarX className="h-4 w-4" />
              Unschedule
            </Button>
          )}
          <Button variant="outline" className="gap-1" onClick={() => setTestOpen(true)}>
            <Send className="h-4 w-4" />
            Send test
          </Button>
          {edition.status === "draft" && (
            <Button
              variant="ghost"
              className="gap-1 text-red-600 hover:text-red-700"
              onClick={() => {
                if (confirm(`Delete ${edition.display_name}? This can't be undone.`)) deleteMutation.mutate();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Form */}
        <fieldset disabled={!editable} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Type <code>{"{first_name}"}</code> anywhere to insert each reader's first name. Leave a
            blank line between paragraphs.
          </p>
          <Field label="Subject line">
            <Input value={form.subject} onChange={(e) => set("subject", e.target.value)} />
          </Field>
          <Field label="Inbox preview text" hint="The grey line shown after the subject in most inboxes.">
            <Input value={form.preheader ?? ""} onChange={(e) => set("preheader", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <Field label="Eyebrow">
              <Input value={form.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} />
            </Field>
            <Field label="Headline">
              <Input value={form.headline ?? ""} onChange={(e) => set("headline", e.target.value)} />
            </Field>
          </div>
          <Field label="Intro">
            <Textarea rows={5} value={form.intro ?? ""} onChange={(e) => set("intro", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Highlight box title" hint="Optional orange-outlined box.">
              <Input value={form.callout_title ?? ""} onChange={(e) => set("callout_title", e.target.value)} />
            </Field>
            <Field label="Highlight box subtitle">
              <Input value={form.callout_subtitle ?? ""} onChange={(e) => set("callout_subtitle", e.target.value)} />
            </Field>
          </div>
          <Field label="Heading above the list" hint="Optional, e.g. Getting your first meal is easy:">
            <Input value={form.items_heading ?? ""} onChange={(e) => set("items_heading", e.target.value)} />
          </Field>

          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                Numbered updates ({form.items.length}/{maxItems})
              </span>
            </div>
            <div className="space-y-3">
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fa4616] text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <div className="flex-1 space-y-1">
                    <Input
                      placeholder="Bold lead-in"
                      value={item.title}
                      onChange={(e) => setItem(i, { title: e.target.value })}
                    />
                    <Textarea
                      rows={2}
                      placeholder="One or two sentences"
                      value={item.body}
                      onChange={(e) => setItem(i, { body: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col">
                    <Button size="icon" variant="ghost" aria-label="Move up" onClick={() => moveItem(i, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Move down" onClick={() => moveItem(i, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove"
                      onClick={() => set("items", form.items.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {editable && form.items.length < maxItems && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => set("items", [...form.items, { title: "", body: "" }])}
                >
                  <Plus className="h-4 w-4" /> Add update
                </Button>
                {backlogOptions.length > 0 && (
                  <select
                    className="h-8 rounded-md border bg-transparent px-2 text-sm"
                    value=""
                    onChange={(e) => {
                      const b = backlogOptions.find((o) => o.id === Number(e.target.value));
                      if (b) {
                        set("items", [...form.items, { title: b.title, body: b.body ?? "", backlog_id: b.id }]);
                      }
                    }}
                    aria-label="Add from backlog"
                  >
                    <option value="">+ Add from backlog…</option>
                    {backlogOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                )}
                {backlogOptions.length === 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ListPlus className="h-3.5 w-3.5" /> Backlog is empty
                  </span>
                )}
              </div>
            )}
          </div>

          <Field label="Closing">
            <Textarea rows={4} value={form.closing ?? ""} onChange={(e) => set("closing", e.target.value)} />
          </Field>
          <Field label="Sign-off">
            <Input value={form.signoff ?? ""} onChange={(e) => set("signoff", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <Field label="Button label">
              <Input value={form.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} />
            </Field>
            <Field label="Button link" hint="The App Store link also adds a Google Play line.">
              <Input value={form.cta_url ?? ""} onChange={(e) => set("cta_url", e.target.value)} />
            </Field>
          </div>
          <Field label="Internal notes" hint="Never sent.">
            <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </fieldset>

        {/* Preview */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="mb-2 rounded-lg border bg-card p-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</div>
            <div className="font-medium">{preview?.subject ?? form.subject}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Previewing as {preview?.sample?.first_name ?? "a sample recipient"}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border bg-white">
            <iframe
              title="Newsletter preview"
              srcDoc={preview?.html ?? ""}
              className="h-[1100px] w-full border-0 bg-white"
            />
          </div>
        </div>
      </div>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a test</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sends one copy, rendered for a real {edition.user_type === 2 ? "chef" : "customer"}, with a
            "Test send" banner on top. {dirty && "Your unsaved changes are saved first."}
          </p>
          <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTestOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!testEmail || testMutation.isPending} onClick={() => testMutation.mutate()}>
              {testMutation.isPending ? "Sending…" : "Send test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-sm">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
