import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ServiceAreasPage() {
  const queryClient = useQueryClient();
  const [zipcodes, setZipcodes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<{ zipcodes: string }>({
    queryKey: ["zipcodes"],
    queryFn: () => api.get("/zipcodes").then((r) => r.data),
  });

  useEffect(() => {
    if (data) setZipcodes(data.zipcodes ?? "");
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/zipcodes", { zipcodes });
      toast.success("Zipcodes updated");
      queryClient.invalidateQueries({ queryKey: ["zipcodes"] });
    } catch {
      toast.error("Failed to update zipcodes");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Service Areas</h1>
      <div className="space-y-4">
        <div>
          <Label htmlFor="zipcodes">
            Comma-separated list of active zipcodes
          </Label>
          <Textarea
            id="zipcodes"
            rows={8}
            value={zipcodes}
            onChange={(e) => setZipcodes(e.target.value)}
            className="mt-1 font-mono text-sm"
            placeholder="90001, 90002, 90003..."
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
