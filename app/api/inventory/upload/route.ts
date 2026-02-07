import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation Schema - Flexible to handle common variations
const itemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    category: z.string().optional().nullable().transform(v => v || "Other"),
    // Accept both common naming conventions
    base_price: z.coerce.number().optional().nullable(),
    basePrice: z.coerce.number().optional().nullable(),
    unit: z.string().optional().nullable().transform(v => v || "pc")
}).transform(data => ({
    name: data.name,
    category: data.category,
    base_price: data.base_price ?? data.basePrice ?? 0,
    unit: data.unit
}));

const inventorySchema = z.union([
    z.array(itemSchema),
    z.object({
        items: z.array(itemSchema)
    }).transform(val => val.items),
    z.object({
        inventory: z.array(itemSchema)
    }).transform(val => val.inventory)
]);

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate User
        // We use the server client to verify the session from cookies
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 2. Parse & Validate Payload
        let json;
        try {
            json = await request.json();
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const validationResult = inventorySchema.safeParse(json);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validationResult.error.format() },
                { status: 400 }
            );
        }

        const items = validationResult.data;

        if (items.length === 0) {
            return NextResponse.json({ success: true, insertedCount: 0, updatedCount: 0 });
        }

        // 3. Initialize Admin Client (Bypass RLS)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!serviceRoleKey) {
            console.error("SUPABASE_SERVICE_ROLE_KEY is missing from environment variables");
            return NextResponse.json(
                { error: "Server configuration error", message: "Environment variables missing." },
                { status: 500 }
            );
        }

        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 4. Transform Data
        const now = new Date().toISOString();
        const upsertData = items.map(item => ({
            user_id: user.id,
            name: item.name,
            category: item.category,
            base_price: item.base_price,
            unit: item.unit
        }));

        // 5. Perform Upsert
        console.log(`Attempting upsert of ${upsertData.length} items for user ${user.id}`);

        const { data, error } = await adminClient
            .from("inventory")
            .upsert(upsertData, {
                onConflict: "name, user_id",
                ignoreDuplicates: false
            })
            .select("created_at");

        if (error) {
            console.error("Bulk upload upsert error details:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });

            // Helpful error mapping
            let userFriendlyMessage = error.message;
            if (error.code === '42703') userFriendlyMessage = "Database error: One of the columns (possibly 'unit') is missing in your inventory table.";
            if (error.code === '23505') userFriendlyMessage = "Duplicate error: There was a conflict that couldn't be resolved.";
            if (error.code === 'PGRST116') userFriendlyMessage = "The unique constraint (name, user_id) might be missing in your database.";

            return NextResponse.json(
                {
                    error: "Import failed at database level",
                    message: userFriendlyMessage,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                },
                { status: 500 }
            );
        }

        // 6. Calculate Stats
        const threshold = Date.now() - 5000; // Increased threshold to 5s for safety
        let insertedCount = 0;
        let updatedCount = 0;

        if (data) {
            data.forEach((row: any) => {
                const createdAtTime = new Date(row.created_at).getTime();
                if (createdAtTime > threshold) {
                    insertedCount++;
                } else {
                    updatedCount++;
                }
            });
        }

        return NextResponse.json({
            success: true,
            processed: data?.length || 0,
            insertedCount,
            updatedCount
        });

    } catch (err: any) {
        console.error("CRITICAL: Unhandled Internal Server Error:", err);
        return NextResponse.json(
            {
                error: "Critical Server Error",
                message: err.message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            },
            { status: 500 }
        );
    }
}
