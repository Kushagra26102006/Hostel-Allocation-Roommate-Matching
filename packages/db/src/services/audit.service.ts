import { type ClientSession, Types } from "mongoose";
import { runInTransaction } from "../connection.js";
import {
  AuditEntryModel,
  type AuditEntryDocument,
} from "../models/audit-entry.model.js";
import {
  AuditChainHeadModel,
  GENESIS_HASH,
} from "../models/audit-head.model.js";
import { computeAuditHash, computeLegacyAuditHash } from "./canonical-json.js";

export interface AuditActor {
  user_id: string;
  email: string;
  roles: string[];
}

export interface AppendAuditInput {
  institution_id?: string | Types.ObjectId;
  institutionId?: string | Types.ObjectId;
  actor: AuditActor | Record<string, unknown> | string;
  action: string;
  target?: Record<string, unknown> | string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string;
  timestamp?: Date;
}

export class AuditService {
  private static institutionLocks = new Map<string, Promise<unknown>>();

  constructor(private readonly defaultInstitutionId?: Types.ObjectId) {}

  public static withTenant(institutionId: string | Types.ObjectId): AuditService {
    const objectId =
      typeof institutionId === "string"
        ? new Types.ObjectId(institutionId)
        : institutionId;
    return new AuditService(objectId);
  }

  /**
   * Acquire an in-process lock per institution to safely serialize concurrent appends.
   */
  private static async acquireLock<T>(
    institutionIdStr: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const currentLock = AuditService.institutionLocks.get(institutionIdStr) ?? Promise.resolve();
    let releaseLock: () => void;

    const nextLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const thisPromise = currentLock.then(() => nextLock);
    AuditService.institutionLocks.set(institutionIdStr, thisPromise);

    try {
      await currentLock;
      return await operation();
    } finally {
      releaseLock!();
      if (AuditService.institutionLocks.get(institutionIdStr) === thisPromise) {
        AuditService.institutionLocks.delete(institutionIdStr);
      }
    }
  }

  /**
   * Normalizes actor input to consistent shape { user_id, email, roles }.
   */
  private static normalizeActor(actor: AuditActor | Record<string, unknown> | string): Record<string, unknown> {
    if (typeof actor === "string") {
      return { user_id: actor, email: "unknown@campus.edu", roles: [] };
    }
    const rec = actor as Record<string, unknown>;
    const userId = (rec["user_id"] ?? rec["userId"] ?? rec["id"] ?? "anonymous") as string;
    const email = (rec["email"] ?? "unknown@campus.edu") as string;
    const roles = Array.isArray(rec["roles"])
      ? rec["roles"]
      : rec["role"]
        ? [rec["role"]]
        : [];
    return { user_id: String(userId), email: String(email), roles };
  }

  /**
   * Append an audit entry to the institution's tamper-evident hash chain.
   * Atomically updates AuditChainHead and saves AuditEntry in a transaction.
   */
  public static async append(
    inputOrTenant: AppendAuditInput | string | Types.ObjectId,
    maybeInput?: AppendAuditInput,
    session?: ClientSession,
  ): Promise<AuditEntryDocument> {
    let institutionId: Types.ObjectId;
    let input: AppendAuditInput;

    if (
      typeof inputOrTenant === "string" ||
      inputOrTenant instanceof Types.ObjectId
    ) {
      institutionId =
        typeof inputOrTenant === "string"
          ? new Types.ObjectId(inputOrTenant)
          : inputOrTenant;
      if (!maybeInput) {
        throw new Error("Audit input must be provided.");
      }
      input = maybeInput;
    } else {
      input = inputOrTenant;
      const rawInst = input.institution_id ?? input.institutionId;
      if (!rawInst) {
        throw new Error("Institution ID is required for audit append.");
      }
      institutionId =
        typeof rawInst === "string" ? new Types.ObjectId(rawInst) : rawInst;
    }

    const instIdStr = institutionId.toString();
    const normalizedActor = AuditService.normalizeActor(input.actor);

    // Serialize appends per institution to avoid transaction write conflicts
    return AuditService.acquireLock(instIdStr, async () => {
      return runInTransaction(
        async (txSession) => {
          let head = await AuditChainHeadModel.findOne({
            institution_id: institutionId,
          }).session(txSession);

          if (!head) {
            const lastEntry = await AuditEntryModel.findOne({
              institution_id: institutionId,
            })
              .sort({ sequence: -1 })
              .session(txSession);

            head = new AuditChainHeadModel({
              institution_id: institutionId,
              last_sequence: lastEntry ? lastEntry.sequence : 0,
              last_hash: lastEntry ? lastEntry.hash : GENESIS_HASH,
            });
            await head.save({ session: txSession });
          }

          const nextSequence = head.last_sequence + 1;
          const prevHash = head.last_hash;
          const timestamp = input.timestamp ?? new Date();

          const canonicalPayload = {
            institution_id: instIdStr,
            sequence: nextSequence,
            actor: normalizedActor,
            action: input.action,
            target: input.target ?? null,
            before: input.before ?? null,
            after: input.after ?? null,
            ip: input.ip ?? null,
            timestamp: timestamp.toISOString(),
          };

          const hash = computeAuditHash(prevHash, canonicalPayload);

          head.last_sequence = nextSequence;
          head.last_hash = hash;
          await head.save({ session: txSession });

          const [entry] = await AuditEntryModel.create(
            [
              {
                institution_id: institutionId,
                sequence: nextSequence,
                actor: normalizedActor,
                action: input.action,
                target: input.target ?? null,
                before: input.before ?? null,
                after: input.after ?? null,
                ip: input.ip ?? null,
                timestamp,
                prev_hash: prevHash,
                hash,
              },
            ],
            { session: txSession },
          );

          if (!entry) {
            throw new Error("Failed to insert audit entry into chain.");
          }

          return entry;
        },
        session,
      );
    });
  }

  public async append(
    input: Omit<AppendAuditInput, "institution_id" | "institutionId">,
    session?: ClientSession,
  ): Promise<AuditEntryDocument> {
    if (!this.defaultInstitutionId) {
      throw new Error("Default institutionId not set on AuditService instance.");
    }
    return AuditService.append(
      {
        ...input,
        institution_id: this.defaultInstitutionId,
      },
      undefined,
      session,
    );
  }

  /**
   * Recomputes the entire audit hash chain for an institution.
   * Compares against AuditChainHead sequence/hash and returns broken entry or null.
   */
  public static async verifyChain(
    institutionId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<AuditEntryDocument | null> {
    const objectId =
      typeof institutionId === "string"
        ? new Types.ObjectId(institutionId)
        : institutionId;

    const head = await AuditChainHeadModel.findOne({
      institution_id: objectId,
    }).session(session ?? null);

    let query = AuditEntryModel.find({
      institution_id: objectId,
    }).sort({ sequence: 1 });

    if (session) {
      query = query.session(session);
    }

    const entries = await query.exec();

    // Head says N entries exist but 0 found in DB -> chain broken
    if (head && head.last_sequence > 0 && entries.length === 0) {
      return new AuditEntryModel({
        institution_id: objectId,
        sequence: 1,
        actor: { user_id: "system", email: "system", roles: [] },
        action: "CORRUPT_CHAIN_HEAD_MISMATCH",
        prev_hash: GENESIS_HASH,
        hash: head.last_hash,
        timestamp: new Date(),
      }) as AuditEntryDocument;
    }

    if (entries.length === 0) {
      return null;
    }

    // Head sequence/hash mismatch against last entry
    if (
      head &&
      (head.last_sequence !== entries.length ||
        head.last_hash !== entries[entries.length - 1]!.hash)
    ) {
      return entries[entries.length - 1]!;
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const expectedSequence = i + 1;

      if (entry.sequence !== expectedSequence) {
        return entry;
      }

      if (entry.prev_hash !== expectedPrevHash) {
        return entry;
      }

      const ts =
        entry.timestamp instanceof Date
          ? entry.timestamp
          : new Date(entry.timestamp);

      const canonicalPayload = {
        institution_id: entry.institution_id.toString(),
        sequence: entry.sequence,
        actor: entry.actor,
        action: entry.action,
        target: entry.target ?? null,
        before: entry.before ?? null,
        after: entry.after ?? null,
        ip: entry.ip ?? null,
        timestamp: ts.toISOString(),
      };

      const calculatedHmac = computeAuditHash(expectedPrevHash, canonicalPayload);
      const legacySha256 = computeLegacyAuditHash(expectedPrevHash, canonicalPayload);

      if (entry.hash !== calculatedHmac && entry.hash !== legacySha256) {
        return entry;
      }

      expectedPrevHash = entry.hash;
    }

    return null;
  }

  public async verifyChain(
    session?: ClientSession,
  ): Promise<AuditEntryDocument | null> {
    if (!this.defaultInstitutionId) {
      throw new Error("Default institutionId not set on AuditService instance.");
    }
    return AuditService.verifyChain(this.defaultInstitutionId, session);
  }
}
