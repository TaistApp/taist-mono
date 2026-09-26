import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  BATCH_STATUS_LABELS,
  BATCH_STATUS_STYLES,
  type Ad,
  type AdBacklogItem,
  type AdBatch,
  type AdContent,
  type AdsConfig,
} from "@/lib/ads";
import { AdMockup } from "@/components/ad-mockup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  CalendarX,
  Camera,
  CircleStop,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";

interface ShowData {
  batch: AdBatch;
  warnings: string[];
  config: AdsConfig;
}

type FormAd = AdContent & { id?: number };
type FormState = { go_live_at_et: string; notes: string; ads: FormAd[] };

function toForm(b: AdBatch): FormState {
  return {
    go_live_at_et: b.go_live_at_et ?? "",
    notes: b.notes ?? "",
    ads: b.ads.map((a) => ({
      angle: a.angle ?? "",
      primary_text: a.primary_text ?? "",
      headline: a.headline ?? "",
      description: a.description ?? "",
      cta: a.cta,
      link_url: a.link_url ?? "",
      image_url: a.image_url ?? "",
      dish_photo_id: a.dish_photo_id,
      backlog_id: a.backlog_id,
      source_ig_media_id: a.source_ig_media_id,
      source_permalink: a.source_permalink,
      id: a.id,
    })),
  };
}

function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export default function AdBatchEditPage() {
  const { id } = useParams();

  const { data, isLoading } = useQuery<ShowData>({
    queryKey: ["ad-batch", id],
    queryFn: () => api.get(`/ad-batches/${id}`).then((r) => r.data),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  // Remount on every saved change so the form starts from the stored batch.
  return <BatchEditor key={`${data.batch.id}-${data.batch.updated_at}-${data.batch.status}`} data={data} />;
}

function BatchEditor({ data }: { data: ShowData }) {
  const batch = data.batch;
  const id = batch.id;
  const config = data.config;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(batch));
  const savedForm = useMemo(() => JSON.stringify(toForm(batch)), [batch]);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState(config.preview_email);

  const { data: index } = useQuery<{ backlog: AdBacklogItem[] }>({
    queryKey: ["ads"],
    queryFn: () => api.get("/ad-batches").then((r) => r.data),
  });

  const editable = batch.status === "draft" || batch.status === "scheduled";
  const dirty = JSON.stringify(form) !== savedForm;

  // Live content checks for unsaved edits (debounced).
  const [warnings, setWarnings] = useState<string[]>(data.warnings);
  const lintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adsPayload = useMemo(() => JSON.stringify(form.ads), [form.ads]);
  useEffect(() => {
    if (lintTimer.current) clearTimeout(lintTimer.current);
    lintTimer.current = setTimeout(() => {
      api
        .post("/ad-batches/lint", { ads: JSON.parse(adsPayload) })
        .then((r) => setWarnings(r.data.warnings))
        .catch(() => undefined);
    }, 500);
    return () => {
      if (lintTimer.current) clearTimeout(lintTimer.current);
    };
  }, [adsPayload]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ad-batch", String(id)] });
    queryClient.invalidateQueries({ queryKey: ["ads"] });
  };
  const onError = (fallback: string) => (err: unknown) => toast.error(apiError(err, fallback));

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/ad-batches/${id}`, form).then((r) => r.data),
    onSuccess: () => {
      toast.success("Saved.");
      invalidate();
    },
    onError: onError("Couldn't save."),
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/ad-batches/${id}`, form);
      return api.post(`/ad-batches/${id}/schedule`, { go_live_at_et: form.go_live_at_et }).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success(`Scheduled. The ads are created in Meta and previewed ${config.notice_label} before go-live.`);
      invalidate();
    },
    onError: onError("Couldn't schedule."),
  });

  const unscheduleMutation = useMutation({
    mutationFn: () => api.post(`/ad-batches/${id}/unschedule`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Unscheduled. It's a draft again.");
      invalidate();
    },
    onError: onError("Couldn't unschedule."),
  });

  const endMutation = useMutation({
    mutationFn: () => api.post(`/ad-batches/${id}/end`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Stopped. Its ads are paused in Meta.");
      invalidate();
    },
    onError: onError("Couldn't stop the batch."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/ad-batches/${id}`),
    onSuccess: () => {
      toast.success("Deleted.");
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      navigate("/admin-new/ads");
    },
    onError: onError("Couldn't delete."),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (dirty && editable) await api.put(`/ad-batches/${id}`, form);
      return api.post(`/ad-batches/${id}/test`, { email: testEmail });
    },
    onSuccess: () => {
      toast.success(`Test sent to ${testEmail}.`);
      setTestOpen(false);
      if (dirty) invalidate();
    },
    onError: onError("Test send failed."),
  });

  const photoMutation = useMutation({
    mutationFn: (index: number) => {
      const exclude = form.ads.map((a) => a.dish_photo_id).filter(Boolean).join(",");
      return api.get("/ad-dish-photo", { params: { exclude } }).then((r) => ({ index, photo: r.data.photo }));
    },
    onSuccess: ({ index, photo }) => setAd(index, { image_url: photo.url, dish_photo_id: photo.id }),
    onError: onError("No dish photo available."),
  });

  const setAd = (index: number, patch: Partial<AdContent>) =>
    setForm((f) => ({ ...f, ads: f.ads.map((a, i) => (i === index ? { ...a, ...patch } : a)) }));
  const moveAd = (index: number, delta: number) => {
    const ads = [...form.ads];
    const target = index + delta;
    if (target < 0 || target >= ads.length) return;
    [ads[index], ads[target]] = [ads[target], ads[index]];
    setForm({ ...form, ads });
  };
  const addAd = (ad?: Partial<AdContent>) =>
    setForm((f) => ({
      ...f,
      ads: [
        ...f.ads,
        {
          angle: "",
          primary_text: "",
          headline: "",
          description: "",
          cta: "LEARN_MORE",
          link_url: config.default_link_url,
          image_url: "",
          dish_photo_id: null,
          backlog_id: null,
          source_ig_media_id: null,
          source_permalink: null,
          ...ad,
        },
      ],
    }));

  const usedBacklogIds = new Set(form.ads.map((a) => a.backlog_id).filter(Boolean));
  const backlogOptions = (index?.backlog ?? []).filter((b) => !b.used_at && !usedBacklogIds.has(b.id));

  return (
    <div>
      <Link to="/admin-new/ads" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Ads
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{batch.display_name}</h1>
        <Badge className={BATCH_STATUS_STYLES[batch.status]}>{BATCH_STATUS_LABELS[batch.status]}</Badge>
      </div>

      {batch.status === "scheduled" && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Goes live <strong>{batch.effective_go_live_at_label}</strong>.{" "}
          {batch.preview_sent_at_label
            ? `Preview emailed ${batch.preview_sent_at_label}.`
            : `Preview goes to ${config.preview_email} ${batch.preview_at_label}.`}{" "}
          Edits you save here are what gets approved; no need to reschedule.
        </div>
      )}
      {batch.status === "live" && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <span className="flex-1">
            Live on Instagram and Facebook since {batch.launched_at_label}. Its ads switch off
            automatically on {batch.ends_at_label}.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => {
              if (confirm(`Stop ${batch.display_name} now? Its ads are paused in Meta.`)) endMutation.mutate();
            }}
          >
            <CircleStop className="h-4 w-4" /> Stop now
          </Button>
        </div>
      )}
      {!config.meta_connected && (
        <div className="mb-4 flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Meta is not connected, so this batch can't go live. Set in Railway:{" "}
            {config.meta_missing.join(", ")}.
          </span>
        </div>
      )}
      {batch.status === "draft" && batch.notes && (
        <div className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm">{batch.notes}</div>
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

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        {editable && (
          <>
            <div>
              <Label htmlFor="go_live" className="mb-1 block text-xs">
                Goes live at (Eastern)
              </Label>
              <Input
                id="go_live"
                type="datetime-local"
                value={form.go_live_at_et}
                min={config.earliest_go_live_at_et}
                onChange={(e) => setForm({ ...form, go_live_at_et: e.target.value })}
                className="w-[220px]"
              />
            </div>
            <Button className="gap-1" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
            {batch.status === "draft" ? (
              <Button
                variant="outline"
                className="gap-1"
                disabled={!form.go_live_at_et || form.ads.length === 0 || scheduleMutation.isPending}
                onClick={() => scheduleMutation.mutate()}
              >
                <CalendarClock className="h-4 w-4" />
                Save & schedule
              </Button>
            ) : (
              <Button variant="outline" className="gap-1" disabled={unscheduleMutation.isPending} onClick={() => unscheduleMutation.mutate()}>
                <CalendarX className="h-4 w-4" />
                Unschedule
              </Button>
            )}
          </>
        )}
        <Button variant="outline" className="gap-1" onClick={() => setTestOpen(true)}>
          <Send className="h-4 w-4" />
          Email me a preview
        </Button>
        {batch.status === "draft" && (
          <Button
            variant="ghost"
            className="gap-1 text-red-600 hover:text-red-700"
            onClick={() => {
              if (confirm(`Delete ${batch.display_name}? This can't be undone.`)) deleteMutation.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
        {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
      </div>

      <div className="space-y-6">
        {form.ads.map((ad, i) => (
          <div key={i} className="grid gap-4 rounded-lg border bg-card p-4 xl:grid-cols-[1fr_380px]">
            <fieldset disabled={!editable} className="space-y-3">
              {ad.source_ig_media_id && (
                <p className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
                  Recycled organic post, promoted as-is with its likes and comments. Only the button
                  and link can change.{" "}
                  {ad.source_permalink && (
                    <a href={ad.source_permalink} target="_blank" rel="noreferrer" className="text-[#fa4616]">
                      View on Instagram
                    </a>
                  )}
                </p>
              )}
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fa4616] text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <Input
                  placeholder="Idea name (internal)"
                  value={ad.angle ?? ""}
                  onChange={(e) => setAd(i, { angle: e.target.value })}
                />
                {editable && (
                  <div className="flex">
                    <Button size="icon" variant="ghost" aria-label="Move up" onClick={() => moveAd(i, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Move down" onClick={() => moveAd(i, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove ad"
                      onClick={() => setForm({ ...form, ads: form.ads.filter((_, j) => j !== i) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <Field label="Primary text" count={ad.primary_text?.length ?? 0} limit={config.limits.primary_text}>
                <Textarea rows={3} readOnly={!!ad.source_ig_media_id} value={ad.primary_text ?? ""} onChange={(e) => setAd(i, { primary_text: e.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Headline" count={ad.headline?.length ?? 0} limit={config.limits.headline}>
                  <Input readOnly={!!ad.source_ig_media_id} value={ad.headline ?? ""} onChange={(e) => setAd(i, { headline: e.target.value })} />
                </Field>
                <Field label="Description" count={ad.description?.length ?? 0} limit={config.limits.description}>
                  <Input readOnly={!!ad.source_ig_media_id} value={ad.description ?? ""} onChange={(e) => setAd(i, { description: e.target.value })} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <Field label="Button">
                  <select
                    className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                    value={ad.cta}
                    onChange={(e) => setAd(i, { cta: e.target.value })}
                  >
                    {Object.entries(config.ctas).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Link">
                  <Input value={ad.link_url ?? ""} onChange={(e) => setAd(i, { link_url: e.target.value })} />
                </Field>
              </div>
              <Field label="Image link" hint="Square (1:1) or 4:5 works best in the feed.">
                <div className="flex gap-2">
                  <Input
                    readOnly={!!ad.source_ig_media_id}
                    value={ad.image_url ?? ""}
                    onChange={(e) => setAd(i, { image_url: e.target.value, dish_photo_id: null })}
                  />
                  {editable && !ad.source_ig_media_id && (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 gap-1"
                      disabled={photoMutation.isPending}
                      onClick={() => photoMutation.mutate(i)}
                    >
                      <Camera className="h-4 w-4" />
                      Dish photo
                    </Button>
                  )}
                </div>
              </Field>
              <MetaStatus ad={batch.ads.find((a) => a.id === ad.id)} />
            </fieldset>
            <AdMockup ad={ad} ctaLabel={config.ctas[ad.cta] ?? "Learn more"} />
          </div>
        ))}

        {editable && form.ads.length < config.max_ads && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => addAd()}>
              <Plus className="h-4 w-4" /> Add ad
            </Button>
            {backlogOptions.length > 0 && (
              <select
                className="h-8 rounded-md border bg-transparent px-2 text-sm"
                value=""
                onChange={(e) => {
                  const b = backlogOptions.find((o) => o.id === Number(e.target.value));
                  if (b) {
                    addAd({
                      angle: b.angle,
                      primary_text: b.primary_text ?? "",
                      headline: b.headline ?? "",
                      description: b.description ?? "",
                      cta: b.cta ?? "LEARN_MORE",
                      link_url: b.link_url ?? config.default_link_url,
                      image_url: b.image_url ?? "",
                      backlog_id: b.id,
                    });
                  }
                }}
                aria-label="Add from ideas"
              >
                <option value="">+ Add from ideas…</option>
                {backlogOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.angle}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <fieldset disabled={!editable}>
          <Field label="Internal notes" hint="Never shown in the ads.">
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </fieldset>
      </div>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email a preview</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sends the batch as the preview email shows it, with a "Test send" banner.{" "}
            {dirty && editable && "Your unsaved changes are saved first."}
          </p>
          <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTestOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!testEmail || testMutation.isPending} onClick={() => testMutation.mutate()}>
              {testMutation.isPending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

const META_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-gray-100 text-gray-700",
  PENDING_REVIEW: "bg-blue-100 text-blue-700",
  IN_PROCESS: "bg-blue-100 text-blue-700",
  DISAPPROVED: "bg-red-100 text-red-700",
  WITH_ISSUES: "bg-amber-100 text-amber-800",
};

function MetaStatus({ ad }: { ad?: Ad }) {
  if (!ad || (!ad.meta_ad_id && !ad.meta_note)) {
    return <p className="text-xs text-muted-foreground">Not in Meta yet. It's created there when the preview goes out.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {ad.meta_status && (
        <Badge className={META_STATUS_STYLES[ad.meta_status] ?? "bg-gray-100 text-gray-700"}>
          Meta: {ad.meta_status.toLowerCase().replace(/_/g, " ")}
        </Badge>
      )}
      {ad.meta_ad_id && <span>Ad ID {ad.meta_ad_id}</span>}
      {ad.meta_note && <span className="text-amber-700">{ad.meta_note}</span>}
    </div>
  );
}

function Field({
  label,
  hint,
  count,
  limit,
  children,
}: {
  label: string;
  hint?: string;
  count?: number;
  limit?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <Label className="text-sm">{label}</Label>
        {limit !== undefined && (
          <span className={`text-xs ${count! > limit ? "text-amber-600" : "text-muted-foreground"}`}>
            {count}/{limit}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
