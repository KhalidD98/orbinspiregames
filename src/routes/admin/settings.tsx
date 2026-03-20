import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const user = useQuery(api.users.current);
  const creditTypes = useQuery(api.creditTypes.list);
  const typeUsage = useQuery(api.creditTypes.usageMap);

  const createType = useMutation(api.creditTypes.create);
  const updateType = useMutation(api.creditTypes.update);
  const removeType = useMutation(api.creditTypes.remove);
  const seedTypes = useMutation(api.creditTypes.seed);
  const migrateTransactions = useAction(api.creditTypes.migrateTransactions);

  const isOwner = user?.role === "owner";
  const isManagerOrOwner = user?.role === "manager" || user?.role === "owner";

  // Auto-seed when owner visits and list is empty
  const [seeding, setSeeding] = useState(false);
  useEffect(() => {
    if (
      !seeding &&
      isOwner &&
      creditTypes !== undefined &&
      creditTypes.length === 0
    ) {
      setSeeding(true);
      seedTypes({})
        .then(() => migrateTransactions({}))
        .catch(() => toast.error("Failed to initialize default credit types"))
        .finally(() => setSeeding(false));
    }
  }, [isOwner, creditTypes, seeding, seedTypes, migrateTransactions]);

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  if (user !== undefined && !isManagerOrOwner) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Access Denied</p>
        </CardContent>
      </Card>
    );
  }

  // --- Handlers ---

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!creditTypes) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= creditTypes.length) return;

    const current = creditTypes[index];
    const swapWith = creditTypes[swapIndex];

    try {
      await Promise.all([
        updateType({ id: current._id, sortOrder: swapWith.sortOrder }),
        updateType({ id: swapWith._id, sortOrder: current.sortOrder }),
      ]);
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const handleToggleActive = async (type: { _id: string; isActive: boolean }) => {
    try {
      await updateType({ id: type._id as any, isActive: !type.isActive });
      toast.success(type.isActive ? "Credit type disabled" : "Credit type enabled");
    } catch {
      toast.error("Failed to update credit type");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeType({ id: id as any });
      toast.success("Credit type deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete credit type");
    }
  };

  const openAddDialog = () => {
    setAddName("");
    setAddDialogOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      toast.error("Name is required");
      return;
    }
    setAddSaving(true);
    try {
      await createType({ name: addName.trim() });
      toast.success("Credit type added");
      setAddDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add credit type");
    } finally {
      setAddSaving(false);
    }
  };

  const openEditDialog = (type: { _id: string; name: string }) => {
    setEditingId(type._id);
    setEditName(type.name);
    setEditDialogOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Name is required");
      return;
    }
    setEditSaving(true);
    try {
      await updateType({ id: editingId as any, name: editName.trim() });
      toast.success("Credit type updated");
      setEditDialogOpen(false);
      setEditingId(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update credit type");
    } finally {
      setEditSaving(false);
    }
  };

  // --- Loading state ---

  if (creditTypes === undefined || typeUsage === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  // --- Empty state (seeding in progress or manager seeing empty) ---

  if (creditTypes.length === 0) {
    if (isOwner) {
      return (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Initializing default credit types...</p>
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No credit types configured. Please ask an owner to visit this page to
            initialize defaults.
          </p>
        </CardContent>
      </Card>
    );
  }

  // --- Main content ---

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage store configuration</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Credit Types</CardTitle>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="mr-1 h-4 w-4" />
              Add Type
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {creditTypes.map((type, index) => {
            const hasUsage = typeUsage[type._id] === true;
            return (
              <div
                key={type._id}
                className="flex items-center gap-3 rounded-md border px-3 py-2"
              >
                {/* Reorder arrows */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMove(index, "up")}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === creditTypes.length - 1}
                    onClick={() => handleMove(index, "down")}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {/* Name + badge */}
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <span className="truncate font-medium">{type.name}</span>
                  <Badge variant={type.isActive ? "default" : "secondary"}>
                    {type.isActive ? "Active" : "Disabled"}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Edit */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit type</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Toggle active */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleActive(type)}
                        >
                          {type.isActive ? (
                            <ToggleRight className="h-4 w-4 text-primary" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {type.isActive ? "Disable type" : "Enable type"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Delete */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={hasUsage}
                            onClick={() => handleDelete(type._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {hasUsage
                          ? "Cannot delete — transactions exist. Disable instead."
                          : "Delete type"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Add Type Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Credit Type</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-type-name">Name *</Label>
              <Input
                id="add-type-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Buy-in"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addSaving}>
                {addSaving ? "Adding..." : "Add Type"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Type Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Credit Type</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type-name">Name *</Label>
              <Input
                id="edit-type-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Buy-in"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
