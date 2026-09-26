import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BATCH_STATUS_LABELS,
  BATCH_STATUS_STYLES,
  type AdBacklogItem,
  type AdBatch,
  type AdSettings,
  type AdsConfig,
} from "@/lib/ads";
import {
  Megaphone,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Lightbulb,
  Settings2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

interface IndexData {
  batches: AdBatch[];
  backlog: AdBacklogItem[];
  settings: AdSettings;
  config: AdsConfig;
}

function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export default function AdsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<IndexData>({
    queryKey: ["ads"],
    queryFn: () => api.get("/ad-batches").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post("/ad-batches").then((r) => r.data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      navigate(`/admin-new/ads/${res.batch.id}`);
    },
    onError: (err) => toast.error(apiError(err, "Couldn't create the batch.")),
  });

  const batches = data?.batches ?? [];

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-[#fa4616]" />
        <h1 className="text-2xl font-bold">Ads</h1>
      </div>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Paid Instagram and Facebook ads for customers, in weekly batches. Every scheduled batch is
        emailed to <strong>{data?.config.preview_email ?? "dayne@taist.app"}</strong>{" "}
        {data?.config.notice_label ?? "48 hours"} before it goes live, with links to edit or pause
        it. If nothing is paused, it is approved at go-live and you get the copy to launch in Ads
        Manager. The next batch is then drafted from the idea backlog automatically.
      </p>

      {data && !data.config.automation_enabled && (
        <div className="mb-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Automation is off in this environment (ADS_AUTOMATION), so no previews or approvals go
            out. Test sends still work.
          </span>
        </div>
      )}

      <div className="mb-6 rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <h2 className="font-semibold">Batches</h2>
          <Button size="sm" className="gap-1" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
            <Plus className="h-4 w-4" />
            New batch
          </Button>
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : batches.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No batches yet. Create the first one from the backlog and schedule it; after it goes
            live, the next batches are drafted automatically.
          </p>
        ) : (
          <ul className="divide-y">
            {batches.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/admin-new/ads/${b.id}`}
                  className="flex flex-col gap-2 p-4 hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex shrink-0 -space-x-3">
                    {b.ads.slice(0, 3).map((ad) =>
                      ad.image_url ? (
                        <img
                          key={ad.id}
                          src={ad.image_url}
                          alt=""
                          className="h-12 w-12 rounded-md border-2 border-white object-cover"
                        />
                      ) : (
                        <div key={ad.id} className="h-12 w-12 rounded-md border-2 border-white bg-muted" />
                      ),
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{b.display_name}</span>
                      <Badge className={BATCH_STATUS_STYLES[b.status]}>{BATCH_STATUS_LABELS[b.status]}</Badge>
                      {b.created_by === "auto" && (
                        <Badge variant="outline" className="text-xs">auto-drafted</Badge>
                      )}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">
                      {b.ads.length} ad{b.ads.length === 1 ? "" : "s"}
                      {b.ads.length > 0 && `: ${b.ads.map((a) => a.headline || a.angle).join(" · ")}`}
                    </div>
                  </div>
                  <div className="text-sm sm:shrink-0 sm:text-right">
                    {b.status === "scheduled" ? (
                      <>
                        <div>Goes live {b.effective_go_live_at_label}</div>
                        <div className="text-muted-foreground">
                          {b.preview_sent_at_label
                            ? `Preview sent ${b.preview_sent_at_label}`
                            : `Preview ${b.preview_at_label ?? "soon"}`}
                        </div>
                      </>
                    ) : b.status === "ready" ? (
                      <div className="font-medium text-amber-700">Launch in Ads Manager</div>
                    ) : b.status === "live" ? (
                      <div className="text-muted-foreground">Runs until {b.ends_at_label}</div>
                    ) : b.status === "ended" ? (
                      <div className="text-muted-foreground">Ended</div>
                    ) : (
                      <div className="text-muted-foreground">
                        {b.go_live_at_label ? `Proposed ${b.go_live_at_label}` : "Not scheduled"}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <BacklogPanel
          items={data?.backlog ?? []}
          perBatch={data?.settings.ads_per_batch ?? 3}
          ctas={data?.config.ctas ?? {}}
        />
        {data && (
          <SettingsPanel key={JSON.stringify(data.settings)} settings={data.settings} />
        )}
      </div>
    </div>
  );
}

type IdeaForm = {
  angle: string;
  primary_text: string;
  headline: string;
  description: string;
  cta: string;
  image_url: string;
};

const EMPTY_IDEA: IdeaForm = {
  angle: "",
  primary_text: "",
  headline: "",
  description: "",
  cta: "LEARN_MORE",
  image_url: "",
};

function BacklogPanel({
  items,
  perBatch,
  ctas,
}: {
  items: AdBacklogItem[];
  perBatch: number;
  ctas: Record<string, string>;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<IdeaForm>(EMPTY_IDEA);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<IdeaForm>(EMPTY_IDEA);
  const [showUsed, setShowUsed] = useState(false);

  const available = items.filter((i) => !i.used_at);
  const used = items.filter((i) => i.used_at);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["ads"] });

  const add = useMutation({
    mutationFn: () => api.post("/ad-backlog", form),
    onSuccess: () => {
      setForm(EMPTY_IDEA);
      refresh();
    },
    onError: (err) => toast.error(apiError(err, "Couldn't add the idea.")),
  });
  const save = useMutation({
    mutationFn: (id: number) => api.put(`/ad-backlog/${id}`, draft),
    onSuccess: () => {
      setEditing(null);
      refresh();
    },
    onError: (err) => toast.error(apiError(err, "Couldn't save the idea.")),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/ad-backlog/${id}`),
    onSuccess: refresh,
    onError: () => toast.error("Couldn't delete the idea."),
  });

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Lightbulb className="h-4 w-4" />
          Ad ideas
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The next auto-drafted batch takes the top {perBatch}. Ideas without an image get an
          approved chef dish photo. Once a batch is approved, its ideas move to "used" so they
          never repeat.
        </p>
      </div>
      <ul className="divide-y">
        {available.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            Empty. The next auto-draft will wait for you to add ideas.
          </li>
        )}
        {available.map((item, index) => (
          <li key={item.id} className="p-4">
            {editing === item.id ? (
              <div className="space-y-2">
                <IdeaFields value={draft} onChange={setDraft} ctas={ctas} />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1" onClick={() => save.mutate(item.id)} disabled={save.isPending}>
                    <Check className="h-4 w-4" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEditing(null)}>
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    index < perBatch ? "bg-[#fa4616] text-white" : "bg-muted text-muted-foreground"
                  }`}
                  title={index < perBatch ? "Goes in the next auto-draft" : "Waits for a later batch"}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-medium">{item.angle}</div>
                  {item.headline && <div>{item.headline}</div>}
                  {item.primary_text && <div className="text-muted-foreground">{item.primary_text}</div>}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit idea"
                  onClick={() => {
                    setEditing(item.id);
                    setDraft({
                      angle: item.angle,
                      primary_text: item.primary_text ?? "",
                      headline: item.headline ?? "",
                      description: item.description ?? "",
                      cta: item.cta ?? "LEARN_MORE",
                      image_url: item.image_url ?? "",
                    });
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete idea"
                  onClick={() => {
                    if (confirm(`Delete "${item.angle}" from the ideas?`)) remove.mutate(item.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="space-y-2 border-t p-4">
        <IdeaFields value={form} onChange={setForm} ctas={ctas} />
        <Button size="sm" className="gap-1" disabled={!form.angle.trim() || add.isPending} onClick={() => add.mutate()}>
          <Plus className="h-4 w-4" /> Add idea
        </Button>
      </div>
      {used.length > 0 && (
        <div className="border-t p-4">
          <button
            type="button"
            onClick={() => setShowUsed((s) => !s)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {showUsed ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Already used ({used.length})
          </button>
          {showUsed && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {used.map((item) => (
                <li key={item.id}>
                  {item.angle}{" "}
                  {item.used_in_batch_id && (
                    <Link className="text-[#fa4616]" to={`/admin-new/ads/${item.used_in_batch_id}`}>
                      (batch)
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function IdeaFields({
  value,
  onChange,
  ctas,
}: {
  value: IdeaForm;
  onChange: (v: IdeaForm) => void;
  ctas: Record<string, string>;
}) {
  return (
    <>
      <Input
        placeholder="Idea name (internal), e.g. Meal prep for the week"
        value={value.angle}
        onChange={(e) => onChange({ ...value, angle: e.target.value })}
      />
      <Textarea
        rows={2}
        placeholder="Primary text: the caption above the image (about 125 characters)"
        value={value.primary_text}
        onChange={(e) => onChange({ ...value, primary_text: e.target.value })}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="Headline (under 40 characters)"
          value={value.headline}
          onChange={(e) => onChange({ ...value, headline: e.target.value })}
        />
        <Input
          placeholder="Description (optional)"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
        <select
          className="h-9 rounded-md border bg-transparent px-2 text-sm"
          value={value.cta}
          onChange={(e) => onChange({ ...value, cta: e.target.value })}
          aria-label="Button"
        >
          {Object.entries(ctas).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <Input
          placeholder="Image link (optional; leave empty to use a dish photo)"
          value={value.image_url}
          onChange={(e) => onChange({ ...value, image_url: e.target.value })}
        />
      </div>
    </>
  );
}

function SettingsPanel({ settings }: { settings: AdSettings }) {
  const queryClient = useQueryClient();
  // Keyed on the saved values by the parent, so a save remounts with fresh state.
  const [form, setForm] = useState<AdSettings>(settings);
  const dirty = JSON.stringify(form) !== JSON.stringify(settings);

  const save = useMutation({
    mutationFn: () => api.put("/ad-settings", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      toast.success("Settings saved.");
    },
    onError: (err) => toast.error(apiError(err, "Couldn't save settings.")),
  });

  const number = (key: keyof AdSettings, label: string, min: number, max: number) => (
    <label className="text-sm">
      {label}
      <Input
        type="number"
        min={min}
        max={max}
        value={form[key] as number}
        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
      />
    </label>
  );

  return (
    <div className="h-fit rounded-lg border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <Settings2 className="h-4 w-4" />
        Automation
      </h2>
      <label className="mb-3 flex items-start gap-2 text-sm">
        <Checkbox
          checked={form.auto_schedule}
          onCheckedChange={(v) => setForm({ ...form, auto_schedule: v === true })}
          className="mt-0.5"
        />
        <span>
          Auto-draft and schedule the next batch after each one is approved
          <span className="block text-xs text-muted-foreground">The first batch is always scheduled by hand.</span>
        </span>
      </label>
      <div className="mb-3 grid grid-cols-2 gap-3">
        {number("cadence_days", "New batch every (days)", 3, 60)}
        {number("ads_per_batch", "Ads per batch", 1, 5)}
        {number("run_days", "Each batch runs (days)", 3, 90)}
        <label className="text-sm">
          Goes live at (ET)
          <Input
            type="time"
            value={form.go_live_time}
            onChange={(e) => setForm({ ...form, go_live_time: e.target.value })}
          />
        </label>
      </div>
      <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
        Save
      </Button>
    </div>
  );
}
