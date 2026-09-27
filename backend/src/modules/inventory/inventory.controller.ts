import type { Request, Response } from "express";
import { z } from "zod";
import { InventoryService } from "./inventory.service.js";
import { sendSuccess, sendCreated } from "../../common/utils/response.js";

export const createHostelSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10),
  genderPolicy: z.enum(["MALE", "FEMALE", "COED", "ANY", "male", "female", "coed"]),
  capacity: z.coerce.number().int().min(1),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
});

export const createBlockSchema = z.object({
  hostelId: z.string(),
  name: z.string().min(1),
  code: z.string().min(1),
  floorsCount: z.coerce.number().int().min(1),
});

export const createRoomSchema = z.object({
  hostelId: z.string(),
  blockId: z.string(),
  roomNumber: z.string(),
  floorNumber: z.coerce.number().int().min(0),
  capacity: z.coerce.number().int().min(1).max(10),
  roomType: z.string().default("double"),
  genderPolicy: z.enum(["MALE", "FEMALE", "COED", "ANY", "male", "female", "coed"]).default("COED"),
  isAccessible: z.boolean().optional(),
});

export const createBedSchema = z.object({
  hostelId: z.string(),
  roomId: z.string(),
  bedNumber: z.string(),
});

export const updateBedSchema = z.object({
  status: z
    .enum([
      "available",
      "allocated",
      "occupied",
      "maintenance",
      "out_of_service",
      "held",
      "reserved",
      "blocked",
    ])
    .optional(),
  notes: z.string().optional(),
});

export const importInventorySchema = z.object({
  csvContent: z.string().min(10),
});

export class InventoryController {
  // Hostels
  public static async listHostels(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const hostels = await InventoryService.listHostels(institutionId);
    sendSuccess(res, hostels);
  }

  public static async createHostel(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const hostel = await InventoryService.createHostel(institutionId, req.body, actor);
    sendCreated(res, hostel);
  }

  // Blocks
  public static async listBlocks(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const hostelId = req.query.hostelId as string | undefined;
    const blocks = await InventoryService.listBlocks(institutionId, hostelId);
    sendSuccess(res, blocks);
  }

  public static async createBlock(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const block = await InventoryService.createBlock(institutionId, req.body, actor);
    sendCreated(res, block);
  }

  // Rooms
  public static async listRooms(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const cursor = req.query.cursor as string | undefined;
    const hostelId = req.query.hostelId as string | undefined;
    const blockId = req.query.blockId as string | undefined;
    const floor = req.query.floor ? parseInt(req.query.floor as string, 10) : undefined;

    const result = await InventoryService.listRooms(institutionId, {
      hostelId,
      blockId,
      floor,
      limit,
      cursor,
    });
    sendSuccess(res, result.items, 200, {
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.total,
    });
  }

  public static async createRoom(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const room = await InventoryService.createRoom(institutionId, req.body, actor);
    sendCreated(res, room);
  }

  // Beds
  public static async listBeds(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const cursor = req.query.cursor as string | undefined;
    const roomId = req.query.roomId as string | undefined;
    const hostelId = req.query.hostelId as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await InventoryService.listBeds(institutionId, {
      roomId,
      hostelId,
      status,
      limit,
      cursor,
    });
    sendSuccess(res, result.items, 200, {
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.total,
    });
  }

  public static async createBed(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const bed = await InventoryService.createBed(institutionId, req.body, actor);
    sendCreated(res, bed);
  }

  public static async updateBed(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const bed = await InventoryService.updateBed(
      institutionId,
      req.params.id as string,
      req.body,
      actor,
    );
    sendSuccess(res, bed);
  }

  // Import
  public static async importInventory(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const result = await InventoryService.importInventory(
      institutionId,
      req.body.csvContent,
      actor,
    );
    sendSuccess(res, result);
  }

  // Occupancy
  public static async getOccupancy(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const summary = await InventoryService.getOccupancySummary(institutionId);
    sendSuccess(res, summary);
  }
}
