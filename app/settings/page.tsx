"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, Shield, Clock, Trash2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { haptics } from "@/lib/haptics";

export default function SettingsPage() {
  const [hideBalanceDefault, setHideBalanceDefault] = useState(false);
  const [blockScreenshots, setBlockScreenshots] = useState(false);
  const [autoHidePublic, setAutoHidePublic] = useState(false);
  const { setTheme, theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    // Load preferences
    setHideBalanceDefault(localStorage.getItem("hideBalanceDefault") === "true");
    setBlockScreenshots(localStorage.getItem("blockScreenshots") === "true");
    setAutoHidePublic(localStorage.getItem("autoHidePublic") === "true");
  }, []);

  const updatePreference = (key: string, value: boolean) => {
    localStorage.setItem(key, String(value));
    haptics.selection();
  };

  const handleClearCache = async () => {
    if (confirm("Are you sure? This will sign you out and clear all local data.")) {
      haptics.warning();
      localStorage.clear();
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    }
  };

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Privacy Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Control how your financial data is displayed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Hide Balance by Default */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="hide-balance" className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  Hide balance on launch
                </Label>
                <p className="text-xs text-muted-foreground">
                  Balance will be masked when app opens
                </p>
              </div>
              <Switch
                id="hide-balance"
                checked={hideBalanceDefault}
                onCheckedChange={(checked) => {
                  setHideBalanceDefault(checked);
                  updatePreference("hideBalanceDefault", checked);
                }}
              />
            </div>

            {/* Block Screenshots (Mock) */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="block-screenshots"
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Block screenshots
                </Label>
                <p className="text-xs text-muted-foreground">
                  Prevent capture on sensitive screens
                </p>
              </div>
              <Switch
                id="block-screenshots"
                checked={blockScreenshots}
                onCheckedChange={(checked) => {
                  setBlockScreenshots(checked);
                  updatePreference("blockScreenshots", checked);
                }}
              />
            </div>

            {/* Auto-Hide in Public */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-hide" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Commute Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Auto-mask 8-9 AM & 5-7 PM
                </p>
              </div>
              <Switch
                id="auto-hide"
                checked={autoHidePublic}
                onCheckedChange={(checked) => {
                  setAutoHidePublic(checked);
                  updatePreference("autoHidePublic", checked);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="theme">App Theme</Label>
              <Select value={theme} onValueChange={(val) => { setTheme(val); haptics.selection(); }}>
                <SelectTrigger className="w-[140px]" id="theme">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleClearCache}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out & Clear Data
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Removes offline cache and logs you out.
            </p>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}
