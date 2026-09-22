export type OccupancyStatus = "available" | "partial" | "full" | "maintenance" | "reserved";

export interface BedDetail {
  id: string;
  bedNumber: string;
  status: "available" | "occupied" | "maintenance" | "reserved";
  studentName?: string | undefined;
  rollNumber?: string | undefined;
}

export interface Room3DData {
  id: string;
  roomNumber: string;
  floor: number;
  wing: string;
  roomType: string;
  capacity: number;
  occupiedCount: number;
  status: OccupancyStatus;
  accessible: boolean;
  ac: boolean;
  position: [number, number, number]; // [x, y, z] in world coordinates
  size: [number, number, number]; // [width, height, depth]
  beds: BedDetail[];
}

export interface Wing3DData {
  name: string;
  rooms: Room3DData[];
}

export interface Floor3DData {
  floorNumber: number;
  floorLabel: string;
  elevationY: number; // base Y elevation
  wings: Wing3DData[];
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
}

export interface Building3DModel {
  hostelId: string;
  hostelName: string;
  genderPolicy: "male" | "female" | "coed";
  floors: Floor3DData[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
    width: number;
    height: number;
    depth: number;
  };
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  overallOccupancyRate: number;
}

export interface CameraFlyTarget {
  position: [number, number, number];
  target: [number, number, number];
}

export const STATUS_COLORS: Record<OccupancyStatus, string> = {
  available: "#10b981", // Emerald green
  partial: "#f59e0b", // Warm amber
  full: "#6366f1", // Indigo
  maintenance: "#ef4444", // Rose red
  reserved: "#a855f7", // Purple
};

export const STATUS_LABELS: Record<OccupancyStatus, string> = {
  available: "Available (Vacant)",
  partial: "Partially Occupied",
  full: "Full (100% Occupied)",
  maintenance: "Under Maintenance",
  reserved: "Reserved / Hold",
};
