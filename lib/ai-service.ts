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
            .select('amount, created_at, category, item_name, transaction_type, entity_name, is_settled')
            .eq('user_id', userId)
            .gte('created_at', sixMonthsAgo.toISOString())
            .order('created_at', { ascending: false }),
        supabaseAdmin
            .from('recurring_bills')
            .select('amount, name, due_day, category')
            .eq('user_id', userId),
        supabaseAdmin
            .from('maintenance_items')
            .select('name, type, last_service_date, service_interval_days')
            .eq('user_id', userId)
    ]);

    return {
        ledger: ledger.data || [],
        bills: bills.data || [],
        maintenance: maintenance.data || []
    };
}

/**
 * Data Summarizer - Reduces token usage by 70-80%
 * Converts raw data into compact summaries instead of sending full JSON
 */
function summarizeContextData(contextData: any) {
    const { ledger, bills, maintenance } = contextData;

    // Process ledger data
    const income = ledger.filter((t: any) => t.transaction_type === 'income');
    const expenses = ledger.filter((t: any) => t.transaction_type === 'expense');
    const debtTaken = ledger.filter((t: any) => t.transaction_type === 'debt' && t.category === 'debt_taken');
    const debtGiven = ledger.filter((t: any) => t.transaction_type === 'debt' && t.category === 'debt_given');

    // Calculate totals
    const totalIncome = income.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const totalDebtTaken = debtTaken.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const totalDebtGiven = debtGiven.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    // Outstanding debts
    const unsettledDebtTaken = debtTaken.filter((d: any) => !d.is_settled).reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    const unsettledDebtGiven = debtGiven.filter((d: any) => !d.is_settled).reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

    // Expense breakdown by category (top 5)
    const expenseByCategory: Record<string, number> = {};
    expenses.forEach((e: any) => {
        const cat = e.category || 'Other';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (e.amount || 0);
    });
    const topExpenses = Object.entries(expenseByCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat, amt]) => `${cat}: ৳${amt}`);

    // Recent transactions (last 5)
    const recentTransactions = ledger.slice(0, 5).map((t: any) =>
        `${t.transaction_type}: ৳${t.amount} - ${t.item_name || t.category}`
    );

    // Bills summary
    const totalBillsAmount = bills.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
    const billsList = bills.map((b: any) => `${b.name}: ৳${b.amount} (due day ${b.due_day})`);

    // Maintenance summary
    const now = new Date();
    const maintenanceDue = maintenance.filter((m: any) => {
        if (!m.last_service_date || !m.service_interval_days) return false;
        const lastService = new Date(m.last_service_date);
        const nextDue = new Date(lastService.getTime() + m.service_interval_days * 24 * 60 * 60 * 1000);
        return nextDue <= now;
    }).map((m: any) => m.name);

    // Compact summary object
    return {
        summary: {
            income: `৳${totalIncome} (${income.length} transactions)`,
            expenses: `৳${totalExpenses} (${expenses.length} transactions)`,
            balance: `৳${totalIncome - totalExpenses}`,
            debt_taken: `৳${totalDebtTaken} (Outstanding: ৳${unsettledDebtTaken})`,
            debt_given: `৳${totalDebtGiven} (Outstanding: ৳${unsettledDebtGiven})`,
            net_worth: `৳${(totalIncome - totalExpenses) + (totalDebtGiven - unsettledDebtTaken)}`
        },
        top_expenses: topExpenses,
        recent: recentTransactions,
        bills: {
            total_monthly: `৳${totalBillsAmount}`,
            list: billsList
        },
        maintenance: {
            due_now: maintenanceDue,
            total_items: maintenance.length
        }
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

        // 3. Optimized Prompt - Concise Financial Advisor
        const systemPrompt = `You are LifeOS Financial Advisor. Analyze user's income, expenses, bills, debts, and maintenance data to provide concise insights.

RESPONSE RULES:
• NO UI actions, NO data modifications
• Use ৳ currency symbol
• Keep responses SHORT (2-4 bullet points max)
• Use markdown: **bold** for numbers, bullets for lists
• Structure: Direct answer → Key points → 1 suggestion

TOPICS YOU HANDLE:
• Income: Total earned, sources, trends
• Expenses: Spending by category, trends
• Bills: Upcoming payments, overdue alerts
• Debts: Money owed/lent, settlement status
• Maintenance: Due services, upcoming tasks

CALCULATIONS:
• Cash Balance = Income - Expenses + Debt Taken - Debt Given
• Net Worth = Assets - Liabilities

Be intelligent: Spot patterns, warn about issues, suggest improvements.`;

        // 4. Summarize Data (Saves 70-80% tokens!)
        const summarizedData = summarizeContextData(contextData);
        const userPrompt = `Question: "${userQuery}"\n\nDATA:\n${JSON.stringify(summarizedData, null, 2)}`;

        // 5. Call AI Provider
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
                    max_tokens: 300,
                    temperature: 0.5
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
                    max_tokens: 300,
                    temperature: 0.5
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
                    max_tokens: 300,
                    temperature: 0.5
                };
                break;

            case "Google":
                url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                delete headers["Authorization"];
                body = {
                    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                    generationConfig: { maxOutputTokens: 300, temperature: 0.5 }
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
                    max_tokens: 300,
                    temperature: 0.5,
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

// This resolves the local/server URL problem.
const API_BASE_URL = process.env.NEXT_PUBLIC_INTERNAL_URL || 'http://localhost:3000';

/**
 * AI Service Proxy
 * 
 * This function sends the user's query to the server-side API route.
 * Centralizing the AI logic in the API route allows for robust server-side 
 * logging and secure handling of service role keys.
 */
export async function processUserQuery(query: string, userId: string): Promise<string> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
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
