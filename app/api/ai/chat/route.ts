import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: Request) {
    try {
        const { query, userId } = await request.json();
        console.log("DEBUG: Received query:", query, "from user:", userId);

        if (!userId) {
            return new Response(JSON.stringify({ error: "User ID is required" }), { status: 400 });
        }

        // Initialize Supabase Client
        const supabase = getSupabaseAdmin();

        // Securely fetch all ledger data for the user
        // Note: We use the admin client to bypass possible RLS issues for this debug step, 
        // but we EXPLICITLY filter by user_id to ensure data safety.
        const { data: ledgerData, error: dbError } = await supabase
            .from("ledger")
            .select("*")
            .eq("user_id", userId);

        if (dbError) {
            console.error("SUPABASE FETCH FAILED:", dbError);
            return new Response(JSON.stringify({ error: "DB Fetch Error: Check RLS policy or Table Permissions.", details: dbError }), { status: 500 });
        }

        // Test Return: Return the fetched data immediately.
        return new Response(JSON.stringify({
            text: "Data Fetch Successful. Ready for AI.",
            debug_data: ledgerData,
            count: ledgerData?.length || 0
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("DEBUG CRITICAL CATCH: API failed during DB Fetch:", error);
        return new Response(JSON.stringify({ error: "API Route Crashed during DB Fetch.", details: String(error) }), { status: 500 });
    }
}
