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
import { computeAuditHash } from "./canonical-json.js";

export interface AppendAuditInput {
  institution_id?: string | Types.ObjectId;
  institutionId?: string | Types.ObjectId;
  actor: Record<string, unknown> | string;
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

    AuditService.institutionLocks.set(institutionIdStr, currentLock.then(() => nextLock));

    try {
      await currentLock;
      return await operation();
    } finally {
      releaseLock!();
      if (AuditService.institutionLocks.get(institutionIdStr) === nextLock) {
        AuditService.institutionLocks.delete(institutionIdStr);
      }
    }
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

    // Serialize appends per institution to avoid transaction write conflicts
    return AuditService.acquireLock(instIdStr, async () => {
      return runInTransaction(
        async (txSession) => {
          // 1. Locate or initialize the AuditChainHead document
          let head = await AuditChainHeadModel.findOne({
            institution_id: institutionId,
          }).session(txSession);

          if (!head) {
            // Find existing entries if head was missing
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

          // 2. Build canonical payload for deterministic hashing
          const canonicalPayload = {
            institution_id: instIdStr,
            sequence: nextSequence,
            actor: input.actor,
            action: input.action,
            target: input.target ?? null,
            before: input.before ?? null,
            after: input.after ?? null,
            ip: input.ip ?? null,
            timestamp: timestamp.toISOString(),
          };

          const hash = computeAuditHash(prevHash, canonicalPayload);

          // 3. Atomically advance chain head
          head.last_sequence = nextSequence;
          head.last_hash = hash;
          await head.save({ session: txSession });

          // 4. Create immutable AuditEntry
          const [entry] = await AuditEntryModel.create(
            [
              {
                institution_id: institutionId,
                sequence: nextSequence,
                actor: input.actor,
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

  /**
   * Instance method forwarding to static append with instance's institutionId.
   */
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
   * Returns the first broken AuditEntry document, or null if the chain is intact.
   */
  public static async verifyChain(
    institutionId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<AuditEntryDocument | null> {
    const objectId =
      typeof institutionId === "string"
        ? new Types.ObjectId(institutionId)
        : institutionId;

    let query = AuditEntryModel.find({
      institution_id: objectId,
    }).sort({ sequence: 1 });

    if (session) {
      query = query.session(session);
    }

    const entries = await query.exec();
    if (entries.length === 0) {
      return null;
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const expectedSequence = i + 1;

      // Check sequence monotonicity and continuity
      if (entry.sequence !== expectedSequence) {
        return entry;
      }

      // Check previous hash linkage
      if (entry.prev_hash !== expectedPrevHash) {
        return entry;
      }

      // Recompute canonical entry hash
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

      const calculatedHash = computeAuditHash(expectedPrevHash, canonicalPayload);
      if (entry.hash !== calculatedHash) {
        return entry;
      }

      expectedPrevHash = entry.hash;
    }

    return null;
  }

  /**
   * Instance method forwarding to static verifyChain.
   */
  public async verifyChain(
    session?: ClientSession,
  ): Promise<AuditEntryDocument | null> {
    if (!this.defaultInstitutionId) {
      throw new Error("Default institutionId not set on AuditService instance.");
    }
    return AuditService.verifyChain(this.defaultInstitutionId, session);
  }
}
