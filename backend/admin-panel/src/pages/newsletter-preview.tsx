import { useState } from "react";
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
import { Mail, Users, ChefHat, Filter, Save } from "lucide-react";

/**
 * Newsletter preview — purely visual. Renders the exact HTML templates that
 * the Make.com scenarios (#5233475 customer, #5233482 chef) send, with a real
 * recipient's first_name / email substituted in. Sends nothing.
 *
 * The two template strings below are kept in sync with the Make scenarios.
 * Placeholders {{2.first_name}} and {{2.email}} are replaced at render time.
 */

const CUSTOMER_TEMPLATE = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Taist Update</title><style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');body{margin:0;padding:0;background-color:#ffffff;}</style></head><body style="margin:0;padding:0;background-color:#ffffff;"><div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Taist is live in Indianapolis — your first home-cooked meal is a few taps away.</div><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;"><tr><td align="center" style="padding:40px 16px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="580" style="max-width:580px;width:100%;"><tr><td align="center" style="padding:0 0 32px 0;"><a href="https://taist.app" target="_blank" style="text-decoration:none;"><img src="https://taist.app/images/taist-logo-only-cropped.png" alt="taist" width="160" style="display:block;width:160px;height:auto;"></a></td></tr><tr><td><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ebebeb;"><tr><td style="background-color:#fa4616;height:4px;font-size:1px;line-height:1px;">&nbsp;</td></tr><tr><td style="padding:48px 40px 40px 40px;"><p style="margin:0 0 16px 0;font-family:'Poppins',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#fa4616;">Welcome In</p><h1 style="margin:0 0 20px 0;font-family:'Poppins',Arial,sans-serif;font-size:28px;font-weight:700;line-height:1.25;color:#0a0a0a;">Hey {{2.first_name}}, Taist is officially cooking.</h1><p style="margin:0 0 18px 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.65;color:#1a1a1a;">This is our very first Taist newsletter — so before anything else, thank you. You signed up early, and that genuinely means a lot to a small team building something new here in Indianapolis.</p><p style="margin:0 0 22px 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.65;color:#1a1a1a;">Here's the short version: Taist is live. Real personal chefs in your area are cooking real menus, and you can book one to come make a meal right in your own kitchen.</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 26px 0;border:1px solid #fa4616;border-radius:12px;"><tr><td style="padding:18px 22px;"><p style="margin:0 0 6px 0;font-family:'Poppins',Arial,sans-serif;font-size:16px;font-weight:600;color:#0a0a0a;">No grocery shopping. No cooking. And no cleanup.</p><p style="margin:0;font-family:'Poppins',Arial,sans-serif;font-size:13px;line-height:1.5;color:#6b6560;">Starting at $60&ndash;80/table &middot; Taist chefs do meal prep for individuals too!</p></td></tr></table><p style="margin:0 0 16px 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;font-weight:600;color:#0a0a0a;">Getting your first meal is easy:</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td valign="top" width="40" style="padding:0 0 16px 0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;background-color:#fa4616;border-radius:14px;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;line-height:28px;">1</td></tr></table></td><td valign="top" style="padding:2px 0 16px 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;"><strong style="color:#0a0a0a;">Download &amp; open the app.</strong> Use code EARLYTAIST for 30% off your first order.</td></tr><tr><td valign="top" width="40" style="padding:0 0 16px 0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;background-color:#fa4616;border-radius:14px;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;line-height:28px;">2</td></tr></table></td><td valign="top" style="padding:2px 0 16px 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;"><strong style="color:#0a0a0a;">Browse chefs &amp; menus near you.</strong> Every chef sets their own dishes and prices.</td></tr><tr><td valign="top" width="40" style="padding:0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;background-color:#fa4616;border-radius:14px;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;line-height:28px;">3</td></tr></table></td><td valign="top" style="padding:2px 0 0 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;"><strong style="color:#0a0a0a;">Pick your date — they handle the rest.</strong> Your chef shops, cooks, and cleans up.</td></tr></table><p style="margin:24px 0 0 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.65;color:#1a1a1a;">We're adding new chefs and opening up new neighborhoods every couple of weeks, and we'll keep you in the loop right here. Got a question, or a chef you'd love to see? Just hit reply — we read every one.</p><hr style="border:none;border-top:1px solid #e8e8e8;margin:28px 0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;"><tr><td style="border-radius:50px;background-color:#ffffff;border:2px solid #fa4616;"><a href="https://taist.app" target="_blank" style="display:inline-block;padding:14px 36px;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:600;color:#fa4616;text-decoration:none;">Order on Taist &rarr;</a></td></tr></table></td></tr></table></td></tr><tr><td style="padding:32px 0 0 0;text-align:center;"><a href="https://taist.app" target="_blank" style="text-decoration:none;"><img src="https://taist.app/images/taist-logo-only-cropped.png" alt="taist" width="90" style="display:inline-block;width:90px;height:auto;margin-bottom:8px;"></a><p style="margin:0 0 4px 0;font-family:'Poppins',Arial,sans-serif;font-size:13px;color:#6b6560;">On-demand personal chefs &middot; Indianapolis, IN</p><p style="margin:0;font-family:'Poppins',Arial,sans-serif;font-size:13px;color:#9a9590;">&copy; 2026 Taist. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;

const CHEF_TEMPLATE = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Taist Chef Update</title><style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');body{margin:0;padding:0;background-color:#ffffff;}</style></head><body style="margin:0;padding:0;background-color:#ffffff;"><div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Taist is live in Indianapolis — here's how to set up your kitchen and start earning.</div><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;"><tr><td align="center" style="padding:40px 16px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="580" style="max-width:580px;width:100%;"><tr><td align="center" style="padding:0 0 32px 0;"><a href="https://taist.app" target="_blank" style="text-decoration:none;"><img src="https://taist.app/images/taist-logo-only-cropped.png" alt="taist" width="160" style="display:block;width:160px;height:auto;"></a></td></tr><tr><td><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ebebeb;"><tr><td style="background-color:#fa4616;height:4px;font-size:1px;line-height:1px;">&nbsp;</td></tr><tr><td style="padding:48px 40px 40px 40px;"><p style="margin:0 0 16px 0;font-family:'Poppins',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#fa4616;">Welcome In</p><h1 style="margin:0 0 20px 0;font-family:'Poppins',Arial,sans-serif;font-size:28px;font-weight:700;line-height:1.25;color:#0a0a0a;">Hey Chef {{2.first_name}}, let's get cooking.</h1><p style="margin:0 0 18px 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.65;color:#1a1a1a;">This is our very first Taist chef newsletter — so first, thank you. You joined early while we build a network of talented chefs across Indianapolis, and that means a lot to our small team.</p><p style="margin:0 0 22px 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.65;color:#1a1a1a;">Here's the short version: Taist is live and customers are booking. Once your profile and menu are set up, you can start accepting orders and cooking on your own terms.</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 26px 0;border:1px solid #fa4616;border-radius:12px;"><tr><td style="padding:18px 22px;"><p style="margin:0 0 6px 0;font-family:'Poppins',Arial,sans-serif;font-size:16px;font-weight:600;color:#0a0a0a;">Set your own schedule. Cook what you love. Earn what you want.</p><p style="margin:0;font-family:'Poppins',Arial,sans-serif;font-size:13px;line-height:1.5;color:#6b6560;">You set your menu and prices &middot; We handle the orders</p></td></tr></table><p style="margin:0 0 16px 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;font-weight:600;color:#0a0a0a;">Ready to start? Here's how:</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td valign="top" width="40" style="padding:0 0 16px 0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;background-color:#fa4616;border-radius:14px;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;line-height:28px;">1</td></tr></table></td><td valign="top" style="padding:2px 0 16px 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;"><strong style="color:#0a0a0a;">Download the app &amp; finish your profile.</strong> A photo and short bio help customers pick you.</td></tr><tr><td valign="top" width="40" style="padding:0 0 16px 0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;background-color:#fa4616;border-radius:14px;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;line-height:28px;">2</td></tr></table></td><td valign="top" style="padding:2px 0 16px 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;"><strong style="color:#0a0a0a;">Set up your menu &amp; prices.</strong> Add the dishes you love to cook and what you charge per table.</td></tr><tr><td valign="top" width="40" style="padding:0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;background-color:#fa4616;border-radius:14px;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;line-height:28px;">3</td></tr></table></td><td valign="top" style="padding:2px 0 0 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;"><strong style="color:#0a0a0a;">Hop on a quick intro call &amp; go live.</strong> We'll walk you through it, then orders can start rolling in.</td></tr></table><p style="margin:24px 0 0 0;font-family:'Poppins',Arial,sans-serif;font-size:15px;line-height:1.65;color:#1a1a1a;">Going forward, we'll use these updates to share earning tips, demand trends, new features, and chef spotlights. Questions, or something you need to get cooking? Just hit reply — we read every one.</p><hr style="border:none;border-top:1px solid #e8e8e8;margin:28px 0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;"><tr><td style="border-radius:50px;background-color:#ffffff;border:2px solid #fa4616;"><a href="https://taist.app/cook-with-taist" target="_blank" style="display:inline-block;padding:14px 36px;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-weight:600;color:#fa4616;text-decoration:none;">Cook with Taist &rarr;</a></td></tr></table></td></tr></table></td></tr><tr><td style="padding:32px 0 0 0;text-align:center;"><a href="https://taist.app" target="_blank" style="text-decoration:none;"><img src="https://taist.app/images/taist-logo-only-cropped.png" alt="taist" width="90" style="display:inline-block;width:90px;height:auto;margin-bottom:8px;"></a><p style="margin:0 0 4px 0;font-family:'Poppins',Arial,sans-serif;font-size:13px;color:#6b6560;">On-demand personal chefs &middot; Indianapolis, IN</p><p style="margin:0;font-family:'Poppins',Arial,sans-serif;font-size:13px;color:#9a9590;">&copy; 2026 Taist. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;

const SUBJECTS = {
  1: "It's official, {{2.first_name}} — Taist is live in Indy.",
  2: "It's official, Chef {{2.first_name}} — Taist is live in Indy.",
} as const;

interface PreviewData {
  count: number;
  total: number;
  filter_mode: string;
  sample: { first_name: string; email: string } | null;
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

function render(template: string, first_name: string, email: string) {
  return template
    .replaceAll("{{2.first_name}}", first_name)
    .replaceAll("{{2.email}}", email);
}

export default function NewsletterPreviewPage() {
  const queryClient = useQueryClient();
  const [userType, setUserType] = useState<UserType>(1);
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
      toast.success("Audience filter saved — Make will use it on the next send.");
    },
    onError: () => toast.error("Couldn't save the audience filter."),
  });

  // Fall back to placeholder data if no recipients exist yet.
  const sample = data?.sample ?? { first_name: "there", email: "friend@example.com" };
  const usingFallback = !data?.sample;

  const template = userType === 1 ? CUSTOMER_TEMPLATE : CHEF_TEMPLATE;
  const html = render(template, sample.first_name, sample.email);
  const subject = render(SUBJECTS[userType], sample.first_name, sample.email);

  const excluded =
    data && data.total > data.count ? data.total - data.count : 0;
  const activeOption = MODE_OPTIONS[userType].find((o) => o.value === activeMode);

  const setMode = (mode: string) =>
    setPendingMode((p) => ({ ...p, [userType]: mode }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Mail className="h-6 w-6 text-[#fa4616]" />
        <h1 className="text-2xl font-bold">Newsletter Preview</h1>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Preview the email and choose who receives it. The templates mirror the
        Make.com scenarios (#5233475 customer, #5233482 chef); the audience filter
        controls who those scenarios actually send to. This page never sends email.
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
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Subject
          </div>
          <div className="mt-1 text-sm font-medium">{subject}</div>
        </div>
      </div>

      {/* Rendered email */}
      <div className="overflow-hidden rounded-lg border bg-[#f4f4f5]">
        <iframe
          title="Newsletter preview"
          srcDoc={html}
          className="h-[1100px] w-full border-0 bg-white"
        />
      </div>
    </div>
  );
}
