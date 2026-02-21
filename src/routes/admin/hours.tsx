import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex";
import { useState, useMemo } from "react";
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
import { ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/hours")({
  component: HoursPage,
});

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

// --- Day helpers ---

function parseDaysString(days: string): Set<DayOfWeek> {
  const result = new Set<DayOfWeek>();
  const parts = days.split(",").map((s) => s.trim());
  for (const part of parts) {
    const rangeMatch = part.match(/^(\w+)\s*[-–]\s*(\w+)$/);
    if (rangeMatch) {
      const startIdx = DAYS_OF_WEEK.indexOf(rangeMatch[1] as DayOfWeek);
      const endIdx = DAYS_OF_WEEK.indexOf(rangeMatch[2] as DayOfWeek);
      if (startIdx !== -1 && endIdx !== -1) {
        for (let i = startIdx; i <= endIdx; i++) {
          result.add(DAYS_OF_WEEK[i]);
        }
        continue;
      }
    }
    const day = DAYS_OF_WEEK.find(
      (d) => d.toLowerCase() === part.toLowerCase(),
    );
    if (day) result.add(day);
  }
  return result;
}

function formatDaysString(selected: Set<DayOfWeek>): string {
  const indices = DAYS_OF_WEEK.map((d, i) => (selected.has(d) ? i : -1)).filter(
    (i) => i !== -1,
  );
  if (indices.length === 0) return "";
  const groups: number[][] = [];
  let current = [indices[0]];
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === current[current.length - 1] + 1) {
      current.push(indices[i]);
    } else {
      groups.push(current);
      current = [indices[i]];
    }
  }
  groups.push(current);
  return groups
    .map((group) => {
      if (group.length === 1) return DAYS_OF_WEEK[group[0]];
      return `${DAYS_OF_WEEK[group[0]]} - ${DAYS_OF_WEEK[group[group.length - 1]]}`;
    })
    .join(", ");
}

// --- Time helpers ---

/** Convert 24h "HH:MM" to display "h:MM AM/PM" */
function time24ToDisplay(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

/** Parse display "h:MM AM/PM" back to 24h "HH:MM" */
function displayToTime24(display: string): string {
  const match = display.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return "";
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
}

/** Parse stored hours string like "12:00 PM - 9:00 PM" into {openTime, closeTime} in 24h format */
function parseHoursString(hours: string): { openTime: string; closeTime: string } {
  const parts = hours.split(/\s*[-–]\s*/);
  if (parts.length === 2) {
    const open = displayToTime24(parts[0].trim());
    const close = displayToTime24(parts[1].trim());
    if (open && close) return { openTime: open, closeTime: close };
  }
  return { openTime: "", closeTime: "" };
}

interface HoursFormData {
  selectedDays: Set<DayOfWeek>;
  openTime: string;
  closeTime: string;
}

function HoursPage() {
  const user = useQuery(api.users.current);
  const storeHours = useQuery(api.storeHours.list);
  const createHours = useMutation(api.storeHours.create);
  const updateHours = useMutation(api.storeHours.update);
  const removeHours = useMutation(api.storeHours.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HoursFormData>({
    selectedDays: new Set(),
    openTime: "",
    closeTime: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isManagerOrOwner =
    user?.role === "manager" || user?.role === "owner";

  const takenDays = useMemo(() => {
    if (!storeHours) return new Set<DayOfWeek>();
    const taken = new Set<DayOfWeek>();
    for (const entry of storeHours) {
      if (entry._id === editingId) continue;
      const parsed = parseDaysString(entry.days);
      for (const day of parsed) taken.add(day);
    }
    return taken;
  }, [storeHours, editingId]);

  if (user !== undefined && !isManagerOrOwner) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Access Denied. You must be a manager or owner to manage store hours.
          </p>
        </CardContent>
      </Card>
    );
  }

  const nextSortOrder = storeHours
    ? Math.max(0, ...storeHours.map((h: any) => h.sortOrder)) + 1
    : 1;

  const openNewDialog = () => {
    setEditingId(null);
    setForm({
      selectedDays: new Set(),
      openTime: "",
      closeTime: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (entry: any) => {
    setEditingId(entry._id);
    const { openTime, closeTime } = parseHoursString(entry.hours || "");
    setForm({
      selectedDays: parseDaysString(entry.days),
      openTime,
      closeTime,
    });
    setDialogOpen(true);
  };

  const toggleDay = (day: DayOfWeek) => {
    setForm((prev) => {
      const next = new Set(prev.selectedDays);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return { ...prev, selectedDays: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.selectedDays.size === 0) {
      toast.error("Select at least one day");
      return;
    }
    if (!form.openTime || !form.closeTime) {
      toast.error("Both open and close times are required");
      return;
    }

    setSaving(true);
    try {
      const hoursDisplay = `${time24ToDisplay(form.openTime)} - ${time24ToDisplay(form.closeTime)}`;
      const payload = {
        days: formatDaysString(form.selectedDays),
        hours: hoursDisplay,
        sortOrder: nextSortOrder,
      };

      if (editingId) {
        // Keep existing sortOrder on edit
        await updateHours({
          id: editingId as any,
          days: payload.days,
          hours: payload.hours,
        });
        toast.success("Store hours updated");
      } else {
        await createHours(payload);
        toast.success("Store hours added");
      }
      setDialogOpen(false);
      setEditingId(null);
    } catch {
      toast.error(
        editingId ? "Failed to update store hours" : "Failed to add store hours",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeHours({ id: id as any });
      toast.success("Store hours deleted");
      setDeleteConfirmId(null);
    } catch {
      toast.error("Failed to delete store hours");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!storeHours) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= storeHours.length) return;

    const current = storeHours[index];
    const swapWith = storeHours[swapIndex];

    try {
      await Promise.all([
        updateHours({
          id: current._id as any,
          sortOrder: swapWith.sortOrder,
        }),
        updateHours({
          id: swapWith._id as any,
          sortOrder: current.sortOrder,
        }),
      ]);
    } catch {
      toast.error("Failed to reorder");
    }
  };

  if (storeHours === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading store hours...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Store Hours</h1>
          <p className="text-muted-foreground">
            Manage your store's operating hours
          </p>
        </div>
        <Button onClick={openNewDialog}>Add Entry</Button>
      </div>

      {storeHours.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No store hours yet. Add your first entry to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {storeHours.map((entry: any, index: number) => (
            <Card key={entry._id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
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
                      disabled={index === storeHours.length - 1}
                      onClick={() => handleMove(index, "down")}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-lg">{entry.days}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {entry.hours}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(entry)}
                    >
                      Edit
                    </Button>
                    {deleteConfirmId === entry._id ? (
                      <div className="flex gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(entry._id)}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteConfirmId(entry._id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Store Hours" : "Add Store Hours"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Days *</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = form.selectedDays.has(day);
                  const isTaken = takenDays.has(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isTaken}
                      onClick={() => toggleDay(day)}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                        isTaken
                          ? "cursor-not-allowed border-muted bg-muted text-muted-foreground/50 line-through"
                          : isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
              {form.selectedDays.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatDaysString(form.selectedDays)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hours-open">Open Time *</Label>
                <Input
                  id="hours-open"
                  type="time"
                  value={form.openTime}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, openTime: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours-close">Close Time *</Label>
                <Input
                  id="hours-close"
                  type="time"
                  value={form.closeTime}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, closeTime: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? editingId
                    ? "Updating..."
                    : "Adding..."
                  : editingId
                    ? "Update"
                    : "Add Entry"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
