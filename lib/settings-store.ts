import { createClient } from "@/lib/supabase/client";

export interface CurrencySettings {
  currencySymbol: string;
  currencyCode: string;
}

const DEFAULT_CURRENCY: CurrencySettings = {
  currencySymbol: "৳",
  currencyCode: "BDT",
};

// Currency definitions
export const CURRENCIES = [
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
] as const;

/**
 * Fetches currency settings from Supabase user_settings table.
 * Falls back to default if not found or on error.
 */
export async function fetchCurrencySettings(): Promise<CurrencySettings> {
  if (typeof window === "undefined") {
    return DEFAULT_CURRENCY;
  }

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return DEFAULT_CURRENCY;
    }

    const { data, error } = await supabase
      .from("user_settings")
      .select("currency_symbol, currency_code")
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      // If no settings found, return default and optionally create a record
      return DEFAULT_CURRENCY;
    }

    return {
      currencySymbol: data.currency_symbol || DEFAULT_CURRENCY.currencySymbol,
      currencyCode: data.currency_code || DEFAULT_CURRENCY.currencyCode,
    };
  } catch (error) {
    console.error("Failed to fetch currency settings:", error);
    return DEFAULT_CURRENCY;
  }
}

/**
 * Updates currency settings in Supabase user_settings table.
 * Creates a new record if one doesn't exist, updates if it does.
 */
export async function updateCurrency(
  code: string,
  symbol: string
): Promise<{ success: boolean; error: unknown }> {
  if (typeof window === "undefined") {
    return { success: false, error: new Error("Not in browser context") };
  }

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: new Error("User not authenticated") };
    }

    // Use upsert to create or update
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          currency_symbol: symbol,
          currency_code: code,
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Formats a price amount with the currency symbol.
 * @param amount - The numeric amount to format
 * @returns Formatted string like "৳123.45"
 */
export function formatPrice(amount: number): string {
  // This will be enhanced with a hook/context in components
  // For now, return with default currency
  return `${DEFAULT_CURRENCY.currencySymbol}${amount.toFixed(2)}`;
}

/**
 * React hook to use currency settings in components.
 * Returns currency symbol and formatPrice function.
 */
export function useCurrency() {
  // This is a simplified version - in practice, you'd use React Context
  // or a state management library. For now, components will call fetchCurrencySettings
  // and manage state locally, or we'll create a Context Provider.
  return {
    formatPrice: (amount: number, symbol?: string) => {
      const sym = symbol || DEFAULT_CURRENCY.currencySymbol;
      return `${sym}${amount.toFixed(2)}`;
    },
    currencySymbol: DEFAULT_CURRENCY.currencySymbol,
    currencyCode: DEFAULT_CURRENCY.currencyCode,
  };
}
