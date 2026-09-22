import {
  type Building3DModel,
  type Floor3DData,
  type Wing3DData,
  type Room3DData,
  type OccupancyStatus,
  type BedDetail,
} from "./types";

export interface RawInventoryInput {
  hostel: {
    id: string;
    name: string;
    genderPolicy: "male" | "female" | "coed";
  };
  floors: Array<{
    floorNumber: number;
    floorLabel?: string;
    wings: Array<{
      name: string;
      rooms: Array<{
        id: string;
        roomNumber: string;
        roomType?: string;
        capacity: number;
        accessible?: boolean;
        ac?: boolean;
        occupiedCount?: number;
        status?: string;
        beds?: Array<{
          id: string;
          bedNumber: string;
          status: string;
          studentName?: string | undefined;
          rollNumber?: string | undefined;
        }>;
      }>;
    }>;
  }>;
}

const ROOM_WIDTH = 3.2;
const ROOM_HEIGHT = 2.4;
const ROOM_DEPTH = 3.6;
const FLOOR_HEIGHT = 3.4;
const CORRIDOR_WIDTH = 2.2;
const ROOM_SPACING_X = 0.4;

export function determineOccupancyStatus(
  capacity: number,
  occupiedCount: number,
  rawStatus?: string,
): OccupancyStatus {
  if (rawStatus === "maintenance") return "maintenance";
  if (rawStatus === "reserved") return "reserved";
  if (occupiedCount >= capacity) return "full";
  if (occupiedCount > 0) return "partial";
  return "available";
}

/**
 * Generates an extruded 3D building layout from structured inventory data.
 * Computes world [x, y, z] coordinates for every room, wing, and floor.
 */
export function generate3DBuildingModel(input: RawInventoryInput): Building3DModel {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  let totalRooms = 0;
  let totalBeds = 0;
  let occupiedBeds = 0;

  const floors: Floor3DData[] = input.floors.map((rawFloor) => {
    const elevationY = rawFloor.floorNumber * FLOOR_HEIGHT;
    minY = Math.min(minY, elevationY);
    maxY = Math.max(maxY, elevationY + ROOM_HEIGHT);

    let floorRoomsCount = 0;
    let floorBedsCount = 0;
    let floorOccupiedBedsCount = 0;

    const wings: Wing3DData[] = rawFloor.wings.map((rawWing, wingIdx) => {
      // Wings branch out: Wing 0 to the Left (-X), Wing 1 to the Right (+X), Wing 2 to North (-Z), etc.
      const isEastWest = wingIdx % 2 === 0;
      const wingOffsetX = isEastWest ? (wingIdx === 0 ? -12 : 12) : 0;
      const wingOffsetZ = !isEastWest ? (wingIdx === 1 ? -12 : 12) : 0;

      const rooms: Room3DData[] = rawWing.rooms.map((rawRoom, roomIdx) => {
        // Double-loaded corridor layout: Even rooms on Side A, Odd rooms on Side B
        const isSideA = roomIdx % 2 === 0;
        const indexAlongCorridor = Math.floor(roomIdx / 2);

        let roomX = 0;
        let roomZ = 0;

        if (isEastWest) {
          // Corridor runs along X-axis
          const xPos = indexAlongCorridor * (ROOM_WIDTH + ROOM_SPACING_X) - 10 + wingOffsetX;
          const zPos = isSideA
            ? -(CORRIDOR_WIDTH / 2 + ROOM_DEPTH / 2)
            : CORRIDOR_WIDTH / 2 + ROOM_DEPTH / 2;
          roomX = xPos;
          roomZ = zPos + wingOffsetZ;
        } else {
          // Corridor runs along Z-axis
          const zPos = indexAlongCorridor * (ROOM_DEPTH + ROOM_SPACING_X) - 10 + wingOffsetZ;
          const xPos = isSideA
            ? -(CORRIDOR_WIDTH / 2 + ROOM_WIDTH / 2)
            : CORRIDOR_WIDTH / 2 + ROOM_WIDTH / 2;
          roomX = xPos + wingOffsetX;
          roomZ = zPos;
        }

        const roomY = elevationY + ROOM_HEIGHT / 2;

        // Bounding box tracking
        minX = Math.min(minX, roomX - ROOM_WIDTH / 2);
        maxX = Math.max(maxX, roomX + ROOM_WIDTH / 2);
        minZ = Math.min(minZ, roomZ - ROOM_DEPTH / 2);
        maxZ = Math.max(maxZ, roomZ + ROOM_DEPTH / 2);

        const roomCapacity = rawRoom.capacity || 2;
        const roomOccupied =
          rawRoom.occupiedCount ??
          (rawRoom.beds ? rawRoom.beds.filter((b) => b.status === "occupied").length : 0);
        const status = determineOccupancyStatus(roomCapacity, roomOccupied, rawRoom.status);

        floorRoomsCount += 1;
        floorBedsCount += roomCapacity;
        floorOccupiedBedsCount += roomOccupied;

        const beds: BedDetail[] = (rawRoom.beds || []).map((b) => ({
          id: b.id,
          bedNumber: b.bedNumber,
          status: b.status as "available" | "occupied" | "maintenance" | "reserved",
          studentName: b.studentName,
          rollNumber: b.rollNumber,
        }));

        // Fill default synthetic beds if none provided
        if (beds.length === 0) {
          for (let b = 1; b <= roomCapacity; b++) {
            const isOcc = b <= roomOccupied;
            beds.push({
              id: `${rawRoom.id}-bed-${b}`,
              bedNumber: `Bed ${String.fromCharCode(64 + b)}`,
              status: isOcc ? "occupied" : "available",
              studentName: isOcc ? `Resident ${rawRoom.roomNumber}-${b}` : undefined,
              rollNumber: isOcc ? `2026CS${100 + roomIdx * 2 + b}` : undefined,
            });
          }
        }

        return {
          id: rawRoom.id,
          roomNumber: rawRoom.roomNumber,
          floor: rawFloor.floorNumber,
          wing: rawWing.name,
          roomType:
            rawRoom.roomType ||
            (roomCapacity === 1 ? "Single" : roomCapacity === 2 ? "Double" : "Triple"),
          capacity: roomCapacity,
          occupiedCount: roomOccupied,
          status,
          accessible: rawRoom.accessible ?? rawFloor.floorNumber === 0,
          ac: rawRoom.ac ?? rawFloor.floorNumber >= 2,
          position: [roomX, roomY, roomZ],
          size: [ROOM_WIDTH, ROOM_HEIGHT, ROOM_DEPTH],
          beds,
        };
      });

      return {
        name: rawWing.name,
        rooms,
      };
    });

    totalRooms += floorRoomsCount;
    totalBeds += floorBedsCount;
    occupiedBeds += floorOccupiedBedsCount;

    return {
      floorNumber: rawFloor.floorNumber,
      floorLabel: rawFloor.floorLabel || `Floor ${rawFloor.floorNumber}`,
      elevationY,
      wings,
      totalRooms: floorRoomsCount,
      totalBeds: floorBedsCount,
      occupiedBeds: floorOccupiedBedsCount,
    };
  });

  // Center bounding box
  if (minX === Infinity) minX = -10;
  if (maxX === -Infinity) maxX = 10;
  if (minY === Infinity) minY = 0;
  if (maxY === -Infinity) maxY = 15;
  if (minZ === Infinity) minZ = -10;
  if (maxZ === -Infinity) maxZ = 10;

  const width = maxX - minX;
  const height = maxY - minY;
  const depth = maxZ - minZ;

  const overallOccupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return {
    hostelId: input.hostel.id,
    hostelName: input.hostel.name,
    genderPolicy: input.hostel.genderPolicy,
    floors,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ, width, height, depth },
    totalRooms,
    totalBeds,
    occupiedBeds,
    overallOccupancyRate,
  };
}

/**
 * Creates a synthetic full campus building model when backend data is offline or in mock mode.
 */
export function generateSampleHostelModel(hostelName = "Aryabhata Hall"): Building3DModel {
  const numFloors = 4;
  const roomsPerWing = 6;
  const wingsPerFloor = ["Wing A (West)", "Wing B (East)"];

  const floorsInput = [];

  for (let f = 0; f < numFloors; f++) {
    const wings = [];
    for (let w = 0; w < wingsPerFloor.length; w++) {
      const wingName = wingsPerFloor[w]!;
      const rooms = [];
      for (let r = 1; r <= roomsPerWing; r++) {
        const roomNum = `${f}${w === 0 ? "0" : "1"}${r}`;
        const capacity = (f + r) % 3 === 0 ? 1 : 2;
        // deliberate variety of occupancy states
        let occupied = capacity;
        let status = "full";
        if ((f + r) % 5 === 0) {
          occupied = 0;
          status = "available";
        } else if ((f + r) % 3 === 1) {
          occupied = Math.max(1, capacity - 1);
          status = "partial";
        } else if (f === 3 && r === 6) {
          occupied = 0;
          status = "maintenance";
        }

        rooms.push({
          id: `room-${f}-${w}-${r}`,
          roomNumber: roomNum,
          roomType: capacity === 1 ? "Single" : capacity === 2 ? "Double" : "Triple",
          capacity,
          accessible: f === 0 && r <= 2,
          ac: f >= 2,
          occupiedCount: occupied,
          status,
        });
      }
      wings.push({ name: wingName, rooms });
    }
    floorsInput.push({
      floorNumber: f,
      floorLabel: f === 0 ? "Ground Floor" : `Floor ${f}`,
      wings,
    });
  }

  return generate3DBuildingModel({
    hostel: {
      id: "6ab049e8a846014e1214fed3",
      name: hostelName,
      genderPolicy: "male",
    },
    floors: floorsInput,
  });
}
