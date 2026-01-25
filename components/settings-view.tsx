"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Download, Loader2, Monitor, Moon, Sun, Brain } from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/contexts/currency-context";
import { CURRENCIES, fetchAiSettings, saveAiSettings, AI_MODELS } from "@/lib/settings-store";

export function SettingsView() {
  const router = useRouter();
  const supabase = createClient();
  const { currencySymbol, currencyCode, updateCurrency: updateCurrencySettings } = useCurrency();
  const { setTheme, theme } = useTheme();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [updatingCurrency, setUpdatingCurrency] = useState(false);
  const [aiProvider, setAiProvider] = useState("OpenAI");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4-turbo");
  const [savingAi, setSavingAi] = useState(false);
  const [loadingAi, setLoadingAi] = useState(true);

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

  useEffect(() => {
    const loadAiSettings = async () => {
      try {
        const settings = await fetchAiSettings();
        setAiProvider(settings.provider);
        setApiKey(settings.apiKey);
        setModel(settings.model);
      } catch (error) {
        console.error("Failed to load AI settings:", error);
      } finally {
        setLoadingAi(false);
      }
    };
    loadAiSettings();
  }, []);

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

  const handleProviderChange = (value: string) => {
    setAiProvider(value);
    const models = AI_MODELS[value];
    if (models && models.length > 0) {
      setModel(models[0]);
    }
  };

  const handleSaveAiSettings = async () => {
    setSavingAi(true);
    try {
      const result = await saveAiSettings(aiProvider, apiKey, model);
      if (result.success) {
        toast({
          title: "Settings saved",
          description: "AI assistant configuration updated successfully.",
        });
      } else {
        toast({
          title: "Failed to save settings",
          description: (result.error as any)?.message || String(result.error),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to save settings",
        description: (error as any)?.message || String(error),
        variant: "destructive",
      });
    } finally {
      setSavingAi(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-24">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <h2 className="text-muted-foreground text-lg">Manage your account and data</h2>
      </div>

      {/* Account Profile Section */}
      <Card className="bg-card rounded-2xl border border-border shadow-sm py-6">
        <CardHeader>
          <CardTitle>Account Profile</CardTitle>
          <CardDescription>Your account information and authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
            variant="outline"
            size="lg"
            onClick={handleSignOut}
            className="w-full sm:w-auto hover:bg-red-50 hover:text-red-600 hover:border-red-300"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card className="bg-card rounded-2xl border border-border shadow-sm py-6">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-1 rounded-full inline-flex gap-1">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${theme === "light"
                ? "bg-background text-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Sun className="h-4 w-4" />
              <span>Light</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${theme === "dark"
                ? "bg-background text-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Moon className="h-4 w-4" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${theme === "system"
                ? "bg-background text-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Monitor className="h-4 w-4" />
              <span>System</span>
            </button>
          </div>
        </CardContent>
      </Card>


      {/* AI Assistant Settings Section */}
      <Card className="bg-card rounded-2xl border border-border shadow-sm py-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-emerald-600" />
            AI Configuration
          </CardTitle>
          <CardDescription>Configure your preferred AI provider and model</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingAi ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="ai-provider">Provider</Label>
                <Select value={aiProvider} onValueChange={handleProviderChange}>
                  <SelectTrigger id="ai-provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(AI_MODELS).map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your key is stored securely on your device (client-side encryption).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-select">Model Name</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="model-select">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {(AI_MODELS[aiProvider] || []).map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSaveAiSettings}
                disabled={savingAi}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingAi ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Regional Settings Section */}
      <Card className="bg-card rounded-2xl border border-border shadow-sm py-6">
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
      <Card className="bg-card rounded-2xl border border-border shadow-sm py-6">
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
              variant="secondary"
              size="lg"
              onClick={handleExportData}
              disabled={exporting}
              className="w-full sm:w-auto border border-border"
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
