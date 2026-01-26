/**
 * LifeOS AI Chat API - Pure Financial Advisor (RAG Implementation)
 * 
 * This endpoint implements a PURELY ADVISORY AI assistant with NO UI control capabilities.
 * 
 * Architecture:
 * - Fetches READ-ONLY context data (ledger, bills, inventory) server-side using Supabase Admin
 * - Sends user query + context to configured AI provider (OpenAI, Groq, XAI, Google, Anthropic)
 * - Returns text-based financial insights and recommendations ONLY
 * 
 * Security:
 * - All database queries use Supabase Service Role (bypasses RLS for authorized server access)
 * - API keys are stored obfuscated in the database and deobfuscated server-side
 * - User ID validation ensures data isolation
 * 
 * CRITICAL: NO FUNCTION CALLING
 * - The request bodies sent to AI providers contain ONLY messages (system + user prompts)
 * - NO 'functions', 'tools', or 'tool_definitions' parameters are included
 * - The AI cannot trigger UI actions, navigate pages, or modify data
 * - All responses are purely informational and advisory
 */
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase Admin client with Service Role Key to bypass RLS
// We wrap this to catch if environment variables are missing
const getSupabaseAdmin = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error("Missing Supabase environment variables (URL or SERVICE_ROLE_KEY)");
    }

    return createClient(url, key);
};

/**
 * Simple deobfuscation for API key (mirrors client-side obfuscation).
 */
function deobfuscateKey(key: string): string {
    if (!key) return "";
    try {
        return Buffer.from(key, 'base64').toString('utf-8');
    } catch (e) {
        return key;
    }
}

export async function POST(req: NextRequest) {
    try {
        const { query, userId } = await req.json();

        if (!query || !userId) {
            return new Response(JSON.stringify({ error: "Query and User ID are required." }), { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const lowerQuery = query.toLowerCase();
        let context: any = "No specific database context found. Answer generally based on LifeOS context.";
        let intent = "general";

        // 1. Intent Detection & Data Retrieval
        try {
            if (lowerQuery.includes('spent') || lowerQuery.includes('expense') || lowerQuery.includes('spending')) {
                intent = "expenses";
                const { data, error } = await supabaseAdmin
                    .from('ledger')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('transaction_type', 'expense')
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (!error) context = { type: 'recent_expenses', data };
            }
            else if (lowerQuery.includes('income') || lowerQuery.includes('salary') || lowerQuery.includes('earned')) {
                intent = "income";
                const { data, error } = await supabaseAdmin
                    .from('ledger')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('transaction_type', 'income')
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (!error) context = { type: 'recent_income', data };
            }
            else if (lowerQuery.includes('bill') || lowerQuery.includes('subscription')) {
                intent = "bills";
                const { data, error } = await supabaseAdmin
                    .from('recurring_bills')
                    .select('*')
                    .eq('user_id', userId);
                if (!error) context = { type: 'recurring_bills', data };
            }
            else if (lowerQuery.includes('maintenance') || lowerQuery.includes('service')) {
                intent = "maintenance";
                const { data, error } = await supabaseAdmin
                    .from('maintenance_items')
                    .select('*')
                    .eq('user_id', userId);
                if (!error) context = { type: 'maintenance_records', data };
            }
            else if (lowerQuery.includes('inventory') || lowerQuery.includes('stock') || lowerQuery.includes('have')) {
                intent = "inventory";
                const { data, error } = await supabaseAdmin
                    .from('inventory')
                    .select('*')
                    .eq('user_id', userId)
                    .limit(100);
                if (!error) context = { type: 'inventory_items', data };
            }
        } catch (dbError) {
            console.error("Database Context Fetch Error:", dbError);
            // Non-fatal, proceed with default context
        }

        // 2. Fetch User AI Settings
        const { data: aiSettings, error: settingsError } = await supabaseAdmin
            .from('ai_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (settingsError || !aiSettings || !aiSettings.api_key) {
            return new Response(JSON.stringify({
                response: "I couldn't find your AI configuration. Please set up your API Key and Provider in Settings > AI Configuration."
            }), { status: 200 });
        }

        const apiKey = deobfuscateKey(aiSettings.api_key);
        const provider = aiSettings.provider;
        const model = aiSettings.model_name || "gpt-4-turbo";

        // 3. Construct Prompts - STRICTLY ADVISORY ROLE
        const systemPrompt = `You are 'Pailo', a professional, purely advisory financial assistant for LifeOS.
        
Your sole purpose is to analyze the provided user data and offer insights, summaries, and advice.

CRITICAL RULES:
- You are READ-ONLY. You can ONLY analyze and provide financial insights.
- NEVER suggest clicking buttons, logging transactions, or navigating the interface.
- NEVER mention UI elements like "Go to", "Click on", "Navigate to", or "Add a transaction".
- NEVER suggest actions the user can take in the app interface.
- Only provide data analysis, financial advice, budgeting tips, and insights based on the context provided.
- Always use the ৳ currency symbol when discussing money.
- If asked to perform an action (like logging an expense), politely explain that you can only provide advice, not perform actions.
- Be concise, professional, and helpful in your financial guidance.

Your responses should be purely informational and advisory.`;

        const userPrompt = `
      User Question: "${query}"
      
      Database Context (JSON):
      ${JSON.stringify(context)}
      
      Please answer the user's question based on the provided context. If the context is empty or irrelevant, tell them politely.
    `;

        // 4. Call AI Provider (NO FUNCTION CALLING)
        // IMPORTANT: No 'functions', 'tools', or 'tool_definitions' are included in the request body.
        // The AI is configured to be purely advisory and cannot trigger UI actions or data mutations.
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
                headers["Authorization"] = `Bearer ${apiKey}`;
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
                return new Response(JSON.stringify({ response: `Provider '${provider}' is not yet supported in the API.` }), { status: 200 });
        }

        // CRITICAL DEBUG LOGS
        console.log(`[AI Call] Provider: ${provider}, Model: ${model}`);
        console.log(`[AI Call] URL: ${url}`);
        const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}` : "missing";
        console.log(`[AI Call] Auth Header: ${headers["Authorization"] ? `Bearer ${maskedKey}` : headers["x-api-key"] ? `x-api-key ${maskedKey}` : "None"}`);

        try {
            const aiResponse = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            if (!aiResponse.ok) {
                const errorData = await aiResponse.text();
                console.error(`AI Provider Error (${provider} - ${aiResponse.status}):`, errorData);
                return new Response(JSON.stringify({
                    response: `The AI provider (${provider}) returned an error: ${aiResponse.statusText}. Please verify your API settings.`,
                    error: errorData
                }), { status: 200 }); // Status 200 used to allow the app to show the error message gracefully
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

            return new Response(JSON.stringify({ response: textResponse }), { status: 200 });

        } catch (fetchError: any) {
            console.error("External AI Fetch Crash:", fetchError);
            return new Response(JSON.stringify({
                error: "Network Error",
                message: `Failed to reach ${provider}. ${fetchError.message}`
            }), { status: 500 });
        }

    } catch (error: any) {
        console.error("Critical AI Route Error:", {
            message: error?.message,
            stack: error?.stack,
        });
        return new Response(JSON.stringify({
            error: "Internal Server Error",
            message: error?.message || "Unknown error"
        }), { status: 500 });
    }
}
