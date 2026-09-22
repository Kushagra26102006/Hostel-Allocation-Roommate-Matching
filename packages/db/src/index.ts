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
  AcademicBlockModel,
  type IAcademicBlock,
  type AcademicBlockDocument,
} from "./models/academic-block.model.js";

export {
  WalkingDistanceCacheModel,
  type IWalkingDistanceCache,
  type WalkingDistanceCacheDocument,
} from "./models/walking-distance-cache.model.js";

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

// Walking Distance Service
export {
  getHostelWalkingMinutesMap,
  precomputeOfflineWalkingDistances,
} from "./services/walking-distance.service.js";

// Prompt O3: QR Check-In & Room Inspection Checklist
export {
  CheckInRecordModel,
  type CheckInStatus,
  type ChecklistItemCondition,
  type IChecklistItemDoc,
  type IChecklistDiffDoc,
  type ICheckInRecord,
  type CheckInRecordDocument,
} from "./models/check-in-record.model.js";

export {
  CheckInService,
  CheckInServiceError,
  type VerifyCheckInResult,
  type RecordCheckInInput,
  type RecordCheckOutInput,
} from "./services/check-in.service.js";

// Prompt O4: Payments Sandbox, Receipts & Refund Details
export {
  PaymentOrderModel,
  type IPaymentOrder,
  type PaymentOrderDocument,
  type PaymentOrderStatus,
  type PaymentFeeType,
  type IWebhookEventRecord,
} from "./models/payment-order.model.js";

export {
  RefundAccountModel,
  type IRefundAccount,
  type RefundAccountDocument,
} from "./models/refund-account.model.js";

export {
  PaymentService,
  PaymentServiceError,
  type CreatePaymentOrderInput,
  type VerifyPaymentInput,
  type WebhookEventPayload,
  type UnpaidResidentItem,
} from "./services/payment.service.js";

// Prompt O6: Public API Keys and Signed Webhooks
export {
  ApiKeyModel,
  type IApiKey,
  type ApiKeyDocument,
  type ApiKeyScope,
} from "./models/api-key.model.js";

export {
  WebhookModel,
  WEBHOOK_EVENTS,
  type IWebhook,
  type WebhookDocument,
  type WebhookEventType,
  type WebhookStatus,
} from "./models/webhook.model.js";

export {
  WebhookDeliveryLogModel,
  type IWebhookDeliveryLog,
  type WebhookDeliveryLogDocument,
} from "./models/webhook-delivery-log.model.js";

export { ApiKeyRepository } from "./repository/api-key.repository.js";
export { WebhookRepository } from "./repository/webhook.repository.js";
export { WebhookDeliveryLogRepository } from "./repository/webhook-delivery-log.repository.js";

export {
  ApiKeyService,
  type CreateApiKeyOptions,
  type CreateApiKeyResult,
  type VerifyApiKeyResult,
} from "./services/api-key.service.js";

export {
  WebhookDispatcherService,
  type DispatchResult,
  type WebhookDispatcherOptions,
} from "./services/webhook-dispatcher.service.js";
