import { supabase } from "@/lib/supabase";

export interface CategoryBudget {
    id: string;
    category: string;
    amount: number;
    created_at: string;
}

export async function fetchBudgets(): Promise<CategoryBudget[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .order("category");

    if (error) {
        console.error("Error fetching budgets:", error);
        return [];
    }

    return data || [];
}

export async function upsertBudget(category: string, amount: number): Promise<{ success: boolean; error: unknown }> {
    if (!supabase) return { success: false, error: new Error("Supabase not initialized") };

    // Check if budget exists for this category
    const { data: existing } = await supabase
        .from("budgets")
        .select("id")
        .eq("category", category)
        .single();

    let error;
    if (existing) {
        const { error: updateError } = await supabase
            .from("budgets")
            .update({ amount })
            .eq("id", existing.id);
        error = updateError;
    } else {
        const { error: insertError } = await supabase
            .from("budgets")
            .insert({ category, amount });
        error = insertError;
    }

    return { success: !error, error };
}

export async function deleteBudget(id: string): Promise<{ success: boolean; error: unknown }> {
    if (!supabase) return { success: false, error: new Error("Supabase not initialized") };

    const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", id);

    return { success: !error, error };
}
