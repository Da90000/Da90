"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Package, CalendarClock, Wrench } from "lucide-react";
import { format } from "date-fns";
import type { ViewMode, InventoryItem } from "@/lib/types";
import { fetchInventoryFromSupabase } from "@/lib/shopping-store";
import { fetchBills, type BillWithDue } from "@/lib/bills-store";
import { fetchMaintenanceItems, type MaintenanceItem } from "@/lib/maintenance-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  name: string;
  detail: string;
  category: "inventory" | "bills" | "maintenance";
  viewMode: ViewMode;
  icon: typeof Package;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: ViewMode) => void;
}

export function GlobalSearch({ isOpen, onOpenChange, onNavigate }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bills, setBills] = useState<BillWithDue[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch data when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        fetchInventoryFromSupabase(),
        fetchBills(),
        fetchMaintenanceItems(),
      ])
        .then(([inv, bill, maint]) => {
          setInventory(inv);
          setBills(bill);
          setMaintenance(maint);
        })
        .catch((error) => {
          console.error("Failed to fetch search data:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Reset search when closed
      setSearchQuery("");
    }
  }, [isOpen]);

  // Filter and group results
  const results = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const allResults: SearchResult[] = [];

    // Inventory results
    inventory
      .filter((item) => item.name.toLowerCase().includes(query))
      .forEach((item) => {
        allResults.push({
          id: item.id,
          name: item.name,
          detail: `৳${item.basePrice.toFixed(2)}${item.lastPaidPrice ? ` (Last: ৳${item.lastPaidPrice.toFixed(2)})` : ""}`,
          category: "inventory",
          viewMode: "inventory",
          icon: Package,
        });
      });

    // Bills results
    bills
      .filter((bill) => bill.name.toLowerCase().includes(query))
      .forEach((bill) => {
        allResults.push({
          id: bill.id,
          name: bill.name,
          detail: `Due ${format(bill.nextDue, "MMM d")} • ৳${bill.amount.toFixed(2)}`,
          category: "bills",
          viewMode: "bills",
          icon: CalendarClock,
        });
      });

    // Maintenance results
    maintenance
      .filter((item) => item.name.toLowerCase().includes(query))
      .forEach((item) => {
        allResults.push({
          id: item.id,
          name: item.name,
          detail: `${item.type} • Last: ${format(new Date(item.last_service_date), "MMM d, yyyy")}`,
          category: "maintenance",
          viewMode: "maintenance",
          icon: Wrench,
        });
      });

    return allResults;
  }, [searchQuery, inventory, bills, maintenance]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      inventory: [],
      bills: [],
      maintenance: [],
    };

    results.forEach((result) => {
      groups[result.category].push(result);
    });

    return groups;
  }, [results]);

  const handleResultClick = (result: SearchResult) => {
    onNavigate(result.viewMode);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 bg-background/95 backdrop-blur-md border-border/50 shadow-2xl"
        showCloseButton={true}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search your LifeOS</DialogTitle>
        </DialogHeader>
        <div className="border-b border-border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search your LifeOS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : searchQuery.trim() && results.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No results found for "{searchQuery}"
            </div>
          ) : !searchQuery.trim() ? (
            <div className="p-8 text-center text-muted-foreground">
              Start typing to search your inventory, bills, and maintenance items...
            </div>
          ) : (
            <div className="p-2">
              {groupedResults.inventory.length > 0 && (
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    From Inventory
                  </h3>
                  <div className="space-y-1">
                    {groupedResults.inventory.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left",
                          "hover:bg-accent hover:text-accent-foreground",
                          "transition-colors cursor-pointer"
                        )}
                      >
                        <result.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {result.name}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {result.detail}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {groupedResults.bills.length > 0 && (
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    From Bills
                  </h3>
                  <div className="space-y-1">
                    {groupedResults.bills.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left",
                          "hover:bg-accent hover:text-accent-foreground",
                          "transition-colors cursor-pointer"
                        )}
                      >
                        <result.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {result.name}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {result.detail}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {groupedResults.maintenance.length > 0 && (
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    From Maintenance
                  </h3>
                  <div className="space-y-1">
                    {groupedResults.maintenance.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left",
                          "hover:bg-accent hover:text-accent-foreground",
                          "transition-colors cursor-pointer"
                        )}
                      >
                        <result.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {result.name}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {result.detail}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
