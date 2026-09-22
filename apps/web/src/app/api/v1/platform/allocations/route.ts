import { type NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth/api-key-auth.js";
import { HostelRepository, RoomRepository, BedRepository } from "@hostelhub/db";

export const dynamic = "force-dynamic";

/**
 * Public Platform API for External Systems (e.g. P04 Hostel Room Exchange).
 * Authenticated via "Authorization: Bearer <key>" with scope "allocations:read".
 * Returns room allocations with occupant counts, capacity, and bed status.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, "allocations:read");
  if (!auth.success) {
    return auth.response;
  }

  const { institutionId, apiKey } = auth.context;

  const hostelRepo = new HostelRepository(institutionId);
  const roomRepo = new RoomRepository(institutionId);
  const bedRepo = new BedRepository(institutionId);

  const hostels = await hostelRepo.find({});
  const rooms = await roomRepo.find({});
  const beds = await bedRepo.find({});

  // Group beds by room_id
  const bedsByRoom = new Map<string, typeof beds>();
  for (const b of beds) {
    const rid = b.room_id.toString();
    const cur = bedsByRoom.get(rid) || [];
    cur.push(b);
    bedsByRoom.set(rid, cur);
  }

  // Group rooms by hostel_id
  const roomsByHostel = new Map<string, typeof rooms>();
  for (const r of rooms) {
    const hid = r.hostel_id.toString();
    const cur = roomsByHostel.get(hid) || [];
    cur.push(r);
    roomsByHostel.set(hid, cur);
  }

  const result = hostels.map((h) => {
    const hRooms = roomsByHostel.get(h._id.toString()) || [];
    return {
      hostel_id: h._id.toString(),
      name: h.name,
      gender_policy: h.gender_policy,
      rooms: hRooms.map((rm) => {
        const rmBeds = bedsByRoom.get(rm._id.toString()) || [];
        const occupied = rmBeds.filter((b) => b.status === "occupied").length;
        const available = rmBeds.filter((b) => b.status === "available").length;
        return {
          room_id: rm._id.toString(),
          room_number: rm.room_number,
          room_type: rm.room_type,
          capacity: rm.capacity,
          accessible: rm.accessible,
          ac: rm.ac,
          status: rm.status,
          occupied_beds: occupied,
          available_beds: available,
          beds: rmBeds.map((b) => ({
            bed_id: b._id.toString(),
            bed_no: b.bed_no,
            status: b.status,
          })),
        };
      }),
    };
  });

  return NextResponse.json(
    {
      success: true,
      authenticated_as: {
        key_id: apiKey._id.toString(),
        key_name: apiKey.name,
        prefix: apiKey.key_prefix,
        scope: "allocations:read",
      },
      hostels: result,
    },
    {
      status: 200,
      headers: {
        "X-RateLimit-Limit": String(apiKey.rate_limit),
      },
    },
  );
}
