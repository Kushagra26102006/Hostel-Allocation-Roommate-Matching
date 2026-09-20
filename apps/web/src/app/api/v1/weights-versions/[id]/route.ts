import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { WeightsVersionModel, connectDb } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors.js";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const updateWeightsSchema = z.object({
  version_label: z.string().min(1).trim().optional(),
  weights: z
    .object({
      wP: z.number().min(0).max(1),
      wC: z.number().min(0).max(1),
      wF: z.number().min(0).max(1),
      wD: z.number().min(0).max(1),
      wK: z.number().min(0).max(1),
    })
    .optional(),
  description: z.string().optional(),
});

export const GET = apiHandler(
  {
    permission: "weights:configure",
    params: paramsSchema,
    operationId: "getWeightsVersion",
    summary: "Get single weights version by ID",
  },
  async ({ institution_id, params }) => {
    await connectDb();
    const instId = new Types.ObjectId(institution_id);
    const versionId = new Types.ObjectId(params.id);

    const doc = await WeightsVersionModel.findOne({
      _id: versionId,
      institution_id: instId,
    })
      .lean()
      .exec();

    if (!doc) {
      throw new ApiProblemError({
        status: 404,
        title: "Not Found",
        detail: "Weights version not found",
        code: "NOT_FOUND",
      });
    }

    return {
      weightsVersion: {
        id: doc._id.toString(),
        versionLabel: doc.version_label,
        weights: doc.weights,
        description: doc.description,
        used: doc.used,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    };
  },
);

export const PUT = apiHandler(
  {
    permission: "weights:configure",
    params: paramsSchema,
    body: updateWeightsSchema,
    operationId: "updateWeightsVersion",
    summary: "Update an unused weights version (fails if already used)",
  },
  async ({ institution_id, params, body }) => {
    await connectDb();
    const instId = new Types.ObjectId(institution_id);
    const versionId = new Types.ObjectId(params.id);

    const doc = await WeightsVersionModel.findOne({
      _id: versionId,
      institution_id: instId,
    }).exec();

    if (!doc) {
      throw new ApiProblemError({
        status: 404,
        title: "Not Found",
        detail: "Weights version not found",
        code: "NOT_FOUND",
      });
    }

    if (doc.used) {
      throw new ApiProblemError({
        status: 400,
        title: "Immutable Weights Version",
        detail: "Cannot update a weights version that has already been used in an allocation run.",
        code: "BAD_REQUEST",
      });
    }

    if (body.version_label) doc.version_label = body.version_label;
    if (body.weights) doc.weights = body.weights;
    if (body.description !== undefined) doc.description = body.description;

    await doc.save();

    return {
      weightsVersion: {
        id: doc._id.toString(),
        versionLabel: doc.version_label,
        weights: doc.weights,
        description: doc.description,
        used: doc.used,
        updatedAt: doc.updatedAt,
      },
    };
  },
);

export const DELETE = apiHandler(
  {
    permission: "weights:configure",
    params: paramsSchema,
    operationId: "deleteWeightsVersion",
    summary: "Delete an unused weights version (fails if already used)",
  },
  async ({ institution_id, params }) => {
    await connectDb();
    const instId = new Types.ObjectId(institution_id);
    const versionId = new Types.ObjectId(params.id);

    const doc = await WeightsVersionModel.findOne({
      _id: versionId,
      institution_id: instId,
    }).exec();

    if (!doc) {
      throw new ApiProblemError({
        status: 404,
        title: "Not Found",
        detail: "Weights version not found",
        code: "NOT_FOUND",
      });
    }

    if (doc.used) {
      throw new ApiProblemError({
        status: 400,
        title: "Immutable Weights Version",
        detail: "Cannot delete a weights version that has already been used in an allocation run.",
        code: "BAD_REQUEST",
      });
    }

    await doc.deleteOne();

    return {
      success: true,
      message: "Weights version deleted successfully.",
    };
  },
);
