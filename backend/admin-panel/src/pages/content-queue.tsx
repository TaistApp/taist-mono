import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  X,
  Clock,
  FileDown,
  Sparkles,
  Utensils,
  MapPin,
  Star,
  Camera,
} from "lucide-react";

interface QueueItem {
  id: number;
  post_id: string | null;
  scheduled_date: string | null;
  day_of_week: string | null;
  time: string | null;
  platform: string;
  pillar: string;
  caption: string;
  hashtags: string | null;
  image_url: string | null;
  target_audience: string | null;
  queue_status: "draft" | "approved" | "exported" | "rejected";
  notes: string | null;
  review_quote: string | null;
  review_attribution: string | null;
  source_photo_id: number | null;
  source_menu_id: number | null;
  generated_by: string;
  created_at: string;
  dish_photo?: { filename: string; image_url: string } | null;
  menu?: { title: string } | null;
}

const statusConfig = {
  draft: { label: "Draft", color: "bg-amber-500/15 text-amber-700 border-amber-500/20", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20", icon: Check },
  exported: { label: "Exported", color: "bg-blue-500/15 text-blue-700 border-blue-500/20", icon: FileDown },
  rejected: { label: "Rejected", color: "bg-red-500/15 text-red-700 border-red-500/20", icon: X },
};

const pillarConfig: Record<string, { icon: typeof Utensils; color: string }> = {
  "Menu Item": { icon: Utensils, color: "text-orange-600" },
  "How It Works": { icon: Sparkles, color: "text-purple-600" },
  "Local": { icon: MapPin, color: "text-green-600" },
  "Reviews": { icon: Star, color: "text-yellow-600" },
  "Dish Photo": { icon: Camera, color: "text-blue-600" },
};

export default function ContentQueuePage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [pillarFilter, setPillarFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["content-queue", statusFilter, pillarFilter],
    queryFn: () =>
      api
        .get("/content-queue", {
          params: {
            ...(statusFilter !== "all" && { queue_status: statusFilter }),
            ...(pillarFilter !== "all" && { pillar: pillarFilter }),
          },
        })
        .then((r) => r.data.data as QueueItem[]),
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; [key: string]: unknown }) =>
      api.put(`/content-queue/${params.id}`, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-queue"] });
      toast.success("Item updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/content-queue/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-queue"] });
      toast.success("Approved");
      setSelectedItem(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => api.post(`/content-queue/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-queue"] });
      toast.success("Rejected");
      setSelectedItem(null);
    },
  });

  const handleSave = () => {
    if (!selectedItem) return;
    updateMutation.mutate({
      id: selectedItem.id,
      caption: editCaption,
      hashtags: editHashtags,
      scheduled_date: editDate || null,
      notes: editNotes,
    });
    setSelectedItem(null);
  };

  const handleExport = async () => {
    try {
      const resp = await api.get("/content-queue/export");
      const rows = resp.data.data as string[][];
      if (!rows.length) {
        toast.error("No approved items to export");
        return;
      }

      // Build TSV for easy paste into Excel
      const header = [
        "Post ID", "Date", "Day", "Time", "Platform", "Pillar",
        "Caption", "Hashtags", "Canva Design URL", "Image URL",
        "Target Audience", "CTA Link", "Posted", "PublishedAt",
        "IG Post ID", "FB Post ID", "Notes", "ReviewQuote", "ReviewAttribution",
      ];
      const tsv = [header, ...rows].map((r) => r.map((c) => c ?? "").join("\t")).join("\n");

      await navigator.clipboard.writeText(tsv);
      toast.success(`${rows.length} row(s) copied to clipboard — paste into Excel`);
      queryClient.invalidateQueries({ queryKey: ["content-queue"] });
    } catch {
      toast.error("Export failed");
    }
  };

  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Queue</h1>
          <p className="text-sm text-muted-foreground">
            AI-generated social content for review and export to the content calendar
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" />
            Export Approved to Clipboard
          </Button>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">{items.length} items</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {(["all", "draft", "approved", "exported", "rejected"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1.5 text-xs opacity-60">
                {s === "all"
                  ? items.length
                  : items.filter((i) => i.queue_status === s).length}
              </span>
            </Button>
          ))}
        </div>

        <Select value={pillarFilter} onValueChange={setPillarFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Pillars" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pillars</SelectItem>
            <SelectItem value="Menu Item">Menu Item</SelectItem>
            <SelectItem value="How It Works">How It Works</SelectItem>
            <SelectItem value="Local">Local</SelectItem>
            <SelectItem value="Reviews">Reviews</SelectItem>
            <SelectItem value="Dish Photo">Dish Photo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
          <CalendarDays className="h-12 w-12 opacity-30" />
          <p>No content in queue</p>
          <p className="text-xs">The routine will generate content here for review</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const status = statusConfig[item.queue_status];
            const pillar = pillarConfig[item.pillar] ?? { icon: Sparkles, color: "text-gray-600" };
            const PillarIcon = pillar.icon;

            return (
              <div
                key={item.id}
                className="flex cursor-pointer items-start gap-4 rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                onClick={() => {
                  setSelectedItem(item);
                  setEditCaption(item.caption);
                  setEditHashtags(item.hashtags ?? "");
                  setEditDate(item.scheduled_date?.split("T")[0] ?? "");
                  setEditNotes(item.notes ?? "");
                }}
              >
                {/* Pillar icon */}
                <div className={`mt-0.5 ${pillar.color}`}>
                  <PillarIcon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{item.pillar}</span>
                    <Badge variant="outline" className={`${status.color} text-xs`}>
                      {status.label}
                    </Badge>
                    {item.generated_by === "routine" && (
                      <Badge variant="outline" className="bg-violet-500/15 text-violet-700 border-violet-500/20 text-xs">
                        <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                        AI
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{item.caption}</p>
                  {item.hashtags && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.hashtags}</p>
                  )}
                </div>

                {/* Date */}
                <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                  {item.scheduled_date
                    ? new Date(item.scheduled_date + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : "Unscheduled"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedItem.pillar}
                  <Badge variant="outline" className={`${statusConfig[selectedItem.queue_status].color} text-xs`}>
                    {statusConfig[selectedItem.queue_status].label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Source info */}
                {selectedItem.menu && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Menu Item:</span>{" "}
                    <span className="font-medium">{selectedItem.menu.title}</span>
                  </div>
                )}
                {selectedItem.dish_photo && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Dish Photo:</span>
                    <img
                      src={selectedItem.dish_photo.image_url}
                      alt="Dish"
                      className="h-40 w-40 rounded-lg object-cover"
                    />
                  </div>
                )}
                {selectedItem.review_quote && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Review:</span>{" "}
                    <span className="italic">"{selectedItem.review_quote}"</span>
                    {selectedItem.review_attribution && (
                      <span className="text-muted-foreground"> — {selectedItem.review_attribution}</span>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Scheduled Date</label>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Caption</label>
                  <Textarea
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    rows={5}
                    placeholder="Social media caption..."
                  />
                  <p className="text-xs text-muted-foreground">
                    {editCaption.length} chars · Remember: caption should complement the image, not repeat it
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Hashtags</label>
                  <Textarea
                    value={editHashtags}
                    onChange={(e) => setEditHashtags(e.target.value)}
                    rows={2}
                    placeholder="#taist #homecooking #indianapolis"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    placeholder="Internal notes..."
                  />
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                {selectedItem.queue_status === "draft" && (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => rejectMutation.mutate(selectedItem.id)}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      variant="default"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => approveMutation.mutate(selectedItem.id)}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                  </>
                )}
                <Button onClick={handleSave}>Save Changes</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
