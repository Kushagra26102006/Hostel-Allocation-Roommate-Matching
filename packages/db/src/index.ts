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

// Prompt 18: Allocation Models
export {
  WeightsVersionModel,
  type IWeightsVersion,
  type WeightsVersionDocument,
} from "./models/weights-version.model.js";

export {
  AllocationRunModel,
  type IAllocationRun,
  type AllocationRunDocument,
  type AllocationRunStatus,
  type AllocationRunProgress,
} from "./models/allocation-run.model.js";

export {
  AllocationDraftModel,
  type IAllocationDraft,
  type AllocationDraftDocument,
  type AllocationDraftStatus,
} from "./models/allocation-draft.model.js";

export {
  AllocationAssignmentModel,
  type IAllocationAssignment,
  type AllocationAssignmentDocument,
} from "./models/allocation-assignment.model.js";

export {
  WaitlistEntryModel,
  type IWaitlistEntry,
  type WaitlistEntryDocument,
} from "./models/waitlist-entry.model.js";

// Prompt 19: Review & Workflow Models
export {
  OverrideModel,
  type IOverride,
  type IOverrideActor,
  type OverrideDocument,
} from "./models/override.model.js";

export {
  ApprovalRecordModel,
  type IApprovalRecord,
  type IApproverInfo,
  type ApprovalRecordDocument,
} from "./models/approval-record.model.js";

export {
  DraftWorkflowService,
  WorkflowError,
  type WorkflowActor,
} from "./services/draft-workflow.service.js";

// Prompt 21: Waitlist & Automatic Promotion Models and Service
export {
  PromotionProposalModel,
  type IPromotionProposal,
  type PromotionProposalDocument,
  type ProposalStatus,
} from "./models/promotion-proposal.model.js";

export {
  PromotionService,
  PromotionServiceError,
  type PromotionNotificationPayload,
  type PromotionNotificationHook,
} from "./services/promotion.service.js";

// Prompt 22: Publication Letters & Student Result Service
export {
  AllocationLetterModel,
  type IAllocationLetter,
  type AllocationLetterDocument,
  type AllocationLetterStatus,
} from "./models/allocation-letter.model.js";

export { LetterService, LetterServiceError } from "./services/letter.service.js";

// Prompt 23: Notification Hub Models and Service
export {
  NotificationModel,
  type NotificationDocument,
  type NotificationCategory,
} from "./models/notification.model.js";

export {
  NotificationPreferenceModel,
  type NotificationPreferenceDocument,
} from "./models/notification-preference.model.js";

export {
  NotificationDeliveryModel,
  type NotificationDeliveryDocument,
} from "./models/notification-delivery.model.js";

export {
  PushSubscriptionModel,
  type PushSubscriptionDocument,
} from "./models/push-subscription.model.js";

export {
  NotificationService,
  type CreateInAppNotificationParams,
  type UserPreferencesDto,
} from "./services/notification.service.js";

// Prompt 24: Room Change, Swaps & Appeals
export {
  RoomChangeRequestModel,
  type IRoomChangeRequest,
  type RoomChangeRequestDocument,
  type RoomChangeRequestStatus,
  type IRoomChangeDecidedBy,
} from "./models/room-change-request.model.js";

export {
  SwapRequestModel,
  type ISwapRequest,
  type SwapRequestDocument,
  type SwapRequestStatus,
} from "./models/swap-request.model.js";

export {
  AppealModel,
  type IAppeal,
  type AppealDocument,
  type AppealModelStatus,
  type AppealModelOutcome,
  type IAppealDecision,
} from "./models/appeal.model.js";

export { RoomChangeService, RoomChangeServiceError } from "./services/room-change.service.js";

export { SwapService, SwapServiceError } from "./services/swap.service.js";

export { AppealService, AppealServiceError } from "./services/appeal.service.js";

// Prompt 25: Reports, Analytics & Fairness
export {
  ReportReadModelModel,
  type IReportReadModel,
  type ReportReadModelDocument,
} from "./models/report-read-model.model.js";

export { ReportService, type ReportFilterOptions } from "./services/report.service.js";

// Prompt 26: What-If Simulator
export {
  SimulationBatchModel,
  type ISimulationBatch,
  type SimulationBatchDocument,
  type ISimulationScenarioEntry,
} from "./models/simulation-batch.model.js";

export {
  SimulatorService,
  type RunSimulationBatchParams,
  type SimulationActor,
  type ScenarioOptions,
} from "./services/simulator.service.js";
