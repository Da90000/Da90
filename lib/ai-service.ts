"use server";

import { createClient } from "@supabase/supabase-js";

/**
 * AI Service - Specialized Financial Advisor RAG Pipeline
 * 
 * This service implements the core RAG logic for the LifeOS AI Assistant.
 * It is responsible for:
 * 1. Fetching comprehensive context data (Ledger, Bills, Maintenance)
 * 2. Orchestrating the AI prompt with strict advisory guardrails
 * 3. Communicating with various AI providers (OpenAI, Groq, etc.)
 */

// Initialize Supabase Admin client with Service Role Key to bypass RLS
const getSupabaseAdmin = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error("Missing Supabase environment variables (URL or SERVICE_ROLE_KEY)");
    }

    return createClient(url, key);
};

/**
 * Simple deobfuscation for API key.
 */
function deobfuscateKey(key: string): string {
    if (!key) return "";
    try {
        return Buffer.from(key, 'base64').toString('utf-8');
    } catch (e) {
        return key;
    }
}

/**
 * 1. Unified Data Fetching (The Gatekeeper Logic)
 * Fetches all relevant, read-only data for the user in parallel.
 */
export async function fetchContextData(userId: string) {
    const supabaseAdmin = getSupabaseAdmin();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [ledger, bills, maintenance] = await Promise.all([
        supabaseAdmin
            .from('ledger')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', sixMonthsAgo.toISOString())
            .order('created_at', { ascending: false }),
        supabaseAdmin
            .from('recurring_bills')
            .select('*')
            .eq('user_id', userId),
        supabaseAdmin
            .from('maintenance_items')
            .select('*')
            .eq('user_id', userId)
    ]);

    return {
        ledger: ledger.data || [],
        bills: bills.data || [],
        maintenance: maintenance.data || []
    };
}

/**
 * 2. The Prompt Orchestrator (generateResponse logic)
 * Constructs the RAG prompt and calls the AI provider.
 */
export async function generateResponse(userQuery: string, userId: string): Promise<string> {
    try {
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Fetch Context Data
        const contextData = await fetchContextData(userId);

        // 2. Fetch User AI Settings
        const { data: aiSettings, error: settingsError } = await supabaseAdmin
            .from('ai_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (settingsError || !aiSettings || !aiSettings.api_key) {
            return "I couldn't find your AI configuration. Please set up your API Key and Provider in Settings > AI Configuration.";
        }

        const apiKey = deobfuscateKey(aiSettings.api_key);
        const provider = aiSettings.provider;
        const model = aiSettings.model_name || "gpt-4-turbo";

        // 3. Prompt Construction - Specialized Financial Advisor Persona
        const systemPrompt = `You are a Specialized Financial Advisor for LifeOS. Your sole purpose is to analyze the provided user data and offer insights, balance summaries, trends, and maintenance recommendations. 

STRICT ADVISORY RULES:
- NEVER suggest UI actions, button clicks, or navigating the user's interface.
- NEVER suggest creating, modifying, or deleting data.
- NEVER suggest logging a transaction or "Add" actions.
- strictly forbid from creating data or performing any system operations.
- Answer all questions using the ৳ currency symbol.
- Base your analysis strictly on the provided JSON data context.`;

        const userPrompt = `The user's question is: "${userQuery}".\n\nANALYZE THIS DATA:\n${JSON.stringify(contextData, null, 2)}`;

        // 4. Call AI Provider
        let url = "";
        let headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        };
        let body: any = {};

        switch (provider) {
            case "OpenAI":
                url = "https://api.openai.com/v1/chat/completions";
                body = {
                    model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.7
                };
                break;

            case "Groq":
                url = "https://api.groq.com/openai/v1/chat/completions";
                body = {
                    model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.7
                };
                break;

            case "XAI":
                url = "https://api.x.ai/v1/chat/completions";
                body = {
                    model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.7
                };
                break;

            case "Google":
                url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                delete headers["Authorization"];
                body = {
                    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
                };
                break;

            case "Anthropic":
                url = "https://api.anthropic.com/v1/messages";
                headers = {
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                };
                delete headers["Authorization"];
                body = {
                    model,
                    max_tokens: 1024,
                    system: systemPrompt,
                    messages: [{ role: "user", content: userPrompt }]
                };
                break;

            default:
                return `Provider '${provider}' is not supported in the current pipeline.`;
        }

        const aiResponse = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body)
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error(`AI Provider Error (${provider}):`, errorText);
            return `I encountered an error from the AI provider (${provider}). Please check your API settings.`;
        }

        const data = await aiResponse.json();
        let textResponse = "No response generated.";

        if (provider === "Google") {
            textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || textResponse;
        } else if (provider === "Anthropic") {
            textResponse = data.content?.[0]?.text || textResponse;
        } else {
            textResponse = data.choices?.[0]?.message?.content || textResponse;
        }

        return textResponse;

    } catch (error) {
        console.error("Critical AI Pipeline Error:", error);
        return "I encountered a problem processing your financial data. Please try again later.";
    }
}

/**
 * AI Service Proxy
 * 
 * This function sends the user's query to the server-side API route.
 * Centralizing the AI logic in the API route allows for robust server-side 
 * logging and secure handling of service role keys.
 */
export async function processUserQuery(query: string, userId: string): Promise<string> {
    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, userId }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("AI Service Error:", errorData);
            return "I encountered a problem reaching the AI server. Please try again.";
        }

        const data = await response.json();
        return data.response || "No response received.";

    } catch (error) {
        console.error("AI Service Proxy Error:", error);
        return "I had trouble reaching the server. Please check your connection.";
    }
}
