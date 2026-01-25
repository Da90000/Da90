"use client";

import { useState, useEffect } from "react";
import { Minus, Plus, Trash2, TrendingUp, TrendingDown, MessageSquarePlus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ShoppingListItem } from "@/lib/types";
import { useCurrency } from "@/contexts/currency-context";

interface ShoppingListItemCardProps {
  item: ShoppingListItem;
  onTogglePurchased: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdatePrice: (id: string, price: number | undefined) => void;
  onUpdateUnit: (id: string, unit: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onRemove: (id: string) => void;
}

export function ShoppingListItemCard({
  item,
  onTogglePurchased,
  onUpdateQuantity,
  onUpdatePrice,
  onUpdateUnit,
  onUpdateNote,
  onRemove,
}: ShoppingListItemCardProps) {
  const { formatPrice, currencySymbol } = useCurrency();
  const effectivePrice = item.manualPrice ?? item.basePrice;
  const [localPrice, setLocalPrice] = useState<number>(effectivePrice);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [note, setNote] = useState(item.note || "");

  // Sync local logic
  useEffect(() => {
    if (!isInputFocused) {
      setLocalPrice(item.manualPrice ?? item.basePrice);
    }
  }, [item.manualPrice, item.basePrice, isInputFocused]);

  useEffect(() => {
    setNote(item.note || "");
  }, [item.note]);

  const handlePriceBlur = () => {
    setIsInputFocused(false);
    const val = localPrice;
    if (!Number.isFinite(val) || val < 0) {
      setLocalPrice(item.basePrice);
      onUpdatePrice(item.id, undefined);
      return;
    }
    if (val === item.basePrice) {
      onUpdatePrice(item.id, undefined);
      return;
    }
    onUpdatePrice(item.id, val);
  };

  const handleNoteSave = () => {
    onUpdateNote(item.id, note);
  };

  const totalItemPrice = (item.manualPrice ?? item.basePrice) * item.quantity;

  // Trend Logic (Compare effective unit price vs last paid)
  // item.lastPaidPrice is historical. effectivePrice is current.
  const lastPaid = item.lastPaidPrice;
  let trendIcon = null;
  let trendTooltip = null;

  if (lastPaid) {
    const diff = effectivePrice - lastPaid;
    const percent = (diff / lastPaid) * 100;

    if (percent > 0) {
      trendIcon = <TrendingUp className="h-4 w-4 text-red-500" />;
      trendTooltip = `Price up ${percent.toFixed(0)}% (Last: ${formatPrice(lastPaid)})`;
    } else if (percent < 0) {
      trendIcon = <TrendingDown className="h-4 w-4 text-emerald-500" />;
      trendTooltip = `Price down ${Math.abs(percent).toFixed(0)}% (Last: ${formatPrice(lastPaid)})`;
    } else {
      // Equal
      trendIcon = <Info className="h-4 w-4 text-muted-foreground" />;
      trendTooltip = `Same as last purchase (${formatPrice(lastPaid)})`;
    }
  }

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all ${item.purchased
          ? "border-emerald-200 bg-emerald-50/50 opacity-60"
          : "border-border/40"
        }`}
    >
      {/* Top Row: Checkbox, Name/Base, Total */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Checkbox
            checked={item.purchased}
            onCheckedChange={() => onTogglePurchased(item.id)}
            className="h-6 w-6 rounded-full border-gray-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 mt-1"
          />
          <div className="min-w-0">
            <h3 className={`font-bold truncate text-base ${item.purchased ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {item.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                Base: {formatPrice(item.basePrice)}
              </span>
              {item.note && (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-800">
                  {item.note}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-foreground">
            {formatPrice(totalItemPrice)}
          </p>
        </div>
      </div>

      {/* Bottom Row: Controls */}
      <div className="flex flex-wrap items-center gap-2 mt-1">
        <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">
          {item.category}
        </Badge>

        {/* Price Input & Trend */}
        <div className="flex items-center gap-2 bg-white rounded-lg border border-dashed border-gray-300 px-2 h-9 ml-auto sm:ml-0">
          <span className="text-xs text-muted-foreground font-medium">{currencySymbol}</span>
          <input
            type="number"
            inputMode="decimal"
            className="w-16 text-sm font-semibold bg-transparent outline-none tabular-nums placeholder:text-muted-foreground"
            placeholder="0"
            value={localPrice}
            onChange={(e) => setLocalPrice(Number(e.target.value))}
            onFocus={() => setIsInputFocused(true)}
            onBlur={handlePriceBlur}
          />
        </div>

        {/* Trend Indicator */}
        {trendIcon && (
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div className="cursor-help opacity-80 hover:opacity-100 transition-opacity">
                  {trendIcon}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{trendTooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className="flex-1"></div>

        {/* Note Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100 text-muted-foreground">
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Add Note</h4>
              <Input
                placeholder="e.g. Get the green ones"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-8 text-sm"
              />
              <Button size="sm" className="w-full h-8" onClick={handleNoteSave}>
                Save Note
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Unit Selector */}
        <Select value={item.unit || "each"} onValueChange={(val) => onUpdateUnit(item.id, val)}>
          <SelectTrigger className="h-9 w-[80px] text-xs bg-gray-50 border-gray-200">
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="each">Each</SelectItem>
            <SelectItem value="kg">kg</SelectItem>
            <SelectItem value="litre">Litre</SelectItem>
            <SelectItem value="dozen">Dozen</SelectItem>
            <SelectItem value="pack">Pack</SelectItem>
          </SelectContent>
        </Select>

        {/* Quantity Stepper */}
        <div className="flex items-center h-9 bg-gray-50 rounded-lg border border-gray-200">
          <button
            className="h-full px-2 hover:bg-gray-200 rounded-l-lg text-gray-600 transition-colors"
            onClick={() => onUpdateQuantity(item.id, Math.max(0.1, item.quantity - 1))}
          >
            <Minus className="h-3 w-3" />
          </button>
          <input
            type="number"
            className="w-10 text-center bg-transparent text-sm font-semibold outline-none appearance-none m-0 p-0"
            value={item.quantity}
            onChange={(e) => onUpdateQuantity(item.id, Number(e.target.value))}
            min="0.1"
            step="0.1"
          />
          <button
            className="h-full px-2 hover:bg-gray-200 rounded-r-lg text-gray-600 transition-colors"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-full"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}