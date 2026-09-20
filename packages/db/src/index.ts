/**
 * @hostelhub/db
 * Multi-tenant database foundation for HostelHub.
 */

export const DB_VERSION = "1.0.0";
export function getDbVersion(): string {
  return DB_VERSION;
}

// Connection & Transaction Helpers
export {
  connectDb,
  disconnectDb,
  getConnection,
  runInTransaction,
  type DatabaseConfig,
} from "./connection.js";

// Base Schema Plugin
export { baseSchemaPlugin, type BaseTenantDocument } from "./plugins/base-schema.plugin.js";

// Repositories
export {
  BaseRepository,
  type PaginationOptions,
  type PaginatedResult,
} from "./repository/base.repository.js";
export { UserRepository } from "./repository/user.repository.js";
export { InstitutionRepository } from "./repository/institution.repository.js";
export { HostelRepository } from "./repository/hostel.repository.js";
export { BlockRepository } from "./repository/block.repository.js";
export { RoomRepository } from "./repository/room.repository.js";
export { BedRepository } from "./repository/bed.repository.js";
export { AllocationCycleRepository } from "./repository/allocation-cycle.repository.js";
export { ApplicationRepository } from "./repository/application.repository.js";
export { ApplicationDocumentRepository } from "./repository/application-document.repository.js";
export { PolicyRuleSetRepository } from "./repository/policy-ruleset.repository.js";
export { PreferenceRepository } from "./repository/preference.repository.js";
export { GroupRepository } from "./repository/group.repository.js";
export { ConsentRecordRepository } from "./repository/consent-record.repository.js";
export { CompatibilityResponseRepository } from "./repository/compatibility-response.repository.js";

// Repository & Schema Errors
export {
  VersionConflictError,
  EntityNotFoundError,
  TenantRequiredError,
  InvalidCursorError,
} from "./repository/errors.js";

// Models & Types
export {
  InstitutionModel,
  type IInstitution,
  type InstitutionDocument,
} from "./models/institution.model.js";

export {
  HostelModel,
  type IHostel,
  type HostelDocument,
  type GenderPolicy,
  type HostelStatus,
} from "./models/hostel.model.js";

export { BlockModel, type IBlock, type BlockDocument } from "./models/block.model.js";

export {
  RoomModel,
  type IRoom,
  type RoomDocument,
  type RoomType,
  type RoomStatus,
} from "./models/room.model.js";

export {
  BedModel,
  type IBed,
  type BedDocument,
  type BedStatus,
  type BedAttributes,
} from "./models/bed.model.js";

export {
  UserModel,
  type IUser,
  type UserRole,
  type UserStatus,
  type UserMfa,
  type UserDocument,
} from "./models/user.model.js";

export {
  AllocationCycleModel,
  type IAllocationCycle,
  type AllocationCycleDocument,
  type AllocationCycleStatus,
  type QuotaBucket,
  type DocumentRequirement,
} from "./models/allocation-cycle.model.js";

export {
  ApplicationModel,
  type IApplication,
  type ApplicationDocument,
  type ApplicationStatus,
  type EligibilityResult,
} from "./models/application.model.js";

export {
  ApplicationDocumentModel,
  type IApplicationDocument,
  type ApplicationDocumentDocument,
  type DocumentScanStatus,
  type DocumentVerifiedBy,
} from "./models/application-document.model.js";

export {
  PolicyRuleSetModel,
  type IPolicyRuleSet,
  type PolicyRuleSetDocument,
} from "./models/policy-ruleset.model.js";

export {
  PreferenceModel,
  type IPreference,
  type PreferenceDocument,
} from "./models/preference.model.js";

export {
  GroupModel,
  type IGroup,
  type GroupDocument,
  type IGroupMember,
  type GroupMemberStatus,
  type GroupStatus,
} from "./models/group.model.js";

export {
  CompatibilityResponseModel,
  type ICompatibilityResponse,
  type CompatibilityResponseDocument,
} from "./models/compatibility-response.model.js";

export {
  ConsentRecordModel,
  type IConsentRecord,
  type ConsentRecordDocument,
} from "./models/consent-record.model.js";

export { CompatibilityReader } from "./services/compatibility-reader.js";

export {
  AuditEntryModel,
  ImmutableAuditError,
  type IAuditEntry,
  type AuditEntryDocument,
} from "./models/audit-entry.model.js";

export {
  AuditChainHeadModel,
  GENESIS_HASH,
  type IAuditChainHead,
  type AuditChainHeadDocument,
} from "./models/audit-head.model.js";

// Audit Service & Cryptographic Hashing
export { AuditService, type AppendAuditInput } from "./services/audit.service.js";

export { toCanonicalJson, sha256, computeAuditHash } from "./services/canonical-json.js";

// Seed
export { seedDatabase, type SeedResult } from "./seed.js";
export {
  generateSyntheticData,
  type SyntheticSeedOptions,
  type SyntheticSeedSummary,
} from "./seed/synthetic.js";
