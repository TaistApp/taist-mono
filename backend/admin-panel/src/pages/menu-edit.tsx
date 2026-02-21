import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface MenuDetail {
  id: number;
  title: string;
  description: string;
}

interface Customization {
  id: number;
  menu_id: number;
  menu_title: string | null;
  name: string;
  upcharge_price: number;
  created_at: number;
}

export default function MenuEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit customization dialog state
  const [editCust, setEditCust] = useState<Customization | null>(null);
  const [editCustName, setEditCustName] = useState("");
  const [savingCust, setSavingCust] = useState(false);

  const { data: menu, isLoading } = useQuery<MenuDetail>({
    queryKey: ["menus", id],
    queryFn: () => api.get(`/menus/${id}`).then((r) => r.data),
  });

  // Fetch all customizations, filter client-side
  const { data: allCustomizations = [] } = useQuery<Customization[]>({
    queryKey: ["customizations"],
    queryFn: () => api.get("/customizations").then((r) => r.data),
  });

  const menuCustomizations = allCustomizations.filter(
    (c) => c.menu_id === Number(id)
  );

  useEffect(() => {
    if (menu) {
      setTitle(menu.title);
      setDescription(menu.description ?? "");
    }
  }, [menu]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/menus/${id}`, { title, description });
      toast.success("Menu updated");
      queryClient.invalidateQueries({ queryKey: ["menus"] });
      navigate("/admin-new/menus");
    } catch {
      toast.error("Failed to update menu");
    } finally {
      setSaving(false);
    }
  };

  const openEditCust = (cust: Customization) => {
    setEditCust(cust);
    setEditCustName(cust.name);
  };

  const handleSaveCust = async () => {
    if (!editCust) return;
    setSavingCust(true);
    try {
      await api.put(`/customizations/${editCust.id}`, { name: editCustName });
      toast.success("Customization updated");
      queryClient.invalidateQueries({ queryKey: ["customizations"] });
      setEditCust(null);
    } catch {
      toast.error("Failed to update customization");
    } finally {
      setSavingCust(false);
    }
  };

  if (isLoading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/admin-new/menus")}>
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Menu</h1>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Textarea
            id="title"
            rows={2}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Customizations sub-table */}
      {menuCustomizations.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Customizations</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuCustomizations.map((cust) => (
                  <TableRow key={cust.id}>
                    <TableCell>{cust.name}</TableCell>
                    <TableCell>${cust.upcharge_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditCust(cust)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Edit Customization Dialog */}
      <Dialog
        open={editCust != null}
        onOpenChange={(open) => !open && setEditCust(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="cust-name">Name</Label>
              <Input
                id="cust-name"
                value={editCustName}
                onChange={(e) => setEditCustName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCust(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCust} disabled={savingCust}>
              {savingCust ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
