"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, ArrowUp, ArrowDown, MapPin, Sparkles, Check, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HostelCardData {
  id: string;
  name: string;
  roomType: string;
  ac: boolean;
  walkingTimeMin: number;
  availabilityHint: string;
  photoUrl: string;
}

interface SortableItemProps {
  hostel: HostelCardData;
  rank: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SortableHostelCard({ hostel, rank, total, onMoveUp, onMoveDown }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: hostel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={cn(
        "rounded-2xl border bg-surface/90 backdrop-blur-md p-4 shadow-md transition-shadow",
        isDragging ? "border-brand-500 shadow-2xl z-20 scale-[1.02]" : "border-border/60 hover:border-border",
      )}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${hostel.name}`}
          className="p-2 hover:bg-surface/80 rounded-lg text-muted cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Rank Badge */}
        <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center font-bold text-brand-400 font-mono text-base">
          #{rank}
        </div>

        {/* Photo Thumbnail / Placeholder */}
        <div className="w-16 h-16 rounded-xl bg-surface/60 border border-border/40 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs text-muted font-mono">
          {hostel.photoUrl ? (
            <img src={hostel.photoUrl} alt={hostel.name} className="w-full h-full object-cover" />
          ) : (
            "HOSTEL"
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-text truncate">{hostel.name}</h3>
            {hostel.ac && (
              <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30">
                AC
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted mt-1">
            <span className="capitalize">{hostel.roomType} Seater</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-brand-400" /> {hostel.walkingTimeMin} min walk to campus
            </span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 font-medium">{hostel.availabilityHint}</p>
        </div>

        {/* Accessible Keyboard Controls & Buttons */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={rank === 1}
            onClick={onMoveUp}
            aria-label={`Move ${hostel.name} up`}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={rank === total}
            onClick={onMoveDown}
            aria-label={`Move ${hostel.name} down`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function PreferenceRanker({
  applicationId,
  initialHostels,
}: {
  applicationId: string;
  initialHostels: HostelCardData[];
}) {
  const [items, setItems] = useState<HostelCardData[]>(initialHostels);
  const [announcement, setAnnouncement] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      const movedItem = items[oldIndex];
      const msg = `${movedItem?.name} moved to position ${newIndex + 1} of ${items.length}`;
      setAnnouncement(msg);
      void savePreferences(newItems);
    }
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newItems = arrayMove(items, index, index - 1);
    setItems(newItems);
    const movedItem = items[index];
    setAnnouncement(`${movedItem?.name} moved to position ${index} of ${items.length}`);
    void savePreferences(newItems);
  };

  const moveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const newItems = arrayMove(items, index, index + 1);
    setItems(newItems);
    const movedItem = items[index];
    setAnnouncement(`${movedItem?.name} moved to position ${index + 2} of ${items.length}`);
    void savePreferences(newItems);
  };

  const savePreferences = async (newItems: HostelCardData[]) => {
    setIsSaving(true);
    setErrorMessage(null);
    const previousItems = items;

    try {
      const payload = newItems.map((item, idx) => ({
        rank: idx + 1,
        hostel_id: item.id,
        room_type: item.roomType,
      }));

      const res = await fetch(`/api/v1/applications/${applicationId}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: payload }),
      });

      if (!res.ok) {
        const err = await res.json();
        // Optimistic rollback on error
        setItems(previousItems);
        setErrorMessage(err.detail || "Failed to save preferences. Rolled back.");
        return;
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch {
      // Optimistic rollback on exception
      setItems(previousItems);
      setErrorMessage("Network error saving preferences. Rolled back.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Aria-Live Announcements for Screen Readers */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">Hostel Preference Ranking</h2>
          <p className="text-xs text-muted">Drag cards or use arrow buttons to rank choices in order of preference.</p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
            </span>
          )}
          {savedSuccess && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {errorMessage}
        </div>
      )}

      {/* Drag and Drop Sortable Context */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((hostel, idx) => (
              <SortableHostelCard
                key={hostel.id}
                hostel={hostel}
                rank={idx + 1}
                total={items.length}
                onMoveUp={() => moveUp(idx)}
                onMoveDown={() => moveDown(idx)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
