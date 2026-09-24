import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Users, ChefHat, Filter, Save, ChevronRight, ChevronDown } from "lucide-react";

/**
 * Newsletter audience — who each newsletter goes to. The filter saved here is
 * read by newsletter:run at send time (and by the legacy Make.com scenarios).
 * Editions themselves are written and previewed on the Newsletters page.
 */

interface Recipient {
  first_name: string;
  last_initial: string;
  source: string;
}

interface PreviewData {
  count: number;
  total: number;
  filter_mode: string;
  sample: { first_name: string; email: string } | null;
  recipients: Recipient[];
}

interface SettingsData {
  settings: { user_type: number; filter_mode: string }[];
}

type UserType = 1 | 2;

// Human labels + helper text for each filter mode, per audience. The order
// here is the order shown in the dropdown.
const MODE_OPTIONS: Record<UserType, { value: string; label: string; hint: string }[]> = {
  1: [
    {
      value: "service_area",
      label: "Service-area zips only",
      hint: "Only customers whose zip is in your Service Areas list.",
    },
    {
      value: "all",
      label: "All customers",
      hint: "Every waitlist signup and app customer, regardless of zip.",
    },
  ],
  2: [
    {
      value: "active",
      label: "Active / approved chefs only",
      hint: "Approved chefs only. Excludes pending applicants and waitlist leads.",
    },
    {
      value: "active_pending",
      label: "Active + pending applicants",
      hint: "Approved chefs plus people mid-application. Excludes waitlist leads.",
    },
    {
      value: "all",
      label: "All chefs & leads",
      hint: "Everyone, including waitlist chef leads.",
    },
  ],
};

function defaultMode(userType: UserType) {
  return MODE_OPTIONS[userType][0].value;
}

export default function NewsletterPreviewPage() {
  const queryClient = useQueryClient();
  const [userType, setUserType] = useState<UserType>(1);
  const [showList, setShowList] = useState(false);
  // Pending (possibly unsaved) filter selection per audience.
  const [pendingMode, setPendingMode] = useState<Record<UserType, string | null>>({
    1: null,
    2: null,
  });

  // Saved settings (source of truth for what Make sends to).
  const { data: settings } = useQuery<SettingsData>({
    queryKey: ["newsletter-settings"],
    queryFn: () => api.get("/newsletter-settings").then((r) => r.data),
  });

  const savedMode =
    settings?.settings.find((s) => s.user_type === userType)?.filter_mode ??
    defaultMode(userType);
  // What the preview/count reflects: a pending edit if any, else the saved mode.
  const activeMode = pendingMode[userType] ?? savedMode;
  const dirty = pendingMode[userType] !== null && pendingMode[userType] !== savedMode;

  const { data, isLoading } = useQuery<PreviewData>({
    queryKey: ["newsletter-preview", userType, activeMode],
    queryFn: () =>
      api
        .get("/newsletter-preview", {
          params: { user_type: userType, filter_mode: activeMode },
        })
        .then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (mode: string) =>
      api.put("/newsletter-settings", { user_type: userType, filter_mode: mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-settings"] });
      setPendingMode((p) => ({ ...p, [userType]: null }));
      toast.success("Audience filter saved. The next send uses it.");
    },
    onError: () => toast.error("Couldn't save the audience filter."),
  });

  // Fall back to placeholder data if no recipients exist yet.
  const sample = data?.sample ?? { first_name: "there", email: "friend@example.com" };
  const usingFallback = !data?.sample;

  const excluded =
    data && data.total > data.count ? data.total - data.count : 0;
  const activeOption = MODE_OPTIONS[userType].find((o) => o.value === activeMode);

  const setMode = (mode: string) =>
    setPendingMode((p) => ({ ...p, [userType]: mode }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Mail className="h-6 w-6 text-[#fa4616]" />
        <h1 className="text-2xl font-bold">Newsletter Audience</h1>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Choose who receives each newsletter. Unsubscribed addresses are always left out. Write,
        preview and schedule editions on the{" "}
        <Link to="/admin-new/newsletters" className="text-[#fa4616] hover:underline">
          Newsletters
        </Link>{" "}
        page.
      </p>

      {/* Audience toggle */}
      <div className="mb-4 inline-flex rounded-lg border bg-card p-1">
        <Button
          variant={userType === 1 ? "default" : "ghost"}
          size="sm"
          onClick={() => setUserType(1)}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Customer
        </Button>
        <Button
          variant={userType === 2 ? "default" : "ghost"}
          size="sm"
          onClick={() => setUserType(2)}
          className="gap-2"
        >
          <ChefHat className="h-4 w-4" />
          Chef
        </Button>
      </div>

      {/* Audience filter control */}
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Who receives this newsletter
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={activeMode} onValueChange={setMode}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODE_OPTIONS[userType].map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(activeMode)}
            disabled={!dirty || saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
          {dirty && (
            <span className="text-xs text-amber-600">Unsaved — preview only</span>
          )}
        </div>
        {activeOption && (
          <p className="mt-2 text-sm text-muted-foreground">{activeOption.hint}</p>
        )}
      </div>

      {/* Recipient summary */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-[#fa4616]">
            {isLoading ? "…" : (data?.count ?? 0)}
          </div>
          <div className="text-sm text-muted-foreground">
            {userType === 1 ? "Customers" : "Chefs"} would receive
          </div>
          {!isLoading && excluded > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              {excluded} of {data?.total} excluded by filter
            </div>
          )}
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sample recipient
          </div>
          <div className="mt-1 text-sm">
            <span className="font-medium">{sample.first_name}</span>{" "}
            <span className="text-muted-foreground">&lt;{sample.email}&gt;</span>
            {usingFallback && (
              <span className="ml-2 text-xs text-amber-600">
                (placeholder — none match this filter yet)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recipient list */}
      <div className="mb-4 rounded-lg border bg-card p-4">
        <button
          type="button"
          onClick={() => setShowList((s) => !s)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-[#fa4616]"
        >
          {showList ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {showList ? "Hide" : "Show"} recipient list ({data?.recipients?.length ?? 0})
        </button>
        {showList && (
          <div className="mt-3">
            {(data?.recipients?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No one matches this filter yet.</p>
            ) : (
              <ul className="grid max-h-72 grid-cols-2 gap-x-6 gap-y-1 overflow-y-auto sm:grid-cols-3">
                {data!.recipients.map((r, i) => (
                  <li key={i} className="text-sm">
                    {r.first_name} {r.last_initial}
                    {r.source === "waitlist" && (
                      <span className="ml-1 text-xs text-muted-foreground">(lead)</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              First name + last initial only. This is exactly who the newsletter would
              send to with the selected filter.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
