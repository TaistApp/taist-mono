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
import { toast } from "sonner";
import { Camera, Check, X, Clock, Download } from "lucide-react";

interface DishPhoto {
  id: number;
  order_id: number;
  chef_user_id: number;
  menu_id: number;
  filename: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
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

  const { data, isLoading } = useQuery({
    queryKey: ["dish-photos", filter],
    queryFn: () =>
      api.get("/dish-photos", { params: { status: filter } }).then((r) => r.data.data as DishPhoto[]),
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; status?: string; admin_notes?: string }) =>
      api.put(`/dish-photos/${params.id}`, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dish-photos"] });
      toast.success("Photo updated");
      setSelectedPhoto(null);
    },
    onError: () => toast.error("Failed to update photo"),
  });

  const handleStatusChange = (photo: DishPhoto, newStatus: string) => {
    updateMutation.mutate({ id: photo.id, status: newStatus });
  };

  const handleSaveNotes = () => {
    if (!selectedPhoto) return;
    updateMutation.mutate({ id: selectedPhoto.id, admin_notes: adminNotes });
  };

  const photos = data ?? [];
  const counts = {
    all: photos.length,
    pending: photos.filter((p) => p.status === "pending").length,
    approved: photos.filter((p) => p.status === "approved").length,
    rejected: photos.filter((p) => p.status === "rejected").length,
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
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">{photos.length} photos</span>
        </div>
      </div>

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
            return (
              <div
                key={photo.id}
                className="group relative cursor-pointer overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md"
                onClick={() => {
                  setSelectedPhoto(photo);
                  setAdminNotes(photo.admin_notes ?? "");
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
                <div className="absolute left-2 top-2">
                  <Badge variant="outline" className={`${cfg.color} text-xs`}>
                    {cfg.label}
                  </Badge>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{photo.menu_title}</p>
                  <p className="truncate text-xs text-muted-foreground">{photo.chef_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(photo.created_at).toLocaleDateString()}
                  </p>
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
                    <label className="text-sm font-medium">Admin Notes</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Notes about this photo (e.g., great lighting, needs retake)"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
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
                <Button onClick={handleSaveNotes}>Save Notes</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
