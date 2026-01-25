import { createClient } from "@/lib/supabase/client";

export interface CurrencySettings {
  currencySymbol: string;
  currencyCode: string;
}

export interface AiSettings {
  provider: string;
  apiKey: string;
  model: string;
}

const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: "OpenAI",
  apiKey: "",
  model: "gpt-4-turbo",
};

export const AI_MODELS: Record<string, string[]> = {
  OpenAI: [
    'gpt-5.2',
    'gpt-5.2-pro',
    'gpt-5-mini',
    'gpt-5-nano',
    'o3-pro',
    'o4-mini',
    'gpt-5',
    'gpt-4.5-preview',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-oss-120b',
    'gpt-oss-20b',
  ],
  Google: [
    'gemini-3-pro',
    'gemini-3-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-pro',
    'gemini-2.0-flash',
    'gemini-live-2.5-flash-native-audio',
  ],
  Anthropic: [
    'claude-3.5-sonnet',
    'claude-opus-4.5',
    'claude-opus-4',
    'claude-sonnet-4',
    'claude-3-opus',
    'claude-3-haiku',
    'claude-3-sonnet',
  ],
  Groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gpt-oss-120b',
    'gpt-oss-20b',
    'compoundgroq/compound',
    'compound-minigroq/compound-mini',
  ],
  XAI: [
    'grok-4.2',
    'grok-4.1',
    'grok-4.0',
  ],
};

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
 * Simple obfuscation for API key (Client-side deterrent only).
 */
function obfuscateApiKey(key: string): string {
  if (!key) return "";
  try {
    return btoa(key);
  } catch (e) {
    return key;
  }
}

function deobfuscateApiKey(key: string): string {
  if (!key) return "";
  try {
    return atob(key);
  } catch (e) {
    return key;
  }
}

/**
 * Fetches AI settings from Supabase ai_settings table.
 */
export async function fetchAiSettings(): Promise<AiSettings> {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return DEFAULT_AI_SETTINGS;

    const { data, error } = await supabase
      .from("ai_settings")
      .select("provider, api_key, model_name")
      .eq("user_id", user.id)
      .single();

    if (error || !data) return DEFAULT_AI_SETTINGS;

    return {
      provider: data.provider || DEFAULT_AI_SETTINGS.provider,
      apiKey: deobfuscateApiKey(data.api_key || ""),
      model: data.model_name || DEFAULT_AI_SETTINGS.model,
    };
  } catch (error) {
    console.error("AI Settings Error:", JSON.stringify(error, null, 2));
    return DEFAULT_AI_SETTINGS;
  }
}

/**
 * Saves AI settings to Supabase ai_settings table.
 */
export async function saveAiSettings(
  provider: string,
  apiKey: string,
  model: string
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

    const { error } = await supabase
      .from("ai_settings")
      .upsert(
        {
          user_id: user.id,
          provider,
          api_key: obfuscateApiKey(apiKey),
          model_name: model,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("AI Settings Error:", JSON.stringify(error, null, 2));
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("AI Settings Error:", JSON.stringify(error, null, 2));
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
