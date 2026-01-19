"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/contexts/currency-context";
import { CURRENCIES } from "@/lib/settings-store";

export function SettingsView() {
  const router = useRouter();
  const supabase = createClient();
  const { currencySymbol, currencyCode, updateCurrency: updateCurrencySettings } = useCurrency();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [updatingCurrency, setUpdatingCurrency] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserEmail(user?.email || null);
        setUserId(user?.id || null);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      // Fetch all data from Supabase tables
      const [inventoryRes, ledgerRes, billsRes, maintenanceRes] = await Promise.all([
        supabase.from("inventory").select("*"),
        supabase.from("ledger").select("*"),
        supabase.from("recurring_bills").select("*"),
        supabase.from("maintenance_items").select("*"),
      ]);

      const backup = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        data: {
          inventory: inventoryRes.data || [],
          ledger: ledgerRes.data || [],
          recurring_bills: billsRes.data || [],
          maintenance_items: maintenanceRes.data || [],
        },
      };

      // Create and download JSON file
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `lifeos-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup exported successfully",
        description: `lifeos-backup-${dateStr}.json has been downloaded.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleCurrencyChange = async (currencyValue: string) => {
    const selectedCurrency = CURRENCIES.find((c) => `${c.code}-${c.symbol}` === currencyValue);
    if (!selectedCurrency) return;

    setUpdatingCurrency(true);
    try {
      const result = await updateCurrencySettings(selectedCurrency.code, selectedCurrency.symbol);
      if (result.success) {
        toast({
          title: "Currency updated",
          description: `Currency changed to ${selectedCurrency.name}`,
        });
        // The context will automatically update, but we can force a reload if needed
        window.location.reload(); // Simple approach - could be optimized with state management
      } else {
        toast({
          title: "Failed to update currency",
          description: result.error instanceof Error ? result.error.message : "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to update currency",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUpdatingCurrency(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and data</p>
      </div>

      {/* Account Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account Profile</CardTitle>
          <CardDescription>Your account information and authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-6 w-64 mb-4" />
              <Skeleton className="h-5 w-96" />
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Signed in as:</p>
                <p className="text-base font-medium text-foreground">{userEmail || "Not available"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">User ID:</p>
                <p className="text-sm font-mono text-muted-foreground break-all">{userId || "Not available"}</p>
              </div>
            </div>
          )}
          <Button
            variant="destructive"
            size="lg"
            onClick={handleSignOut}
            className="w-full sm:w-auto"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Regional Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Settings</CardTitle>
          <CardDescription>Customize currency and regional preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency-select">Currency</Label>
            <Select
              value={`${currencyCode}-${currencySymbol}`}
              onValueChange={handleCurrencyChange}
              disabled={updatingCurrency}
            >
              <SelectTrigger id="currency-select" className="w-full sm:w-[300px]">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={`${currency.code}-${currency.symbol}`}>
                    {currency.symbol} {currency.name} ({currency.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {updatingCurrency && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating currency...
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Management Section */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Backup your LifeOS data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Export all your data (inventory, ledger, bills, and maintenance items) as a JSON file.
              This ensures you own your data and can restore it if needed.
            </p>
            <Button
              variant="outline"
              size="lg"
              onClick={handleExportData}
              disabled={exporting}
              className="w-full sm:w-auto"
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export All Data (JSON)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
