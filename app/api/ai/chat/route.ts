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

export async function POST(request: Request) {
    try {
        const { query, userId } = await request.json();
        console.log("DEBUG: Received query:", query, "from user:", userId);

        // TEMPORARY: Return a hardcoded success message immediately.
        return new Response(JSON.stringify({
            text: "AI is currently in DEBUG mode. Query received successfully.",
            debugStatus: "SUCCESS - RAG Bypassed"
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("DEBUG CRITICAL CATCH: API failed before RAG:", error);
        return new Response(JSON.stringify({ error: "API Route Crashed before RAG." }), { status: 500 });
    }
}
