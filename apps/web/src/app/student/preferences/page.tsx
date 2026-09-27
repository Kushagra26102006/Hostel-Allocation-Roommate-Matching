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
  MapPin,
  Sparkles,
  Save,
  Wind,
  Accessibility,
  Clock,
  Bed,
  CheckCircle2,
  Info,
  Compass,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { MockHostel } from "@/lib/api/mock/data";

export default function StudentPreferencesPage() {
  const { data: allHostels } = useHostels();
  const { data: initialPrefs } = useStudentPreferences();
  const updatePrefs = useUpdatePreferences();

  const [rankedHostels, setRankedHostels] = React.useState<MockHostel[]>([]);
  const [selectedHostelForDetails, setSelectedHostelForDetails] = React.useState<MockHostel | null>(
    null,
  );
  const [roomTypePrefs, setRoomTypePrefs] = React.useState<Record<string, string>>({
    "hostel-a": "double_ac",
    "hostel-b": "double_ac",
    "hostel-c": "single_ac",
    "hostel-d": "double_regular",
    "hostel-e": "double_regular",
  });
  const [showMapModal, setShowMapModal] = React.useState(false);

  const imageMap: Record<string, string> = {
    "hostel-a": "/images/campus-hero.jpg",
    "hostel-b": "/images/residence-hall.jpg",
    "hostel-c": "/images/campus_building_hero.jpg",
    "hostel-d": "/images/study-lounge.jpg",
    "hostel-e": "/images/dining-hall.jpg",
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
    const cur = items[index]!;
    const prev = items[index - 1]!;
    items[index - 1] = cur;
    items[index] = prev;
    setRankedHostels(items);
    toast.success(`Moved ${cur.name} up to Rank #${index}`);
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
    const cur = items[index]!;
    const next = items[index + 1]!;
    items[index + 1] = cur;
    items[index] = next;
    setRankedHostels(items);
    toast.success(`Moved ${cur.name} down to Rank #${index + 2}`);
  };

  const handleSave = () => {
    if (!rankedHostels) return;
    const ids = rankedHostels.map((h) => h.id);
    updatePrefs.mutate(ids, {
      onSuccess: () => {
        toast.success("Hostel preferences saved and locked for Gale-Shapley matching run!");
      },
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-7 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-border/60">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Deterministic Gale-Shapley Inputs</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Rank Hostel Residences
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Drag or use arrows to prioritize residences. Your highest valid choice is guaranteed
            under capacity constraints.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMapModal(true)}
            className="text-xs border-border/80 min-target-size"
          >
            <Compass className="mr-1.5 h-3.5 w-3.5 text-brand-600" />
            <span>Campus Map</span>
          </Button>

          <Button
            onClick={handleSave}
            disabled={updatePrefs.isPending}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs min-target-size"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            <span>{updatePrefs.isPending ? "Saving..." : "Save Rankings"}</span>
          </Button>
        </div>
      </div>

      {/* Reorderable List */}
      <Reorder.Group
        axis="y"
        values={rankedHostels}
        onReorder={setRankedHostels}
        className="space-y-4"
      >
        {rankedHostels.map((hostel, index) => {
          const isTopChoice = index === 0;
          const currentRoomType = roomTypePrefs[hostel.id] || "double_ac";

          return (
            <Reorder.Item
              key={hostel.id}
              value={hostel}
              className="list-none"
              whileDrag={{ scale: 1.01, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)" }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            >
              <div
                className={`group rounded-3xl border transition-all duration-200 bg-surface shadow-xs overflow-hidden ${
                  isTopChoice
                    ? "border-brand-500/60 shadow-brand-500/5 ring-1 ring-brand-500/20"
                    : "border-border/80 hover:border-brand-500/40"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
                  {/* Image Column (4 cols) */}
                  <div className="relative aspect-[16/10] md:aspect-auto md:h-full md:col-span-4 bg-surface-muted overflow-hidden">
                    <SmartImage
                      src={imageMap[hostel.id] || hostel.imageUrl}
                      alt={hostel.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-surface/90 backdrop-blur-md text-xs font-bold text-foreground border border-border/60 shadow-xs">
                        #{index + 1}
                      </span>
                      {isTopChoice && (
                        <span className="rounded-xl bg-brand-600 text-white text-[10px] font-bold px-2.5 py-1 shadow-xs">
                          1st Choice
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Column (8 cols) */}
                  <div className="p-5 sm:p-6 md:col-span-8 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                            {hostel.name}
                          </h3>
                          <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-surface-muted border border-border/60 font-semibold">
                            {hostel.code}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-surface-muted capitalize text-muted">
                            {hostel.gender} Residence
                          </span>
                        </div>

                        {/* Bed Availability Badge */}
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                          <Bed className="h-3.5 w-3.5" />
                          <span>{hostel.availableBeds} beds available</span>
                        </div>
                      </div>

                      {/* Distance & Facilities Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-brand-600" />
                          <span>{hostel.distanceToCampusMeters}m to departments</span>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted" />
                          <span>{hostel.walkingTimeMins} mins walk</span>
                        </span>
                        <span>&bull;</span>
                        {hostel.hasAC ? (
                          <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-medium">
                            <Wind className="h-3.5 w-3.5" />
                            <span>Air Conditioned</span>
                          </span>
                        ) : (
                          <span>Regular Cooler</span>
                        )}
                        {hostel.isAccessible && (
                          <>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <Accessibility className="h-3.5 w-3.5" />
                              <span>Accessible Route</span>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Facilities Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {hostel.amenities.slice(0, 4).map((amenity, aIdx) => (
                          <span
                            key={aIdx}
                            className="rounded-lg bg-surface-muted/60 border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Controls Row: Room Type Selector, Details Drawer, Up/Down & Drag Handle */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
                      {/* Preferred Room Type Selection */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-muted">Room Type:</span>
                        <select
                          value={currentRoomType}
                          onChange={(e) =>
                            setRoomTypePrefs({ ...roomTypePrefs, [hostel.id]: e.target.value })
                          }
                          className="h-8 rounded-xl border border-border bg-surface px-2.5 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                          <option value="double_ac">Double Sharing (AC)</option>
                          <option value="single_ac">Single Suite (AC)</option>
                          <option value="double_regular">Double Sharing (Regular)</option>
                          <option value="triple">Triple Sharing</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Details Drawer Trigger */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedHostelForDetails(hostel)}
                          className="text-xs text-muted-foreground hover:text-foreground min-target-size"
                        >
                          <Info className="mr-1.5 h-3.5 w-3.5" />
                          <span>Residence Details</span>
                        </Button>

                        {/* Accessible Move Up / Down Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            aria-label={`Move ${hostel.name} up in priority`}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors min-target-size"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDown(index)}
                            disabled={index === rankedHostels.length - 1}
                            aria-label={`Move ${hostel.name} down in priority`}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors min-target-size"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Drag Handle */}
                        <div
                          className="cursor-grab active:cursor-grabbing p-1.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-muted min-target-size"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {/* Hostel Details Side Drawer */}
      <Sheet
        open={Boolean(selectedHostelForDetails)}
        onOpenChange={() => setSelectedHostelForDetails(null)}
      >
        {selectedHostelForDetails && (
          <SheetContent side="right" className="w-[90vw] max-w-xl p-0 flex flex-col bg-surface">
            <SheetHeader className="p-6 border-b border-border/60 text-left">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-surface-muted border border-border font-bold">
                  {selectedHostelForDetails.code}
                </span>
                <span className="text-xs uppercase font-bold text-brand-600">
                  {selectedHostelForDetails.campus}
                </span>
              </div>
              <SheetTitle className="text-xl font-bold mt-1">
                {selectedHostelForDetails.name}
              </SheetTitle>
              <SheetDescription className="text-xs">
                Comprehensive hostel facilities, room specifications & mess regulations
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Photo Showcase */}
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-surface-muted border border-border/60">
                <SmartImage
                  src={imageMap[selectedHostelForDetails.id] || selectedHostelForDetails.imageUrl}
                  alt={selectedHostelForDetails.name}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Vital Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-surface-muted/40 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted block">
                    Total Beds
                  </span>
                  <span className="font-bold text-sm text-foreground">
                    {selectedHostelForDetails.totalBeds}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-surface-muted/40 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted block">
                    Available
                  </span>
                  <span className="font-bold text-sm text-emerald-600">
                    {selectedHostelForDetails.availableBeds}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-surface-muted/40 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted block">
                    Walk Time
                  </span>
                  <span className="font-bold text-sm text-foreground">
                    {selectedHostelForDetails.walkingTimeMins} mins
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-surface-muted/40 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted block">
                    Blocks/Floors
                  </span>
                  <span className="font-bold text-sm text-foreground">
                    {selectedHostelForDetails.blocksCount}B / {selectedHostelForDetails.floorsCount}
                    F
                  </span>
                </div>
              </div>

              {/* Complete Facilities List */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-muted text-[11px]">
                  All Amenities & Facilities
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedHostelForDetails.amenities.map((amenity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-muted/40 border border-border/60 text-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Residence Rules */}
              <div className="p-4 rounded-2xl bg-surface-muted/30 border border-border/60 space-y-1.5 text-muted-foreground">
                <span className="font-bold text-foreground block text-xs">
                  Residence Guidelines:
                </span>
                <p>&bull; Quiet Study Hours: 11:00 PM – 06:00 AM daily.</p>
                <p>
                  &bull; Common Mess Timings: Breakfast (07:30–09:30), Lunch (12:00–14:00), Dinner
                  (19:30–21:30).
                </p>
                <p>&bull; Biometric security turnstiles active 24/7 at all entry blocks.</p>
              </div>
            </div>

            <div className="p-4 border-t border-border/60 bg-surface-muted/40 flex justify-end">
              <Button
                size="sm"
                onClick={() => setSelectedHostelForDetails(null)}
                className="text-xs min-target-size"
              >
                Close Details
              </Button>
            </div>
          </SheetContent>
        )}
      </Sheet>

      {/* Mini Campus Map Preview Sheet / Dialog */}
      <Sheet open={showMapModal} onOpenChange={setShowMapModal}>
        <SheetContent side="right" className="w-[90vw] max-w-xl p-0 flex flex-col bg-surface">
          <SheetHeader className="p-6 border-b border-border/60 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider">
              <Compass className="h-4 w-4" />
              <span>Campus Geographic Map</span>
            </div>
            <SheetTitle className="text-xl font-bold mt-1">Hostel Residence Locations</SheetTitle>
            <SheetDescription className="text-xs">
              Walking proximity to academic complexes, library, and central sports arena
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            {/* Visual Campus Map Card */}
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 border border-border/60 p-4 text-white flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-black/60 backdrop-blur-md">
                  North Campus Quad
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  ● Active Shuttle Route
                </span>
              </div>

              {/* Pin representations */}
              <div className="space-y-2 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-brand-500 animate-pulse" />
                  <span className="font-bold text-sm">Aryabhata Hall (250m to CS Department)</span>
                </div>
                <div className="flex items-center gap-2 pl-4 text-zinc-300">
                  <div className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  <span>Gargi Residence (400m to Library)</span>
                </div>
                <div className="flex items-center gap-2 pl-8 text-zinc-300">
                  <div className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                  <span>Ramanujan Tower (600m to Research Labs)</span>
                </div>
              </div>

              <div className="text-[10px] text-zinc-400 font-mono">
                Interactive geospatial distance computed via Dijkstra walking paths
              </div>
            </div>

            {/* Walking distances table */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">
                Walking Proximity Summary
              </h4>
              <div className="space-y-1.5">
                {rankedHostels.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface-muted/40 border border-border/60"
                  >
                    <div>
                      <span className="font-bold text-foreground block">{h.name}</span>
                      <span className="text-[10px] text-muted">{h.campus}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-brand-600 block">
                        {h.distanceToCampusMeters} meters
                      </span>
                      <span className="text-[10px] text-muted">~{h.walkingTimeMins} mins walk</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border/60 bg-surface-muted/40 flex justify-end">
            <Button
              size="sm"
              onClick={() => setShowMapModal(false)}
              className="text-xs min-target-size"
            >
              Close Map
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
