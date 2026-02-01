import { NextRequest, NextResponse } from 'next/server';
import { generateResponse } from "@/lib/ai-service";

export async function POST(request: Request) {
    try {
        const { query, userId } = await request.json();

        if (!userId) {
            return new Response(JSON.stringify({ error: "User ID is required" }), { status: 400 });
        }

        // Call the centralized RAG service
        const aiResponse = await generateResponse(query, userId);

        return new Response(JSON.stringify({
            response: aiResponse
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("DEBUG CRITICAL CATCH: API failed:", error);
        return new Response(JSON.stringify({ error: "API Route Crashed.", details: String(error) }), { status: 500 });
    }
}
