import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { WeightsVersionModel, connectDb } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors.js";

const weightsSchema = z.object({
  wP: z.number().min(0).max(1),
  wC: z.number().min(0).max(1),
  wF: z.number().min(0).max(1),
  wD: z.number().min(0).max(1),
  wK: z.number().min(0).max(1),
});

const createWeightsVersionSchema = z.object({
  version_label: z.string().min(1).trim(),
  weights: weightsSchema,
  description: z.string().optional(),
});

export const GET = apiHandler(
  {
    permission: "weights:configure",
    operationId: "listWeightsVersions",
    summary: "List all weights versions for institution (sys_admin only)",
  },
  async ({ institution_id }) => {
    await connectDb();
    const instId = new Types.ObjectId(institution_id);
    const versions = await WeightsVersionModel.find({
      institution_id: instId,
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return {
      weightsVersions: versions.map((v) => ({
        id: v._id.toString(),
        versionLabel: v.version_label,
        weights: v.weights,
        description: v.description,
        used: v.used,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })),
    };
  },
);

export const POST = apiHandler(
  {
    permission: "weights:configure",
    body: createWeightsVersionSchema,
    operationId: "createWeightsVersion",
    summary: "Create a new weights version (sys_admin only)",
  },
  async ({ institution_id, user, body, setHeader }) => {
    await connectDb();
    const instId = new Types.ObjectId(institution_id);

    // Verify version_label unique within institution
    const existing = await WeightsVersionModel.findOne({
      institution_id: instId,
      version_label: body.version_label,
    }).exec();

    if (existing) {
      throw new ApiProblemError({
        status: 409,
        title: "Version Exists",
        detail: `Weights version with label '${body.version_label}' already exists.`,
        code: "BAD_REQUEST",
      });
    }

    const doc = await WeightsVersionModel.create({
      institution_id: instId,
      version_label: body.version_label,
      weights: body.weights,
      description: body.description ?? "",
      used: false,
      created_by: user?.id ? new Types.ObjectId(user.id) : new Types.ObjectId(),
    });

    setHeader("Location", `/api/v1/weights-versions/${doc._id.toString()}`);

    return {
      weightsVersion: {
        id: doc._id.toString(),
        versionLabel: doc.version_label,
        weights: doc.weights,
        description: doc.description,
        used: doc.used,
        createdAt: doc.createdAt,
      },
    };
  },
);
