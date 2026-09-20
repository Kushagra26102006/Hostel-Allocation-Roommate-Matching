import {
  type ClientSession,
  type FilterQuery,
  type Model,
  type ProjectionType,
  type QueryOptions,
  Types,
  type UpdateQuery,
} from "mongoose";
import type { BaseTenantDocument } from "../plugins/base-schema.plugin.js";
import { EntityNotFoundError, TenantRequiredError, VersionConflictError } from "./errors.js";

export interface PaginationOptions<T> {
  limit?: number;
  cursor?: string;
  sortField?: keyof T | "_id";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
  total?: number;
}

interface CursorPayload {
  id: string;
  sortValue: unknown;
}

export class BaseRepository<TDoc extends BaseTenantDocument> {
  protected readonly institutionId: Types.ObjectId | null;

  constructor(
    protected readonly model: Model<TDoc>,
    institutionId?: string | Types.ObjectId | null,
  ) {
    this.institutionId = institutionId
      ? typeof institutionId === "string"
        ? new Types.ObjectId(institutionId)
        : institutionId
      : null;
  }

  /**
   * Return a new repository instance scoped to the specified tenant institution ID.
   */
  public withTenant(institutionId: string | Types.ObjectId): this {
    const ctor = this.constructor as new (
      model: Model<TDoc>,
      institutionId: Types.ObjectId,
    ) => this;
    const objectId =
      typeof institutionId === "string" ? new Types.ObjectId(institutionId) : institutionId;
    return new ctor(this.model, objectId);
  }

  protected getInstitutionId(): Types.ObjectId {
    if (!this.institutionId) {
      throw new TenantRequiredError(
        `Operation on ${this.model.modelName} requires tenant context (call withTenant first).`,
      );
    }
    return this.institutionId;
  }

  /**
   * Find documents matching query within the tenant.
   */
  public async find(
    filter: FilterQuery<TDoc> = {},
    projection?: ProjectionType<TDoc>,
    options?: QueryOptions<TDoc>,
    session?: ClientSession,
  ): Promise<TDoc[]> {
    const tenantFilter: FilterQuery<TDoc> = {
      ...filter,
      institution_id: this.getInstitutionId(),
    };

    let query = this.model.find(tenantFilter, projection, options);
    if (session) {
      query = query.session(session);
    }
    return query.exec();
  }

  /**
   * Find a single document by ID within the tenant.
   */
  public async findById(
    id: string | Types.ObjectId,
    projection?: ProjectionType<TDoc>,
    options?: QueryOptions<TDoc>,
    session?: ClientSession,
  ): Promise<TDoc | null> {
    const objectId = typeof id === "string" ? new Types.ObjectId(id) : id;
    const tenantFilter: FilterQuery<TDoc> = {
      _id: objectId,
      institution_id: this.getInstitutionId(),
    } as unknown as FilterQuery<TDoc>;

    let query = this.model.findOne(tenantFilter, projection, options);
    if (session) {
      query = query.session(session);
    }
    return query.exec();
  }

  /**
   * Find a single document matching filter within the tenant.
   */
  public async findOne(
    filter: FilterQuery<TDoc>,
    projection?: ProjectionType<TDoc>,
    options?: QueryOptions<TDoc>,
    session?: ClientSession,
  ): Promise<TDoc | null> {
    const tenantFilter: FilterQuery<TDoc> = {
      ...filter,
      institution_id: this.getInstitutionId(),
    };

    let query = this.model.findOne(tenantFilter, projection, options);
    if (session) {
      query = query.session(session);
    }
    return query.exec();
  }

  /**
   * Create a new document automatically scoped to the tenant.
   */
  public async create(doc: Partial<TDoc>, session?: ClientSession): Promise<TDoc> {
    const payload = {
      ...doc,
      institution_id: this.getInstitutionId(),
      version: 1,
    };

    if (session) {
      const [created] = await this.model.create([payload], { session });
      if (!created) {
        throw new Error("Failed to create document in transaction.");
      }
      return created;
    }

    const created = await this.model.create(payload);
    return created as unknown as TDoc;
  }

  /**
   * Update a document by ID within the tenant.
   */
  public async update(
    id: string | Types.ObjectId,
    updateData: UpdateQuery<TDoc>,
    session?: ClientSession,
  ): Promise<TDoc | null> {
    const objectId = typeof id === "string" ? new Types.ObjectId(id) : id;
    const filter = {
      _id: objectId,
      institution_id: this.getInstitutionId(),
    } as unknown as FilterQuery<TDoc>;

    let query = this.model.findOneAndUpdate(filter, updateData, {
      new: true,
      runValidators: true,
    });

    if (session) {
      query = query.session(session);
    }
    return query.exec();
  }

  /**
   * Optimistic concurrency update.
   * Atomically checks expectedVersion and increments version by 1.
   * Throws VersionConflictError if version doesn't match, or EntityNotFoundError if not found.
   */
  public async updateWithVersion(
    id: string | Types.ObjectId,
    expectedVersion: number,
    updateData: UpdateQuery<TDoc>,
    session?: ClientSession,
  ): Promise<TDoc> {
    const objectId = typeof id === "string" ? new Types.ObjectId(id) : id;
    const filter = {
      _id: objectId,
      institution_id: this.getInstitutionId(),
      version: expectedVersion,
    } as unknown as FilterQuery<TDoc>;

    // Prepare update operation: guarantee $inc version by 1
    const update = { ...updateData };
    if (!update.$inc) {
      update.$inc = { version: 1 } as unknown as UpdateQuery<TDoc>["$inc"];
    } else {
      update.$inc = {
        ...update.$inc,
        version: 1,
      };
    }

    let query = this.model.findOneAndUpdate(filter, update, {
      new: true,
      runValidators: true,
    });

    if (session) {
      query = query.session(session);
    }

    const updated = await query.exec();
    if (updated) {
      return updated;
    }

    // Determine whether entity does not exist or version conflict occurred
    let checkQuery = this.model
      .findOne({
        _id: objectId,
        institution_id: this.getInstitutionId(),
      } as unknown as FilterQuery<TDoc>)
      .select("version");

    if (session) {
      checkQuery = checkQuery.session(session);
    }

    const existing = await checkQuery.lean().exec();
    if (existing) {
      const currentVersion = (existing as unknown as { version: number }).version;
      throw new VersionConflictError(String(id), expectedVersion, currentVersion);
    }

    throw new EntityNotFoundError(String(id), this.model.modelName);
  }

  /**
   * Cursor-based pagination scoped to the tenant.
   */
  public async paginate(
    filter: FilterQuery<TDoc> = {},
    options: PaginationOptions<TDoc> = {},
    session?: ClientSession,
  ): Promise<PaginatedResult<TDoc>> {
    const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
    const sortField = (options.sortField ?? "_id") as string;
    const sortOrder = options.sortOrder ?? "asc";
    const orderDirection = sortOrder === "asc" ? 1 : -1;

    const baseFilter: FilterQuery<TDoc> = {
      ...filter,
      institution_id: this.getInstitutionId(),
    };

    // Apply cursor if provided
    if (options.cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(options.cursor, "base64").toString("utf8"),
        ) as CursorPayload;

        const cursorSortValue = decoded.sortValue;
        const cursorId = new Types.ObjectId(decoded.id);

        if (sortField === "_id") {
          const comparison = orderDirection === 1 ? "$gt" : "$lt";
          baseFilter._id = { [comparison]: cursorId } as unknown as FilterQuery<TDoc>["_id"];
        } else {
          const compPrimary = orderDirection === 1 ? "$gt" : "$lt";
          const compTieBreaker = orderDirection === 1 ? "$gt" : "$lt";

          const orConditions = [
            { [sortField]: { [compPrimary]: cursorSortValue } },
            {
              [sortField]: cursorSortValue,
              _id: { [compTieBreaker]: cursorId },
            },
          ];

          if (baseFilter.$or) {
            baseFilter.$and = [
              { $or: baseFilter.$or },
              { $or: orConditions },
            ] as unknown as FilterQuery<TDoc>["$and"];
            delete baseFilter.$or;
          } else {
            baseFilter.$or = orConditions as unknown as FilterQuery<TDoc>["$or"];
          }
        }
      } catch {
        // Invalid cursor: fall back to first page
      }
    }

    const sortObject: Record<string, 1 | -1> = {
      [sortField]: orderDirection,
    };
    if (sortField !== "_id") {
      sortObject["_id"] = orderDirection;
    }

    let query = this.model
      .find(baseFilter)
      .sort(sortObject)
      .limit(limit + 1);

    if (session) {
      query = query.session(session);
    }

    const docs = await query.exec();
    const hasNextPage = docs.length > limit;
    const items = hasNextPage ? docs.slice(0, limit) : docs;

    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1]!;
      const lastSortVal = (lastItem as unknown as Record<string, unknown>)[sortField];
      const payload: CursorPayload = {
        id: (lastItem._id as Types.ObjectId).toString(),
        sortValue: lastSortVal,
      };
      nextCursor = Buffer.from(JSON.stringify(payload)).toString("base64");
    }

    return {
      items,
      nextCursor,
      hasNextPage,
    };
  }
}
