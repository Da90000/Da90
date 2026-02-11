"use client";

import { useRouter } from "next/navigation";
import { QuickAddSheet } from "@/components/quick-add-sheet";

export default function AddPage() {
    const router = useRouter();

    return (
        <div className="bg-background min-h-screen">
            <QuickAddSheet
                open={true}
                onOpenChange={(open) => {
                    if (!open) {
                        router.back();
                    }
                }}
            />
        </div>
    );
}
