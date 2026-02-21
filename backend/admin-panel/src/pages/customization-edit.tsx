import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CustomizationDetail {
  id: number;
  name: string;
}

export default function CustomizationEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<CustomizationDetail>({
    queryKey: ["customizations", id],
    queryFn: () => api.get(`/customizations/${id}`).then((r) => r.data),
  });

  useEffect(() => {
    if (data) setName(data.name);
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/customizations/${id}`, { name });
      toast.success("Customization updated");
      queryClient.invalidateQueries({ queryKey: ["customizations"] });
      navigate("/admin-new/customizations");
    } catch {
      toast.error("Failed to update customization");
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
          onClick={() => navigate("/admin-new/customizations")}
        >
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Customization</h1>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Textarea
            id="name"
            rows={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
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
