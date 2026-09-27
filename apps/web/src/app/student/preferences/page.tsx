"use client";

import * as React from "react";
import { Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { useHostels, useStudentPreferences, useUpdatePreferences } from "@/hooks/use-mock-api";
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Building,
  MapPin,
  Sparkles,
  Save,
  Wind,
  Accessibility,
} from "lucide-react";
import { toast } from "sonner";

export default function StudentPreferencesPage() {
  const { data: allHostels } = useHostels();
  const { data: initialPrefs } = useStudentPreferences();
  const updatePrefs = useUpdatePreferences();

  const [rankedHostels, setRankedHostels] = React.useState<NonNullable<typeof allHostels>>([]);

  const imageMap: Record<string, string> = {
    "hostel-1": "/images/campus-hero.jpg",
    "hostel-2": "/images/residence-hall.jpg",
    "hostel-3": "/images/study-lounge.jpg",
    "hostel-4": "/images/room-interior.jpg",
  };

  React.useEffect(() => {
    if (allHostels) {
      if (initialPrefs && initialPrefs.length > 0) {
        const sorted = [...allHostels].sort((a, b) => {
          const aIdx = initialPrefs.indexOf(a.id);
          const bIdx = initialPrefs.indexOf(b.id);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return 0;
        });
        setRankedHostels(sorted);
      } else {
        setRankedHostels(allHostels);
      }
    }
  }, [allHostels, initialPrefs]);

  const moveUp = (index: number) => {
    if (index === 0 || !rankedHostels || !rankedHostels[index] || !rankedHostels[index - 1]) return;
    const items = [...rankedHostels];
    const cur = items[index];
    const prev = items[index - 1];
    if (!cur || !prev) return;
    items[index - 1] = cur;
    items[index] = prev;
    setRankedHostels(items);
    toast.success(`Moved ${cur.name} to #${index}`);
  };

  const moveDown = (index: number) => {
    if (
      !rankedHostels ||
      index === rankedHostels.length - 1 ||
      !rankedHostels[index] ||
      !rankedHostels[index + 1]
    )
      return;
    const items = [...rankedHostels];
    const cur = items[index];
    const next = items[index + 1];
    if (!cur || !next) return;
    items[index + 1] = cur;
    items[index] = next;
    setRankedHostels(items);
    toast.success(`Moved ${cur.name} to #${index + 2}`);
  };

  const handleSave = () => {
    if (!rankedHostels) return;
    const ids = rankedHostels.map((h) => h.id);
    updatePrefs.mutate(ids, {
      onSuccess: () => toast.success("Hostel preference rankings saved successfully!"),
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-border/60">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Deterministic Gale-Shapley Inputs</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Rank Hostel Residences
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Drag to reorder your top preferences, or use arrow controls. Gale-Shapley will
            prioritize your highest ranked choices.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={updatePrefs.isPending}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs"
        >
          <Save className="mr-1.5 h-4 w-4" />
          {updatePrefs.isPending ? "Saving..." : "Save Rankings"}
        </Button>
      </div>

      {/* Reorderable Hostel List */}
      <Reorder.Group
        axis="y"
        values={rankedHostels || []}
        onReorder={setRankedHostels}
        className="space-y-3.5"
      >
        {rankedHostels?.map((hostel, idx) => (
          <Reorder.Item
            key={hostel.id}
            value={hostel}
            whileDrag={{ scale: 1.02, boxShadow: "0 12px 24px -4px rgba(15, 23, 42, 0.12)" }}
            className="cursor-grab active:cursor-grabbing focus:outline-none"
          >
            <div className="rounded-xl border border-border/70 bg-surface p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-brand-500/40 hover:shadow-md">
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Drag Handle & Rank Badge */}
                <div className="flex items-center gap-2 text-muted">
                  <GripVertical className="h-5 w-5 hover:text-foreground shrink-0 cursor-grab" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white font-heading text-xs font-bold shadow-2xs shrink-0">
                    #{idx + 1}
                  </div>
                </div>

                {/* Hostel Thumbnail with SmartImage */}
                <div className="hidden sm:block h-16 w-24 overflow-hidden rounded-lg border border-border/60 shrink-0">
                  <SmartImage
                    src={imageMap[hostel.id] ?? hostel.imageUrl}
                    alt={hostel.name}
                    width={96}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Hostel Specs */}
                <div className="flex-1 overflow-hidden min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-base font-bold text-foreground truncate">
                      {hostel.name}
                    </h3>
                    <span className="text-[11px] font-mono text-muted">({hostel.code})</span>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                      {hostel.gender === "male"
                        ? "Men's"
                        : hostel.gender === "female"
                          ? "Women's"
                          : "Co-Ed"}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {hostel.distanceToCampusMeters}m ({hostel.walkingTimeMins} min walk)
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="h-3.5 w-3.5" />
                      {hostel.availableBeds} beds available
                    </span>
                    {hostel.hasAC && (
                      <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-medium">
                        <Wind className="h-3.5 w-3.5" />
                        Air Conditioned
                      </span>
                    )}
                    {hostel.isAccessible && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Accessibility className="h-3.5 w-3.5" />
                        Accessible
                      </span>
                    )}
                  </div>
                </div>

                {/* Keyboard Navigation Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    title="Move up"
                    aria-label={`Move ${hostel.name} up`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => moveDown(idx)}
                    disabled={idx === (rankedHostels?.length || 0) - 1}
                    title="Move down"
                    aria-label={`Move ${hostel.name} down`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
