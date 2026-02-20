import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { ChefRow } from "@/pages/chefs";

interface ProfileData {
  id: number;
  email: string;
  name: string;
  bio: string | null;
  availability: Record<string, string | null>;
  min_order_amount: number | null;
  max_order_distance: number | null;
}

const statusColors: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  Pending: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  Rejected: "bg-red-500/15 text-red-700 border-red-500/20",
  Banned: "bg-gray-500/15 text-gray-700 border-gray-500/20",
};

const dayKeys = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface ChefDetailDrawerProps {
  chef: ChefRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChefDetailDrawer({
  chef,
  open,
  onOpenChange,
}: ChefDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch profile data when drawer opens
  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["profiles", chef?.id],
    queryFn: () => api.get(`/profiles/${chef!.id}`).then((r) => r.data),
    enabled: open && chef != null,
  });

  // Hydrate bio field when profile loads
  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? "");
    } else if (chef?.bio) {
      setBio(chef.bio);
    } else {
      setBio("");
    }
  }, [profile, chef]);

  const handleSaveBio = async () => {
    if (!chef) return;
    setSaving(true);
    try {
      await api.put(`/profiles/${chef.id}`, { bio });
      toast.success("Bio updated");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    } catch {
      toast.error("Failed to update bio");
    } finally {
      setSaving(false);
    }
  };

  if (!chef) return null;

  // Use profile data if available, fallback to pending data from chef row
  const availability = profile?.availability ?? chef.availability;
  const minOrder = profile?.min_order_amount ?? chef.min_order_amount;
  const maxDistance = profile?.max_order_distance ?? chef.max_order_distance;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {chef.first_name} {chef.last_name}
          </SheetTitle>
          <SheetDescription>{chef.email}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          {/* Status & Contact */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              <Badge variant="outline" className={statusColors[chef.status] ?? ""}>
                {chef.status}
              </Badge>
            </div>
            {chef.phone && (
              <div className="text-sm">
                <span className="text-gray-500">Phone:</span> {chef.phone}
              </div>
            )}
            {chef.address && (
              <div className="text-sm">
                <span className="text-gray-500">Address:</span>{" "}
                {[chef.address, chef.city, chef.state, chef.zip]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            )}
            {chef.photo && (
              <img
                src={`/assets/uploads/images/${chef.photo}`}
                alt=""
                className="h-20 w-20 rounded object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>

          {/* Profile — Bio */}
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Profile
            </h3>
            <div className="space-y-2">
              <Label htmlFor="chef-bio">Bio</Label>
              <Textarea
                id="chef-bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
              <Button size="sm" onClick={handleSaveBio} disabled={saving}>
                {saving ? "Saving..." : "Save Bio"}
              </Button>
            </div>
          </div>

          {/* Availability */}
          {availability && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Availability
              </h3>
              <div className="space-y-1 text-sm">
                {dayKeys.map((day) => (
                  <div key={day} className="flex justify-between">
                    <span className="text-gray-500">{day}</span>
                    <span>{availability[day] ?? "—"}</span>
                  </div>
                ))}
              </div>
              {(minOrder != null || maxDistance != null) && (
                <div className="mt-2 space-y-1 text-sm">
                  {minOrder != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Min Order</span>
                      <span>${minOrder}</span>
                    </div>
                  )}
                  {maxDistance != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Max Distance</span>
                      <span>{maxDistance} mi</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Live Menus */}
          {chef.live_menus && chef.live_menus.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Live Menus
              </h3>
              <ul className="list-disc pl-5 text-sm">
                {chef.live_menus.map((menu) => (
                  <li key={menu}>{menu}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Weekly Availability (from /chefs) */}
          {chef.weekly_availability && chef.weekly_availability.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Weekly Schedule
              </h3>
              <div className="space-y-0.5 text-sm">
                {chef.weekly_availability.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          )}

          {/* Live Overrides */}
          {chef.live_overrides && chef.live_overrides.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Live Overrides
              </h3>
              <div className="space-y-0.5 text-sm">
                {chef.live_overrides.map((o, i) => (
                  <div
                    key={i}
                    className={
                      o.status === "cancelled"
                        ? "text-red-600"
                        : o.status === "confirmed"
                          ? "text-green-600"
                          : "text-yellow-600"
                    }
                  >
                    {o.date}: {o.start}-{o.end} ({o.status})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
