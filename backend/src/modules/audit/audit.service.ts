import { Types } from "mongoose";
import {
  AuditEntryModel,
  AuditChainHeadModel,
  GENESIS_HASH,
  type IAuditEntry,
  type AuditEntryDocument,
} from "@hostelhub/db";
import { computeAuditHash } from "../../common/utils/hash.js";
import { paginateArray, type PaginatedResult } from "../../common/pagination/index.js";

export interface RecordAuditParams {
  institutionId: string;
  actor: {
    userId: string;
    email: string;
    role: string;
  };
  action: string;
  target: {
    resourceType: string;
    resourceId: string;
  };
  before?: unknown;
  after?: unknown;
  ipAddress?: string | undefined;
}

export class AuditService {
  public static async record(params: RecordAuditParams): Promise<AuditEntryDocument> {
    const { institutionId, actor, action, target, before, after, ipAddress } = params;
    const instId = new Types.ObjectId(institutionId);

    let head = await AuditChainHeadModel.findOne({ institution_id: instId });
    if (!head) {
      head = await AuditChainHeadModel.create({
        institution_id: instId,
        last_hash: GENESIS_HASH,
        last_sequence: 0,
      });
    }

    const sequence = head.last_sequence + 1;
    const prevHash = head.last_hash;
    const timestamp = new Date();

    const hash = computeAuditHash({
      prevHash,
      institutionId,
      actor,
      action,
      target,
      before,
      after,
      timestamp,
    });

    const entry = await AuditEntryModel.create({
      institution_id: instId,
      sequence,
      prev_hash: prevHash,
      hash,
      actor,
      action,
      target,
      before,
      after,
      ip: ipAddress ?? "127.0.0.1",
      timestamp,
    });

    head.last_hash = hash;
    head.last_sequence = sequence;
    await head.save();

    return entry;
  }

  public static async listEntries(
    institutionId: string,
    query: {
      limit?: number | undefined;
      cursor?: string | undefined;
      action?: string | undefined;
      resourceType?: string | undefined;
    },
  ): Promise<PaginatedResult<IAuditEntry>> {
    const filter: Record<string, unknown> = { institution_id: new Types.ObjectId(institutionId) };
    if (query.action) filter.action = query.action;
    if (query.resourceType) filter["target.resourceType"] = query.resourceType;

    const entries = await AuditEntryModel.find(filter).sort({ sequence: -1 }).lean<IAuditEntry[]>();
    return paginateArray<IAuditEntry>(entries, query.limit ?? 20, query.cursor);
  }
}
