"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AiChatDialog } from "./ai-chat-dialog";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

export function AiChatButton() {
    const [open, setOpen] = useState(false);
    const [session, setSession] = useState<any>(null);
    const pathname = usePathname();
    const supabase = createClient();

    useEffect(() => {
        const getSession = async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    // Don't show on login page or if no session
    if (pathname === "/login" || !session) {
        return null;
    }

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="fixed bottom-24 left-6 z-40 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-transform active:scale-95"
                size="icon"
                aria-label="AI Assistant"
            >
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <AiChatDialog open={open} onOpenChange={setOpen} />
        </>
    );
}
