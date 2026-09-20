export class VersionConflictError extends Error {
  public readonly id: string;
  public readonly expectedVersion: number;
  public readonly actualVersion?: number | undefined;

  constructor(id: string, expectedVersion: number, actualVersion?: number) {
    super(
      `Version conflict for document "${id}": expected version ${expectedVersion}${
        actualVersion !== undefined ? `, but found version ${actualVersion}` : ""
      }.`,
    );
    this.name = "VersionConflictError";
    this.id = id;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
    Object.setPrototypeOf(this, VersionConflictError.prototype);
  }
}

export class EntityNotFoundError extends Error {
  public readonly id: string;

  constructor(id: string, modelName?: string) {
    super(`Document "${id}"${modelName ? ` in ${modelName}` : ""} not found.`);
    this.name = "EntityNotFoundError";
    this.id = id;
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
  }
}

export class TenantRequiredError extends Error {
  constructor(message = "Institution ID must be specified for tenant-scoped operations.") {
    super(message);
    this.name = "TenantRequiredError";
    Object.setPrototypeOf(this, TenantRequiredError.prototype);
  }
}
