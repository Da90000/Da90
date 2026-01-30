import { NextRequest, NextResponse } from 'next/server';
import { fetchContextData } from '@/lib/ai-service';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client with Service Role Key to bypass RLS
const getSupabaseAdmin = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error("Missing Supabase environment variables (URL or SERVICE_ROLE_KEY)");
    }

    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
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

export async function POST(req: NextRequest) {
    try {
        const { query, userId } = await req.json();

        if (!query || !userId) {
            return new Response(JSON.stringify({ error: "Query and User ID are required." }), { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // 1. Unified Context Fetching (RAG Implementation)
        const contextData = await fetchContextData(userId);

        // Size Check Logging
        console.log("RAG Context Size:", JSON.stringify(contextData).length / 1024, "KB");

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

        // 3. Construct Prompts
        const systemPrompt = `You are a Specialized Financial Advisor for LifeOS. Your sole purpose is to analyze the provided user data and offer insights, balance summaries, trends, and maintenance recommendations. 

STRICT ADVISORY RULES:
- NEVER suggest UI actions, button clicks, or navigating the user's interface.
- NEVER suggest creating, modifying, or deleting data.
- NEVER suggest logging a transaction or "Add" actions.
- strictly forbid from creating data or performing any system operations.
- Answer all questions using the ৳ currency symbol.
- Base your analysis strictly on the provided JSON data context.`;

        const userPrompt = `The user's question is: "${query}".\n\nANALYZE THIS DATA:\n${JSON.stringify(contextData, null, 2)}`;

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
                return new Response(JSON.stringify({ response: `Provider '${provider}' is not supported.` }), { status: 200 });
        }

        const aiResponse = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body)
        });

        if (!aiResponse.ok) {
            const errorData = await aiResponse.text();
            console.error(`AI Provider Error (${provider} - ${aiResponse.status}):`, errorData);
            return new Response(JSON.stringify({
                response: `The AI provider (${provider}) returned an error. Please verify your API settings.`,
                error: errorData
            }), { status: 200 });
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

    } catch (error: any) {
        console.error("AI RAG CRITICAL FAILURE:", error);
        // Log the environment status
        console.error("Debug Context: Service Key Loaded?", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

        return new Response(JSON.stringify({ error: "Internal processing error." }), { status: 500 });
    }
}
