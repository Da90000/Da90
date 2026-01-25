"use client";

import { MessageSquare, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AiChatDialog } from "./ai-chat-dialog";

export function AiChatButton() {
    const [open, setOpen] = useState(false);

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
