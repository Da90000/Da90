"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ShoppingListItemCard } from "./shopping-list-item";
import { ShoppingListItem } from "@/lib/types";

// Helper to extract props type
type ShoppingListItemCardProps = React.ComponentProps<typeof ShoppingListItemCard>;

interface SortableProps extends ShoppingListItemCardProps {
    id: string; // Required for DnD
}

export function SortableShoppingListItem({ id, item, ...props }: SortableProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        position: "relative" as const,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <ShoppingListItemCard
                item={item}
                {...props}
                dragHandleProps={listeners}
            />
        </div>
    );
}
