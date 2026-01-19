import { supabase } from "@/lib/supabase";

export interface MaintenanceItem {
  id: string;
  name: string;
  type: "vehicle" | "appliance";
  last_service_date: string;
  service_interval_days: number;
  notes?: string;
}

/**
 * dueDate = lastServiceDate + serviceIntervalDays
 * result = (today - dueDate) in whole days. If result > 0 it is overdue.
 * If lastServiceDate is invalid, return 0.
 */
function toDateString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v instanceof Date) return v.toISOString();
  return String(v);
}

export function getDaysOverdue(
  lastServiceDate: string,
  serviceIntervalDays: number
): number {
  const last = new Date(lastServiceDate);
  if (Number.isNaN(last.getTime())) return 0;
  const due = new Date(last);
  due.setDate(due.getDate() + serviceIntervalDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - due.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Fetches all rows from maintenance_items, ordered by last_service_date ascending.
 * Returns empty array on error.
 */
export async function fetchMaintenanceItems(): Promise<MaintenanceItem[]> {
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping fetch.");
    return [];
  }

  const { data, error } = await supabase
    .from("maintenance_items")
    .select("id, name, type, last_service_date, service_interval_days, notes")
    .order("last_service_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Supabase maintenance_items fetch error:", error);
    return [];
  }
  if (!data) return [];

  return data.map((row: Record<string, unknown>) => {
    const t = row.type;
    const type: "vehicle" | "appliance" =
      t === "vehicle" || t === "appliance" ? t : "vehicle";
    return {
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      type,
      last_service_date: toDateString(row.last_service_date),
      service_interval_days: Number(row.service_interval_days) || 0,
      ...(row.notes != null && String(row.notes) !== "" && { notes: String(row.notes) }),
    };
  }) as MaintenanceItem[];
}

/**
 * Inserts a new row into maintenance_items.
 * Returns the created MaintenanceItem or null if failed.
 */
export async function addMaintenanceItem(
  item: Omit<MaintenanceItem, "id" | "created_at">
): Promise<MaintenanceItem | null> {
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping insert.");
    return null;
  }

  const id = crypto.randomUUID();
  const payload = {
    id,
    name: item.name,
    type: item.type,
    last_service_date: item.last_service_date,
    service_interval_days: item.service_interval_days,
    notes: item.notes ?? "",
  };

  const { data, error } = await supabase
    .from("maintenance_items")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Supabase maintenance_items insert error:", error);
    return null;
  }
  if (!data) return null;

  const t = data.type;
  const type: "vehicle" | "appliance" =
    t === "vehicle" || t === "appliance" ? t : "vehicle";
  return {
    id: String(data.id),
    name: String(data.name),
    type,
    last_service_date: String(data.last_service_date),
    service_interval_days: Number(data.service_interval_days) || 0,
    ...(data.notes != null && String(data.notes) !== "" && { notes: String(data.notes) }),
  } as MaintenanceItem;
}

/**
 * Logs a service and updates last_service_date.
 * 1) Inserts into maintenance_logs (item_id, service_date, optional cost).
 * 2) Updates maintenance_items.last_service_date to the new date.
 * Pass date as ISO (e.g. new Date().toISOString()). Returns true only if both succeed.
 */
export async function updateServiceDate(
  id: string,
  date: string,
  cost?: number
): Promise<boolean> {
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping update.");
    return false;
  }

  // 1) Insert into maintenance_logs
  const logPayload: Record<string, unknown> = {
    item_id: id,
    service_date: date,
  };
  logPayload.cost = cost != null && Number.isFinite(cost) ? cost : 0;

  const { error: logError } = await supabase.from("maintenance_logs").insert(logPayload);
  if (logError) {
    console.error("Maintenance log insert error:", logError);
    return false;
  }

  // 2) Update maintenance_items.last_service_date
  const { error: updateError } = await supabase
    .from("maintenance_items")
    .update({ last_service_date: date })
    .eq("id", id);

  if (updateError) {
    console.error("Supabase maintenance_items updateServiceDate error:", updateError);
    return false;
  }
  return true;
}

/**
 * Updates an existing maintenance item. Only provided fields are updated.
 * Allowed: name, type, last_service_date, service_interval_days, notes.
 * Returns true on success. Call fetchMaintenanceItems() after to refresh the list.
 */
export async function updateMaintenanceItem(
  id: string,
  updates: Partial<Pick<MaintenanceItem, "name" | "type" | "last_service_date" | "service_interval_days" | "notes">>
): Promise<boolean> {
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping update.");
    return false;
  }
  const payload: Record<string, unknown> = {};
  if (updates.name != null) payload.name = updates.name;
  if (updates.type != null) payload.type = updates.type;
  if (updates.last_service_date != null) payload.last_service_date = updates.last_service_date;
  if (updates.service_interval_days != null) payload.service_interval_days = updates.service_interval_days;
  if (updates.notes != null) payload.notes = updates.notes;
  if (Object.keys(payload).length === 0) return true;

  const { error } = await supabase
    .from("maintenance_items")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("Supabase maintenance_items updateMaintenanceItem error:", error);
    return false;
  }
  return true;
}

/**
 * Deletes a row from maintenance_items. Returns true on success.
 * Call fetchMaintenanceItems() after to refresh the list.
 */
export async function deleteMaintenanceItem(id: string): Promise<boolean> {
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping delete.");
    return false;
  }
  const { error } = await supabase.from("maintenance_items").delete().eq("id", id);
  if (error) {
    console.error("Supabase maintenance_items deleteMaintenanceItem error:", error);
    return false;
  }
  return true;
}
