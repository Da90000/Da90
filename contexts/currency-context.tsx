"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchCurrencySettings, updateCurrency, type CurrencySettings } from "@/lib/settings-store";
import { createClient } from "@/lib/supabase/client";

interface CurrencyContextType {
  currencySymbol: string;
  currencyCode: string;
  formatPrice: (amount: number) => string;
  updateCurrency: (code: string, symbol: string) => Promise<{ success: boolean; error: unknown }>;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CurrencySettings>({
    currencySymbol: "৳",
    currencyCode: "BDT",
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetched = await fetchCurrencySettings();
      setSettings(fetched);
    } catch (error) {
      console.error("Failed to load currency settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    // Listen for auth state changes to reload settings
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadSettings();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadSettings]);

  const handleUpdateCurrency = useCallback(
    async (code: string, symbol: string): Promise<{ success: boolean; error: unknown }> => {
      const result = await updateCurrency(code, symbol);
      if (result.success) {
        setSettings({ currencySymbol: symbol, currencyCode: code });
      }
      return result;
    },
    []
  );

  const formatPrice = useCallback(
    (amount: number): string => {
      return `${settings.currencySymbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    [settings.currencySymbol]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currencySymbol: settings.currencySymbol,
        currencyCode: settings.currencyCode,
        formatPrice,
        updateCurrency: handleUpdateCurrency,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
