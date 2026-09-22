import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import {
  HostelRepository,
  BlockRepository,
  RoomRepository,
  BedRepository,
  type BlockDocument,
  type RoomDocument,
  type BedDocument,
} from "@hostelhub/db";
import {
  generate3DBuildingModel,
  generateSampleHostelModel,
  type RawInventoryInput,
} from "@/components/explorer/building-generator";

const paramsSchema = z.object({
  hostelId: z.string().min(1, "Missing hostel ID"),
});

export const dynamic = "force-dynamic";

export const GET = apiHandler(
  {
    public: true,
    params: paramsSchema,
    operationId: "get3DBuildingExplorer",
    summary: "Get 3D Building Explorer model for hostel",
  },
  async ({ params, institution_id, req }) => {
    const tenantId = institution_id || req.headers.get("x-institution-id");
    const { hostelId } = params;

    // If no valid tenant or mock hostelId, fallback gracefully to generated sample
    if (!tenantId || !Types.ObjectId.isValid(hostelId)) {
      const sample = generateSampleHostelModel("Aryabhata Hall");
      return {
        success: true,
        isSample: true,
        model: sample,
      };
    }

    try {
      const hostelRepo = new HostelRepository(tenantId);
      const hostel = await hostelRepo.findById(hostelId);

      if (!hostel) {
        const sample = generateSampleHostelModel("Aryabhata Hall");
        return {
          success: true,
          isSample: true,
          model: sample,
        };
      }

      const blockRepo = new BlockRepository(tenantId);
      const roomRepo = new RoomRepository(tenantId);
      const bedRepo = new BedRepository(tenantId);

      const blocks: BlockDocument[] = await blockRepo.findByHostel(hostel._id);
      blocks.sort((a, b) => a.floor_no - b.floor_no || a.name.localeCompare(b.name));

      const rooms: RoomDocument[] = await roomRepo.find({ hostel_id: hostel._id });
      const roomIds = rooms.map((r) => r._id);

      const beds: BedDocument[] = await bedRepo.find({ room_id: { $in: roomIds } });

      // Group beds by room_id
      const bedsByRoom = new Map<string, BedDocument[]>();
      for (const b of beds) {
        const rid = b.room_id.toString();
        const current = bedsByRoom.get(rid) || [];
        current.push(b);
        bedsByRoom.set(rid, current);
      }

      // Group rooms by block_id
      const roomsByBlock = new Map<string, RoomDocument[]>();
      for (const r of rooms) {
        const bid = r.block_id.toString();
        const current = roomsByBlock.get(bid) || [];
        current.push(r);
        roomsByBlock.set(bid, current);
      }

      // Group blocks by floor_no
      const blocksByFloor = new Map<number, BlockDocument[]>();
      for (const b of blocks) {
        const fNo = b.floor_no;
        const current = blocksByFloor.get(fNo) || [];
        current.push(b);
        blocksByFloor.set(fNo, current);
      }

      // Build hierarchical floors input
      const floorNumbers = Array.from(blocksByFloor.keys()).sort((a, b) => a - b);
      const floorsInput = floorNumbers.map((fNo) => {
        const floorBlocks = blocksByFloor.get(fNo) || [];
        const wings = floorBlocks.map((blk) => {
          const blkRooms = roomsByBlock.get(blk._id.toString()) || [];
          return {
            name: blk.wing || blk.name,
            rooms: blkRooms.map((rm) => {
              const rmBeds = bedsByRoom.get(rm._id.toString()) || [];
              const occupiedCount = rmBeds.filter((b) => b.status === "occupied").length;
              return {
                id: rm._id.toString(),
                roomNumber: rm.room_number,
                roomType: rm.room_type,
                capacity: rm.capacity,
                accessible: rm.accessible,
                ac: rm.ac,
                status: rm.status,
                occupiedCount,
                beds: rmBeds.map((b) => ({
                  id: b._id.toString(),
                  bedNumber: b.bed_no,
                  status: b.status,
                })),
              };
            }),
          };
        });

        return {
          floorNumber: fNo,
          floorLabel: fNo === 0 ? "Ground Floor" : `Floor ${fNo}`,
          wings,
        };
      });

      if (floorsInput.length === 0) {
        const sampleModel = generateSampleHostelModel(hostel.name);
        return {
          success: true,
          model: sampleModel,
        };
      }

      const rawInput: RawInventoryInput = {
        hostel: {
          id: hostel._id.toString(),
          name: hostel.name,
          genderPolicy: hostel.gender_policy as "male" | "female" | "coed",
        },
        floors: floorsInput,
      };

      const model = generate3DBuildingModel(rawInput);

      return {
        success: true,
        model,
      };
    } catch {
      const sample = generateSampleHostelModel("Aryabhata Hall");
      return {
        success: true,
        isSample: true,
        model: sample,
      };
    }
  },
);
