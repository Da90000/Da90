"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format, addDays, parseISO } from "date-fns";
import { AlertTriangle, Loader2, MoreVertical, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import {
  addMaintenanceItem,
  deleteMaintenanceItem,
  fetchMaintenanceItems,
  getDaysOverdue,
  updateMaintenanceItem,
  updateServiceDate,
  type MaintenanceItem,
} from "@/lib/maintenance-store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Status = "overdue" | "healthy";

function getStatus(item: MaintenanceItem): Status {
  const days = getDaysOverdue(
    item.last_service_date,
    item.service_interval_days
  );
  return days > 0 ? "overdue" : "healthy";
}

function getProgressPercent(item: MaintenanceItem): number {
  const last = new Date(item.last_service_date);
  if (Number.isNaN(last.getTime())) return 0;
  const interval = Number(item.service_interval_days) || 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  const elapsedMs = today.getTime() - last.getTime();
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  return Math.min(100, Math.max(0, (elapsedDays / interval) * 100));
}

function progressIndicatorClass(status: Status): string {
  return status === "overdue"
    ? "[&_[data-slot=progress-indicator]]:!bg-gradient-to-r [&_[data-slot=progress-indicator]]:!from-rose-500 [&_[data-slot=progress-indicator]]:!to-orange-400"
    : "[&_[data-slot=progress-indicator]]:!bg-gradient-to-r [&_[data-slot=progress-indicator]]:!from-emerald-500 [&_[data-slot=progress-indicator]]:!to-emerald-400";
}

function MaintenanceCard({
  item,
  onMarkServiced,
  onEdit,
  onDelete,
}: {
  item: MaintenanceItem;
  onMarkServiced: (id: string, cost: number, date: string) => Promise<boolean>;
  onEdit: (id: string, updates: Partial<MaintenanceItem>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const status = getStatus(item);
  const progress = getProgressPercent(item);
  const days = getDaysOverdue(item.last_service_date, item.service_interval_days);
  const [costOpen, setCostOpen] = useState(false);
  const [costInput, setCostInput] = useState("");
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().split("T")[0]!);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editType, setEditType] = useState<"vehicle" | "appliance">(item.type);
  const [editInterval, setEditInterval] = useState(String(item.service_interval_days || ""));
  const [editNotes, setEditNotes] = useState(item.notes || "");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // When Log Service dialog opens, default date to today
  useEffect(() => {
    if (costOpen) setServiceDate(new Date().toISOString().split("T")[0]!);
  }, [costOpen]);

  // When Edit dialog opens, prefill from item
  useEffect(() => {
    if (editOpen) {
      setEditName(item.name);
      setEditType(item.type);
      setEditInterval(String(item.service_interval_days || ""));
      setEditNotes(item.notes || "");
    }
  }, [editOpen, item.name, item.type, item.service_interval_days, item.notes]);

  const lastServiceLabel = item.last_service_date
    ? format(new Date(item.last_service_date), "MMM d, yyyy")
    : "—";

  const heroNumber = days > 0 ? days : -days;
  const heroLabel = days > 0 ? "Days overdue" : "Days remaining";

  const handleLogService = async () => {
    const cost = Math.max(0, Number.parseFloat(costInput) || 0);
    const date = serviceDate || new Date().toISOString().split("T")[0]!;
    setSaving(true);
    try {
      const ok = await onMarkServiced(item.id, cost, date);
      if (ok) {
        const nextDue = format(
          addDays(parseISO(date), item.service_interval_days || 0),
          "MMM d, yyyy"
        );
        toast({ title: "Service Logged! Next due date: " + nextDue });
        setCostOpen(false);
        setCostInput("");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = editName.trim();
    if (!name) return;
    setEditSaving(true);
    try {
      const ok = await onEdit(item.id, {
        name,
        type: editType,
        service_interval_days: Math.max(0, Math.floor(Number(editInterval) || 0)),
        notes: editNotes.trim(),
      });
      if (ok) {
        toast({ title: "Item updated" });
        setEditOpen(false);
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteSaving(true);
    try {
      const ok = await onDelete(item.id);
      if (ok) {
        toast({ title: "Item removed" });
        setDeleteOpen(false);
      }
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-card to-card/50 p-5 shadow-sm transition-all hover:shadow-md hover:border-border"
      )}
    >
      {/* Glow line: green (healthy) or red (overdue) */}
      <div
        className={cn(
          "absolute left-0 right-0 top-0 h-1",
          status === "overdue" ? "bg-rose-500/80" : "bg-emerald-500/80"
        )}
      />

      <div className="flex flex-col gap-2">
        {/* Header: Name (left), Badge + More (right) */}
        <div className="flex justify-between items-start gap-2">
          <h3 className="min-w-0 flex-1 truncate font-semibold text-lg tracking-tight text-foreground">
            {item.name}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge
              variant="secondary"
              className="text-[10px] uppercase tracking-wider font-bold opacity-70"
            >
              {item.type}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="More options"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Hero metric: big number + label */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "font-mono text-3xl font-bold tabular-nums",
                status === "overdue" ? "text-rose-500" : "text-emerald-500"
              )}
            >
              {heroNumber}
            </span>
            {status === "overdue" && (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" aria-hidden />
            )}
          </div>
          <p className="text-xs text-muted-foreground">{heroLabel}</p>
        </div>

        {/* Progress bar: bottom of content, gradient indicator */}
        <Progress
          value={progress}
          className={cn(
            "h-2 w-full rounded-full !bg-secondary/50",
            progressIndicatorClass(status)
          )}
        />

        {/* Footer: Last serviced (left), Log Service (right) */}
        <div className="mt-4 flex justify-between items-end">
          <p className="text-[11px] font-medium text-muted-foreground">
            Last serviced: {lastServiceLabel}
          </p>
          <Dialog open={costOpen} onOpenChange={setCostOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                className="h-auto shrink-0 px-2 py-1.5 text-xs font-medium hover:bg-primary/10 hover:text-primary"
                aria-label="Log service"
              >
                <Wrench className="mr-1 h-3.5 w-3.5" />
                Log Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log service</DialogTitle>
                <DialogDescription>Pick the date and optional cost.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="log-date">Service date</Label>
                  <Input
                    id="log-date"
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Amount ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={costInput}
                    onChange={(e) => setCostInput(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCostOpen(false);
                    setCostInput("");
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleLogService} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Log service"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
            <DialogDescription>Update name, type, interval, and notes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Honda Civic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v === "appliance" ? "appliance" : "vehicle")}>
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="appliance">Appliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-interval">Service interval (days)</Label>
              <Input
                id="edit-interval"
                type="number"
                min="1"
                placeholder="e.g. 90"
                value={editInterval}
                onChange={(e) => setEditInterval(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes (optional)</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{item.name}&quot; permanently. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={deleteSaving}
            >
              {deleteSaving ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function MaintenanceTracker() {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addType, setAddType] = useState<"vehicle" | "appliance">("vehicle");
  const [addInterval, setAddInterval] = useState("");
  const [addLastServiceDate, setAddLastServiceDate] = useState(
    () => new Date().toISOString().split("T")[0]!
  );

  const fetch = useCallback(async (silent?: boolean) => {
    if (!silent) setLoading(true);
    const data = await fetchMaintenanceItems();
    setItems(data);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (addOpen) setAddLastServiceDate(new Date().toISOString().split("T")[0]!);
  }, [addOpen]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = getDaysOverdue(a.last_service_date, a.service_interval_days);
      const db = getDaysOverdue(b.last_service_date, b.service_interval_days);
      if (da > 0 && db <= 0) return -1;
      if (da <= 0 && db > 0) return 1;
      if (da > 0 && db > 0) return db - da;
      return 0;
    });
  }, [items]);

  const handleMarkServiced = useCallback(
    async (id: string, cost: number, date: string): Promise<boolean> => {
      const ok = await updateServiceDate(id, date, cost);
      if (ok) {
        const data = await fetchMaintenanceItems();
        setItems(data);
      }
      return ok;
    },
    []
  );

  const handleEdit = useCallback(
    async (id: string, updates: Partial<MaintenanceItem>): Promise<boolean> => {
      const ok = await updateMaintenanceItem(id, updates);
      if (ok) {
        const data = await fetchMaintenanceItems();
        setItems(data);
      }
      return ok;
    },
    []
  );

  const handleDelete = useCallback(async (id: string): Promise<boolean> => {
    const ok = await deleteMaintenanceItem(id);
    if (ok) {
      const data = await fetchMaintenanceItems();
      setItems(data);
    }
    return ok;
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addName.trim();
    const interval = Math.max(0, Math.floor(Number(addInterval) || 0));
    if (!name) return;

    const lastService = addLastServiceDate || new Date().toISOString().split("T")[0]!;
    const created = await addMaintenanceItem({
      name,
      type: addType,
      last_service_date: lastService,
      service_interval_days: interval,
    });

    if (created) {
      setAddName("");
      setAddType("vehicle");
      setAddInterval("");
      setAddLastServiceDate(new Date().toISOString().split("T")[0]!);
      setAddOpen(false);
      fetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Maintenance Tracker
          </h1>
          <p className="text-muted-foreground">
            See what’s healthy and what needs attention
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="m-name">Name</Label>
                <Input
                  id="m-name"
                  placeholder="e.g. Honda Civic"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-type">Type</Label>
                <Select
                  value={addType}
                  onValueChange={(v) =>
                    setAddType(v === "appliance" ? "appliance" : "vehicle")
                  }
                >
                  <SelectTrigger id="m-type" className="w-full bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vehicle">Vehicle</SelectItem>
                    <SelectItem value="appliance">Appliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-interval">Service interval (days)</Label>
                <Input
                  id="m-interval"
                  type="number"
                  min="1"
                  placeholder="e.g. 90"
                  value={addInterval}
                  onChange={(e) => setAddInterval(e.target.value)}
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-last">Last service date</Label>
                <Input
                  id="m-last"
                  type="date"
                  value={addLastServiceDate}
                  onChange={(e) => setAddLastServiceDate(e.target.value)}
                  className="bg-input"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Item</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">No maintenance items yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an item to start tracking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedItems.map((item) => (
            <MaintenanceCard
              key={item.id}
              item={item}
              onMarkServiced={handleMarkServiced}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
