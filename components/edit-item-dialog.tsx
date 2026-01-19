"use client";

import React from "react";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/types";
import type { InventoryItem } from "@/lib/types";

interface EditItemDialogProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: { name: string; category: string; basePrice: number }) => void;
}

export function EditItemDialog({ item, isOpen, onClose, onSave }: EditItemDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");

  // Update form when item changes
  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setPrice(item.basePrice.toString());
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !name.trim() || !category || !price) return;

    onSave(item.id, {
      name: name.trim(),
      category,
      basePrice: Number.parseFloat(price),
    });

    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Edit Item</h2>
          <p className="text-sm text-muted-foreground">
            Update the base price if the market has permanently changed (e.g., inflation)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Item Name</Label>
            <Input
              id="edit-name"
              placeholder="Enter item name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-input">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-price">Base Price (BDT)</Label>
            <Input
              id="edit-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bg-input"
            />
            <p className="text-xs text-muted-foreground">
              Update this if the standard market price has permanently changed
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
