import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/events")({
  component: EventsPage,
});

type GameType = "mtg" | "pokemon" | "yugioh" | "other";

interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  gameType: GameType;
  format: string;
  entryFee: string;
  maxPlayers: string;
}

const emptyForm: EventFormData = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  gameType: "mtg",
  format: "",
  entryFee: "",
  maxPlayers: "",
};

const gameTypeLabels: Record<GameType, string> = {
  mtg: "Magic: The Gathering",
  pokemon: "Pokemon",
  yugioh: "Yu-Gi-Oh!",
  other: "Other",
};

const gameTypeBadgeVariant: Record<GameType, "default" | "secondary" | "outline" | "destructive"> = {
  mtg: "default",
  pokemon: "secondary",
  yugioh: "destructive",
  other: "outline",
};

function timestampToDatetimeLocal(timestamp: number): string {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function datetimeLocalToTimestamp(datetimeLocal: string): number {
  return new Date(datetimeLocal).getTime();
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function EventsPage() {
  const events = useQuery(api.events.list);
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);
  const removeEvent = useMutation(api.events.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openNewDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (event: any) => {
    setEditingId(event._id);
    setForm({
      title: event.title || "",
      description: event.description || "",
      startDate: event.startDate ? timestampToDatetimeLocal(event.startDate) : "",
      endDate: event.endDate ? timestampToDatetimeLocal(event.endDate) : "",
      gameType: event.gameType || "mtg",
      format: event.format || "",
      entryFee: event.entryFee != null ? String(event.entryFee) : "",
      maxPlayers: event.maxPlayers != null ? String(event.maxPlayers) : "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.startDate) {
      toast.error("Start date is required");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || "",
        startDate: datetimeLocalToTimestamp(form.startDate),
        endDate: form.endDate ? datetimeLocalToTimestamp(form.endDate) : datetimeLocalToTimestamp(form.startDate),
        gameType: form.gameType,
        format: form.format.trim() || undefined,
        entryFee: form.entryFee ? Number(form.entryFee) : undefined,
        maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : undefined,
      };

      if (editingId) {
        await updateEvent({ id: editingId as any, ...payload });
        toast.success("Event updated");
      } else {
        await createEvent(payload);
        toast.success("Event created");
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch {
      toast.error(editingId ? "Failed to update event" : "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeEvent({ id: id as any });
      toast.success("Event deleted");
      setDeleteConfirmId(null);
    } catch {
      toast.error("Failed to delete event");
    }
  };

  const updateField = <K extends keyof EventFormData>(key: K, value: EventFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (events === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Manage tournaments, leagues, and events
          </p>
        </div>
        <Button onClick={openNewDialog}>New Event</Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No events yet. Create your first event to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event: any) => (
            <Card key={event._id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={gameTypeBadgeVariant[event.gameType as GameType] || "outline"}>
                        {gameTypeLabels[event.gameType as GameType] || event.gameType}
                      </Badge>
                      {event.format && (
                        <Badge variant="outline">{event.format}</Badge>
                      )}
                      {event.entryFee != null && event.entryFee > 0 && (
                        <Badge variant="secondary">
                          ${Number(event.entryFee).toFixed(2)} entry
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(event)}
                    >
                      Edit
                    </Button>
                    {deleteConfirmId === event._id ? (
                      <div className="flex gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(event._id)}
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
                        onClick={() => setDeleteConfirmId(event._id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium text-foreground">Start:</span>{" "}
                    {formatDateTime(event.startDate)}
                  </p>
                  {event.endDate && (
                    <p>
                      <span className="font-medium text-foreground">End:</span>{" "}
                      {formatDateTime(event.endDate)}
                    </p>
                  )}
                  {event.maxPlayers && (
                    <p>
                      <span className="font-medium text-foreground">Max Players:</span>{" "}
                      {event.maxPlayers}
                    </p>
                  )}
                  {event.description && (
                    <p className="pt-2">{event.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Event" : "New Event"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title *</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Friday Night Magic"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Event details, rules, prizes..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-start">Start Date/Time *</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">End Date/Time</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-game-type">Game Type *</Label>
                <Select
                  value={form.gameType}
                  onValueChange={(value) => updateField("gameType", value as GameType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select game" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtg">Magic: The Gathering</SelectItem>
                    <SelectItem value="pokemon">Pokemon</SelectItem>
                    <SelectItem value="yugioh">Yu-Gi-Oh!</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-format">Format</Label>
                <Input
                  id="event-format"
                  value={form.format}
                  onChange={(e) => updateField("format", e.target.value)}
                  placeholder="Standard, Modern, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-fee">Entry Fee ($)</Label>
                <Input
                  id="event-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.entryFee}
                  onChange={(e) => updateField("entryFee", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-max-players">Max Players</Label>
                <Input
                  id="event-max-players"
                  type="number"
                  min="1"
                  step="1"
                  value={form.maxPlayers}
                  onChange={(e) => updateField("maxPlayers", e.target.value)}
                  placeholder="Unlimited"
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
                    : "Creating..."
                  : editingId
                    ? "Update Event"
                    : "Create Event"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
