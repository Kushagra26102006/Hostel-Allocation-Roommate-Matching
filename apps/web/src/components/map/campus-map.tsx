"use client";

import React, { useEffect, useState } from "react";
import { Building2, GraduationCap, Footprints, Loader2, Layers, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Dynamic import for Leaflet to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let L: any = null;

interface HostelLocation {
  id: string;
  name: string;
  genderPolicy: string;
  lat: number;
  lng: number;
  status: string;
}

interface AcademicBlockLocation {
  id: string;
  name: string;
  shortCode: string;
  lat: number;
  lng: number;
}

interface WalkingDistance {
  hostelId: string;
  academicBlockId: string;
  walkingMinutes: number;
  distanceMeters: number;
  source: string;
}

interface MapData {
  hostels: HostelLocation[];
  academicBlocks: AcademicBlockLocation[];
  distances: WalkingDistance[];
}

// Sample seed data with coordinates around IIT Roorkee campus for realistic visualization
const SAMPLE_DATA: MapData = {
  hostels: [
    {
      id: "h1",
      name: "Ramanujan Hall (Male)",
      genderPolicy: "male",
      lat: 29.8644,
      lng: 77.8962,
      status: "active",
    },
    {
      id: "h2",
      name: "Bhabha Hall (Male)",
      genderPolicy: "male",
      lat: 29.8635,
      lng: 77.8978,
      status: "active",
    },
    {
      id: "h3",
      name: "Kalpana Chawla Hall (Female)",
      genderPolicy: "female",
      lat: 29.8658,
      lng: 77.8945,
      status: "active",
    },
    {
      id: "h4",
      name: "Gargi Hall (Female)",
      genderPolicy: "female",
      lat: 29.8668,
      lng: 77.8958,
      status: "active",
    },
    {
      id: "h5",
      name: "Visvesvaraya Hall (Coed)",
      genderPolicy: "coed",
      lat: 29.8652,
      lng: 77.8992,
      status: "active",
    },
    {
      id: "h6",
      name: "Aryabhata Hall",
      genderPolicy: "male",
      lat: 29.8628,
      lng: 77.895,
      status: "active",
    },
  ],
  academicBlocks: [
    {
      id: "ab1",
      name: "Computer Science & Engineering",
      shortCode: "CSE",
      lat: 29.8648,
      lng: 77.897,
    },
    { id: "ab2", name: "Electrical Engineering", shortCode: "ECE", lat: 29.8655, lng: 77.8965 },
    { id: "ab3", name: "Main Library", shortCode: "LIB", lat: 29.865, lng: 77.8955 },
    { id: "ab4", name: "Administrative Block", shortCode: "ADM", lat: 29.8645, lng: 77.895 },
    { id: "ab5", name: "Lecture Hall Complex", shortCode: "LHC", lat: 29.866, lng: 77.8975 },
  ],
  distances: [
    {
      hostelId: "h1",
      academicBlockId: "ab1",
      walkingMinutes: 6,
      distanceMeters: 420,
      source: "haversine",
    },
    {
      hostelId: "h2",
      academicBlockId: "ab1",
      walkingMinutes: 8,
      distanceMeters: 560,
      source: "haversine",
    },
    {
      hostelId: "h3",
      academicBlockId: "ab1",
      walkingMinutes: 10,
      distanceMeters: 700,
      source: "haversine",
    },
    {
      hostelId: "h4",
      academicBlockId: "ab1",
      walkingMinutes: 12,
      distanceMeters: 840,
      source: "haversine",
    },
    {
      hostelId: "h5",
      academicBlockId: "ab1",
      walkingMinutes: 15,
      distanceMeters: 1050,
      source: "haversine",
    },
    {
      hostelId: "h6",
      academicBlockId: "ab1",
      walkingMinutes: 7,
      distanceMeters: 490,
      source: "haversine",
    },
  ],
};

function getHostelColor(genderPolicy: string): string {
  switch (genderPolicy) {
    case "male":
      return "#3b82f6"; // blue
    case "female":
      return "#ec4899"; // pink
    case "coed":
      return "#8b5cf6"; // purple
    default:
      return "#6b7280"; // gray
  }
}

function getHostelLabel(genderPolicy: string): string {
  switch (genderPolicy) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    case "coed":
      return "Co-ed";
    default:
      return "";
  }
}

export function CampusMap() {
  const [mapData, setMapData] = useState<MapData>(SAMPLE_DATA);
  const [selectedHostel, setSelectedHostel] = useState<HostelLocation | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<AcademicBlockLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Attempt to fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/v1/map/locations");
        if (res.ok) {
          const data = await res.json();
          if (data.hostels?.length > 0) {
            setMapData(data);
          }
        }
      } catch {
        // Use sample data as fallback
      } finally {
        setIsLoading(false);
      }
    };
    void fetchData();
  }, []);

  // Initialize Leaflet on client side
  useEffect(() => {
    const initMap = async () => {
      try {
        const leaflet = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        L = leaflet;
        setMapReady(true);
      } catch {
        setError("Failed to load map library");
      }
    };
    void initMap();
  }, []);

  // Render the Leaflet map
  useEffect(() => {
    if (!mapReady || !L) return;

    const container = document.getElementById("campus-leaflet-map");
    if (!container) return;

    // Clear existing map if any
    container.innerHTML = "";

    // Calculate center from all locations
    const allLats = [
      ...mapData.hostels.map((h) => h.lat),
      ...mapData.academicBlocks.map((b) => b.lat),
    ];
    const allLngs = [
      ...mapData.hostels.map((h) => h.lng),
      ...mapData.academicBlocks.map((b) => b.lng),
    ];
    const centerLat = allLats.reduce((a, b) => a + b, 0) / allLats.length;
    const centerLng = allLngs.reduce((a, b) => a + b, 0) / allLngs.length;

    const map = L.map(container, {
      attributionControl: true,
    }).setView([centerLat, centerLng], 16);

    // OpenStreetMap tiles with proper attribution
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom marker icons
    const createIcon = (color: string, size: number = 28) =>
      L!.divIcon({
        className: "custom-map-marker",
        html: `<div style="
          width: ${size}px; height: ${size}px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

    // Add hostel markers
    for (const hostel of mapData.hostels) {
      const color = getHostelColor(hostel.genderPolicy);
      const marker = L.marker([hostel.lat, hostel.lng], {
        icon: createIcon(color, 30),
        title: hostel.name,
      }).addTo(map);

      // Find distances for this hostel
      const hostelDistances = mapData.distances.filter((d) => d.hostelId === hostel.id);
      const distanceHtml = hostelDistances
        .map((d) => {
          const block = mapData.academicBlocks.find((b) => b.id === d.academicBlockId);
          return block
            ? `<div style="display:flex;justify-content:space-between;gap:12px;padding:2px 0">
                <span>${block.shortCode}</span>
                <span style="color:#3b82f6;font-weight:600">${d.walkingMinutes} min</span>
              </div>`
            : "";
        })
        .join("");

      marker.bindPopup(
        `<div style="min-width:180px">
          <h3 style="margin:0 0 4px 0;font-size:14px;font-weight:700">${hostel.name}</h3>
          <span style="
            display:inline-block;padding:1px 8px;border-radius:12px;font-size:11px;
            background:${color}22;color:${color};border:1px solid ${color}44;margin-bottom:6px;
          ">${getHostelLabel(hostel.genderPolicy)}</span>
          ${
            distanceHtml
              ? `<div style="border-top:1px solid #e5e7eb;padding-top:6px;margin-top:4px;font-size:12px">
            <div style="font-weight:600;margin-bottom:4px;color:#6b7280">🚶 Walking distances:</div>
            ${distanceHtml}
          </div>`
              : ""
          }
        </div>`,
      );

      marker.on("click", () => setSelectedHostel(hostel));
    }

    // Add academic block markers
    for (const block of mapData.academicBlocks) {
      const marker = L.marker([block.lat, block.lng], {
        icon: createIcon("#f59e0b", 24), // amber
        title: block.name,
      }).addTo(map);

      marker.bindPopup(
        `<div>
          <h3 style="margin:0 0 2px 0;font-size:14px;font-weight:700">${block.name}</h3>
          <span style="font-size:12px;color:#6b7280">${block.shortCode}</span>
        </div>`,
      );

      marker.on("click", () => setSelectedBlock(block));
    }

    // Draw route lines if a hostel is selected
    if (selectedHostel) {
      for (const dist of mapData.distances.filter((d) => d.hostelId === selectedHostel.id)) {
        const block = mapData.academicBlocks.find((b) => b.id === dist.academicBlockId);
        if (!block) continue;

        L.polyline(
          [
            [selectedHostel.lat, selectedHostel.lng],
            [block.lat, block.lng],
          ],
          {
            color: getHostelColor(selectedHostel.genderPolicy),
            weight: 3,
            opacity: 0.6,
            dashArray: "8 4",
          },
        ).addTo(map);
      }
    }

    return () => {
      map.remove();
    };
  }, [mapReady, mapData, selectedHostel, selectedBlock]);

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
      {/* Map Container */}
      <div id="campus-leaflet-map" className="w-full h-full min-h-[500px] z-0" />

      {/* Loading overlay */}
      {(isLoading || !mapReady) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-white">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Loading campus map...</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 text-xs space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
          <Layers className="w-3.5 h-3.5" />
          Legend
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
          <span className="text-slate-600 dark:text-slate-300">Male Hostel</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-pink-500 border-2 border-white shadow-sm" />
          <span className="text-slate-600 dark:text-slate-300">Female Hostel</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500 border-2 border-white shadow-sm" />
          <span className="text-slate-600 dark:text-slate-300">Co-ed Hostel</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow-sm" />
          <span className="text-slate-600 dark:text-slate-300">Academic Block</span>
        </div>
      </div>

      {/* Selected hostel info card */}
      {selectedHostel && (
        <div className="absolute bottom-3 left-3 right-3 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-500" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {selectedHostel.name}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedHostel(null)}
              className="h-6 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {mapData.distances
              .filter((d) => d.hostelId === selectedHostel.id)
              .map((d) => {
                const block = mapData.academicBlocks.find((b) => b.id === d.academicBlockId);
                if (!block) return null;
                return (
                  <div
                    key={d.academicBlockId}
                    className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700 px-2.5 py-1.5 rounded-lg"
                  >
                    <GraduationCap className="w-3 h-3 text-amber-500" />
                    <span className="text-slate-600 dark:text-slate-300">{block.shortCode}</span>
                    <span className="text-sky-600 dark:text-sky-400 font-semibold">
                      {d.walkingMinutes} min
                    </span>
                    <Footprints className="w-3 h-3 text-slate-400" />
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
