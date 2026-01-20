"use client";

export const AnalyticsSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-muted/50 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[350px] bg-muted/50 rounded-2xl" />
            <div className="h-[350px] bg-muted/50 rounded-2xl" />
        </div>
    </div>
);
