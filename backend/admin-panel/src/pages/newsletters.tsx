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
import { NewsletterConfigAlerts } from "@/components/newsletter-config-alerts";
import { STATUS_STYLES, type BacklogItem, type Edition, type NewsletterConfig, type UserType } from "@/lib/newsletters";
import {
  Mail,
  Users,
  ChefHat,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ListTodo,
  Settings2,
  ChevronDown,
  ChevronRight,
  Filter,
} from "lucide-react";

interface Automation {
  auto_schedule: boolean;
  cadence_days: number;
  send_time: string;
}

interface IndexData {
  editions: Edition[];
  backlog: Record<UserType, BacklogItem[]>;
  automation: Record<UserType, Automation>;
  unsubscribe_count: number;
  config: NewsletterConfig;
}

export default function NewslettersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<UserType>(2);

  const { data, isLoading } = useQuery<IndexData>({
    queryKey: ["newsletters"],
    queryFn: () => api.get("/newsletters").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (kind: "regular" | "special") =>
      api.post("/newsletters", { user_type: userType, kind }).then((r) => r.data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
      navigate(`/admin-new/newsletters/${res.edition.id}`);
    },
    onError: () => toast.error("Couldn't create the edition."),
  });

  const editions = (data?.editions ?? []).filter((e) => e.user_type === userType);
  const audience = userType === 1 ? "customer" : "chef";

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Mail className="h-6 w-6 text-[#fa4616]" />
        <h1 className="text-2xl font-bold">Newsletters</h1>
      </div>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Every scheduled edition is emailed to <strong>{data?.config.preview_email ?? "dayne@taist.app"}</strong>{" "}
        {data?.config.notice_label ?? "48 hours"} before it sends, with links to edit or pause it. If it
        looks good, do nothing and it sends on time. After a regular edition sends, the next one is
        drafted from the backlog below and scheduled automatically.
      </p>

      <NewsletterConfigAlerts config={data?.config} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border bg-card p-1">
          <Button
            variant={userType === 2 ? "default" : "ghost"}
            size="sm"
            onClick={() => setUserType(2)}
            className="gap-2"
          >
            <ChefHat className="h-4 w-4" />
            Chefs
          </Button>
          <Button
            variant={userType === 1 ? "default" : "ghost"}
            size="sm"
            onClick={() => setUserType(1)}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Customers
          </Button>
        </div>
        <Link
          to="/admin-new/newsletter-preview"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#fa4616]"
        >
          <Filter className="h-4 w-4" />
          Who receives it (audience filter)
        </Link>
        <span className="text-sm text-muted-foreground">
          {data?.unsubscribe_count ?? 0} unsubscribed
        </span>
      </div>

      {/* Editions */}
      <div className="mb-6 rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <h2 className="font-semibold capitalize">{audience} editions</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate("special")}
            >
              <Plus className="h-4 w-4" />
              Special (one-off)
            </Button>
            <Button
              size="sm"
              className="gap-1"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate("regular")}
            >
              <Plus className="h-4 w-4" />
              Regular edition
            </Button>
          </div>
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : editions.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No {audience} editions yet.</p>
        ) : (
          <ul className="divide-y">
            {editions.map((e) => (
              <li key={e.id}>
                <Link
                  to={`/admin-new/newsletters/${e.id}`}
                  className="flex flex-col gap-2 p-4 hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{e.display_name}</span>
                      <Badge className={STATUS_STYLES[e.status]}>{e.status}</Badge>
                      {e.created_by === "auto" && (
                        <Badge variant="outline" className="text-xs">auto-drafted</Badge>
                      )}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">{e.subject}</div>
                  </div>
                  <div className="text-sm sm:shrink-0 sm:text-right">
                    {e.status === "sent" ? (
                      <>
                        <div>Sent {e.sent_at_label}</div>
                        <div className="text-muted-foreground">
                          {e.sent_count}/{e.recipient_count} delivered
                        </div>
                      </>
                    ) : e.status === "scheduled" ? (
                      <>
                        <div>Sends {e.effective_send_at_label}</div>
                        <div className="text-muted-foreground">
                          {e.preview_sent_at_label
                            ? `Preview sent ${e.preview_sent_at_label}`
                            : `Preview ${e.preview_at_label ?? "soon"}`}
                        </div>
                      </>
                    ) : e.status === "draft" ? (
                      <div className="text-muted-foreground">
                        {e.send_at_label ? `Proposed ${e.send_at_label}` : "Not scheduled"}
                      </div>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <BacklogPanel
          key={`backlog-${userType}`}
          userType={userType}
          items={data?.backlog?.[userType] ?? []}
          maxItems={data?.config.max_items ?? 5}
        />
        {data && (
          <AutomationPanel
            key={`automation-${userType}-${JSON.stringify(data.automation[userType])}`}
            userType={userType}
            automation={data.automation[userType]}
          />
        )}
      </div>
    </div>
  );
}

function BacklogPanel({
  userType,
  items,
  maxItems,
}: {
  userType: UserType;
  items: BacklogItem[];
  maxItems: number;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [showUsed, setShowUsed] = useState(false);

  const available = items.filter((i) => !i.used_at);
  const used = items.filter((i) => i.used_at);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["newsletters"] });

  const add = useMutation({
    mutationFn: () => api.post("/newsletter-backlog", { user_type: userType, title, body }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      refresh();
    },
    onError: () => toast.error("Couldn't add the update."),
  });
  const save = useMutation({
    mutationFn: (id: number) => api.put(`/newsletter-backlog/${id}`, draft),
    onSuccess: () => {
      setEditing(null);
      refresh();
    },
    onError: () => toast.error("Couldn't save the update."),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/newsletter-backlog/${id}`),
    onSuccess: refresh,
    onError: () => toast.error("Couldn't delete the update."),
  });

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <ListTodo className="h-4 w-4" />
          Update backlog
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shipped features waiting to be announced. The next auto-drafted edition takes the top{" "}
          {maxItems}. Once an edition sends, its updates move to "used" so they never repeat.
        </p>
      </div>
      <ul className="divide-y">
        {available.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            Empty. The next auto-draft will wait for you to add updates.
          </li>
        )}
        {available.map((item, index) => (
          <li key={item.id} className="p-4">
            {editing === item.id ? (
              <div className="space-y-2">
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
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
                    index < maxItems ? "bg-[#fa4616] text-white" : "bg-muted text-muted-foreground"
                  }`}
                  title={index < maxItems ? "Goes in the next auto-draft" : "Waits for a later edition"}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-medium">{item.title}</div>
                  {item.body && <div className="text-muted-foreground">{item.body}</div>}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit update"
                  onClick={() => {
                    setEditing(item.id);
                    setDraft({ title: item.title, body: item.body ?? "" });
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete update"
                  onClick={() => {
                    if (confirm(`Delete "${item.title}" from the backlog?`)) remove.mutate(item.id);
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
        <Input
          placeholder="Headline, e.g. Payouts setup in one tap."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          placeholder="One or two sentences on what changed and why it helps."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button size="sm" className="gap-1" disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>
          <Plus className="h-4 w-4" /> Add to backlog
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
            Already featured ({used.length})
          </button>
          {showUsed && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {used.map((item) => (
                <li key={item.id}>
                  {item.title}{" "}
                  {item.used_in_edition_id && (
                    <Link className="text-[#fa4616]" to={`/admin-new/newsletters/${item.used_in_edition_id}`}>
                      (edition)
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

function AutomationPanel({ userType, automation }: { userType: UserType; automation: Automation }) {
  const queryClient = useQueryClient();
  // Keyed on the saved values by the parent, so a save remounts with fresh state.
  const [form, setForm] = useState<Automation>(automation);

  const dirty =
    form.auto_schedule !== automation.auto_schedule ||
    Number(form.cadence_days) !== automation.cadence_days ||
    form.send_time !== automation.send_time;

  const save = useMutation({
    mutationFn: () => api.put("/newsletter-automation", { user_type: userType, ...form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
      toast.success("Automation settings saved.");
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message ?? "Couldn't save automation settings.");
    },
  });

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
          Auto-draft and schedule the next regular edition after each send
          <span className="block text-xs text-muted-foreground">
            The first edition for an audience is always scheduled by hand.
          </span>
        </span>
      </label>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <label className="text-sm">
          Every (days)
          <Input
            type="number"
            min={3}
            max={90}
            value={form.cadence_days}
            onChange={(e) => setForm({ ...form, cadence_days: Number(e.target.value) })}
          />
        </label>
        <label className="text-sm">
          At (ET)
          <Input
            type="time"
            value={form.send_time}
            onChange={(e) => setForm({ ...form, send_time: e.target.value })}
          />
        </label>
      </div>
      <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
        Save
      </Button>
    </div>
  );
}
