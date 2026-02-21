import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ProfileDetail {
  id: number;
  user_id: number;
  bio: string | null;
}

export default function ProfileEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<ProfileDetail>({
    queryKey: ["profiles", id],
    queryFn: () => api.get(`/profiles/${id}`).then((r) => r.data),
  });

  useEffect(() => {
    if (data) setBio(data.bio ?? "");
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/profiles/${id}`, { bio });
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      navigate("/admin-new/profiles");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate("/admin-new/profiles")}
        >
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            rows={5}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
