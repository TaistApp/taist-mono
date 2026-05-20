import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { Camera, Check, X, Clock, Download, Share2, CheckCircle2 } from "lucide-react";

interface DishPhoto {
  id: number;
  order_id: number;
  chef_user_id: number;
  menu_id: number;
  filename: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  queued_for_social: boolean;
  social_caption: string | null;
  last_posted_at: string | null;
  created_at: string;
  chef_name: string;
  chef_email: string;
  menu_title: string;
  image_url: string;
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-500/15 text-amber-700 border-amber-500/20", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20", icon: Check },
  rejected: { label: "Rejected", color: "bg-red-500/15 text-red-700 border-red-500/20", icon: X },
};

export default function DishPhotosPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [selectedPhoto, setSelectedPhoto] = useState<DishPhoto | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [socialCaption, setSocialCaption] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["dish-photos", filter],
    queryFn: () =>
      api.get("/dish-photos", { params: { status: filter } }).then((r) => r.data.data as DishPhoto[]),
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; status?: string; admin_notes?: string; queued_for_social?: boolean; social_caption?: string }) =>
      api.put(`/dish-photos/${params.id}`, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dish-photos"] });
      toast.success("Photo updated");
    },
    onError: () => toast.error("Failed to update photo"),
  });

  const handleStatusChange = (photo: DishPhoto, newStatus: string) => {
    updateMutation.mutate({ id: photo.id, status: newStatus });
  };

  const handleSave = () => {
    if (!selectedPhoto) return;
    updateMutation.mutate({
      id: selectedPhoto.id,
      admin_notes: adminNotes,
      social_caption: socialCaption,
    });
    setSelectedPhoto(null);
  };

  const handleToggleSocialQueue = (photo: DishPhoto) => {
    updateMutation.mutate({ id: photo.id, queued_for_social: !photo.queued_for_social });
  };

  const handleBulkAction = (action: "approve" | "queue") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const promises = ids.map((id) => {
      if (action === "approve") {
        return api.put(`/dish-photos/${id}`, { status: "approved" });
      }
      return api.put(`/dish-photos/${id}`, { status: "approved", queued_for_social: true });
    });

    Promise.all(promises).then(() => {
      queryClient.invalidateQueries({ queryKey: ["dish-photos"] });
      toast.success(`${ids.length} photo(s) ${action === "approve" ? "approved" : "approved & queued"}`);
      setSelectedIds(new Set());
    }).catch(() => toast.error("Some updates failed"));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const photos = data ?? [];

  const generateCaption = (photo: DishPhoto) => {
    return `${photo.menu_title} by Chef ${photo.chef_name} \u{1F525}\n\nOrder now on Taist \u{1F449} link in bio\n\n#taist #homecooking #localchef #foodie`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dish Photos</h1>
          <p className="text-sm text-muted-foreground">
            Chef-captured dish photos for social media content
          </p>
        </div>
        <div className="flex items-center gap-3">
          {photos.filter((p) => p.queued_for_social).length > 0 && (
            <Badge variant="outline" className="bg-blue-500/15 text-blue-700 border-blue-500/20">
              <Share2 className="mr-1 h-3 w-3" />
              {photos.filter((p) => p.queued_for_social).length} queued for social
            </Badge>
          )}
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">{photos.length} photos</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <Button
              key={s}
              variant={filter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {filter !== s && (
                <span className="ml-1.5 text-xs opacity-60">
                  {s === "all" ? data?.length ?? 0 : (data ?? []).filter((p) => p.status === s).length}
                </span>
              )}
            </Button>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("approve")}>
              <Check className="mr-1 h-3 w-3" />
              Approve
            </Button>
            <Button size="sm" onClick={() => handleBulkAction("queue")}>
              <Share2 className="mr-1 h-3 w-3" />
              Approve & Queue
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Camera className="h-12 w-12 opacity-30" />
          <p>No dish photos yet</p>
          <p className="text-xs">Photos will appear here after chefs snap them post-order</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {photos.map((photo) => {
            const cfg = statusConfig[photo.status];
            const isSelected = selectedIds.has(photo.id);
            return (
              <div
                key={photo.id}
                className={`group relative cursor-pointer overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-md ${
                  isSelected ? "ring-2 ring-blue-500" : ""
                }`}
              >
                <div
                  className="absolute left-2 top-2 z-10"
                  onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                >
                  <Checkbox checked={isSelected} />
                </div>

                <div
                  onClick={() => {
                    setSelectedPhoto(photo);
                    setAdminNotes(photo.admin_notes ?? "");
                    setSocialCaption(photo.social_caption ?? generateCaption(photo));
                  }}
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={photo.image_url}
                      alt={photo.menu_title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  <div className="absolute right-2 top-2 flex gap-1">
                    <Badge variant="outline" className={`${cfg.color} text-xs`}>
                      {cfg.label}
                    </Badge>
                    {photo.queued_for_social && (
                      <Badge variant="outline" className="bg-blue-500/15 text-blue-700 border-blue-500/20 text-xs">
                        <Share2 className="mr-0.5 h-2.5 w-2.5" />
                        Queued
                      </Badge>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="truncate text-sm font-medium">{photo.menu_title}</p>
                    <p className="truncate text-xs text-muted-foreground">{photo.chef_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(photo.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-2xl">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPhoto.menu_title}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="overflow-hidden rounded-lg">
                  <img
                    src={selectedPhoto.image_url}
                    alt={selectedPhoto.menu_title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Chef:</span>{" "}
                      <span className="font-medium">{selectedPhoto.chef_name}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Order:</span>{" "}
                      <span className="font-medium">#{selectedPhoto.order_id}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Captured:</span>{" "}
                      <span className="font-medium">
                        {new Date(selectedPhoto.created_at).toLocaleString()}
                      </span>
                    </div>
                    {selectedPhoto.last_posted_at && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Last posted:</span>{" "}
                        <span className="font-medium">
                          {new Date(selectedPhoto.last_posted_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={selectedPhoto.status}
                      onValueChange={(v) => handleStatusChange(selectedPhoto, v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Social Caption</label>
                    <Textarea
                      value={socialCaption}
                      onChange={(e) => setSocialCaption(e.target.value)}
                      placeholder="Caption for social media posts..."
                      rows={4}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setSocialCaption(generateCaption(selectedPhoto))}
                    >
                      Generate default caption
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Admin Notes</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Internal notes (not published)"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = selectedPhoto.image_url;
                    link.download = selectedPhoto.filename;
                    link.click();
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>

                <Button
                  variant={selectedPhoto.queued_for_social ? "secondary" : "outline"}
                  onClick={() => handleToggleSocialQueue(selectedPhoto)}
                >
                  {selectedPhoto.queued_for_social ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-blue-600" />
                      Queued for Social
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-2 h-4 w-4" />
                      Queue for Social
                    </>
                  )}
                </Button>

                <Button onClick={handleSave}>Save</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
