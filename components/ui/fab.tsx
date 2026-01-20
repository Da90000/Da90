"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingActionBtnProps {
    onClick: () => void;
    icon?: React.ReactNode;
}

export function FloatingActionBtn({ onClick, icon }: FloatingActionBtnProps) {
    return (
        <Button
            onClick={onClick}
            className="fixed bottom-24 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:bg-primary/90 active:scale-90 md:hidden"
            size="icon"
            aria-label="Add"
        >
            {icon || <Plus className="h-6 w-6" />}
        </Button>
    );
}
