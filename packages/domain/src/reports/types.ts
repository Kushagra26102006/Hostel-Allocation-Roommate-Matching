/**
 * @hostelhub/domain — reports/types.ts
 *
 * Types and schemas for reports, analytics, read models, and fairness metrics.
 */

export const PRIVACY_SUPPRESSION_THRESHOLD = 5;

export interface SuppressedCount {
  count: number | null;
  is_suppressed: boolean;
  display_value: string;
}

export interface OccupancyBreakdownItem {
  id: string;
  label: string;
  total_beds: number | null;
  occupied_beds: number | null;
  vacant_beds: number | null;
  occupancy_rate: number | null;
  is_suppressed: boolean;
  display_count: string;
}

export interface RoomDrilldownItem {
  roomId: string;
  roomNumber: string;
  capacity: number;
  occupied: number;
  vacant: number;
  roomType: string;
  floor: number;
  accessible: boolean;
  status: "full" | "partial" | "empty";
}

export interface BlockDrilldownItem {
  blockId: string;
  blockName: string;
  total_beds: number;
  occupied_beds: number;
  vacant_beds: number;
  occupancy_rate: number;
  rooms: RoomDrilldownItem[];
}

export interface HostelDrilldownItem {
  hostelId: string;
  hostelName: string;
  genderPolicy: string;
  total_beds: number;
  occupied_beds: number;
  vacant_beds: number;
  occupancy_rate: number;
  blocks: BlockDrilldownItem[];
}

export interface OccupancyReport {
  institution_id: string;
  cycle_id: string;
  academic_year: string;
  generated_at: string;
  total_capacity: number;
  total_occupied: number;
  total_vacant: number;
  overall_occupancy_rate: number;
  by_hostel: OccupancyBreakdownItem[];
  by_block: (OccupancyBreakdownItem & { hostel_id: string; hostel_name: string })[];
  by_room_type: OccupancyBreakdownItem[];
  drilldown: HostelDrilldownItem[];
}

export interface PreferenceRankItem {
  rank: number;
  count: number | null;
  percentage: number | null;
  is_suppressed: boolean;
  display_count: string;
}

export interface QuotaSatisfactionItem {
  category: string;
  count: number | null;
  first_choice_rate: number | null;
  avg_rank: number | null;
  is_suppressed: boolean;
  display_count: string;
}

export interface PreferenceSatisfactionReport {
  institution_id: string;
  cycle_id: string;
  academic_year: string;
  generated_at: string;
  total_assigned: number;
  first_choice_count: number;
  first_choice_rate: number;
  average_rank_satisfied: number;
  rank_distribution: PreferenceRankItem[];
  by_quota_category: QuotaSatisfactionItem[];
}

export interface OverrideWardenItem {
  warden_id: string;
  warden_name: string;
  count: number | null;
  is_suppressed: boolean;
  display_count: string;
}

export interface OverrideCategoryItem {
  category: string;
  count: number | null;
  is_suppressed: boolean;
  display_count: string;
}

export interface OverrideReasonItem {
  reason_code: string;
  count: number | null;
  is_suppressed: boolean;
  display_count: string;
}

export interface OverrideAnalysisReport {
  institution_id: string;
  cycle_id: string;
  academic_year: string;
  generated_at: string;
  total_overrides: number;
  by_warden: OverrideWardenItem[];
  by_category: OverrideCategoryItem[];
  by_reason: OverrideReasonItem[];
}

export interface WaitlistMovementItem {
  quota: string;
  waitlisted: number | null;
  promoted: number | null;
  is_suppressed: boolean;
  display_count: string;
}

export interface WaitlistMovementReport {
  institution_id: string;
  cycle_id: string;
  academic_year: string;
  generated_at: string;
  total_waitlisted: number;
  total_promoted: number;
  total_cancelled_or_expired: number;
  total_active_remaining: number;
  promotion_rate: number;
  avg_wait_days_to_promotion: number;
  by_quota: WaitlistMovementItem[];
}

export interface CycleTimeStage {
  stage_name: string;
  duration_hours: number;
  description: string;
}

export interface CycleTimeReport {
  institution_id: string;
  cycle_id: string;
  cycle_name: string;
  academic_year: string;
  generated_at: string;
  apply_start_at: string;
  published_at: string | null;
  total_cycle_time_hours: number | null;
  total_cycle_time_days: number | null;
  stages: CycleTimeStage[];
}

export interface AccessibilityComplianceReport {
  institution_id: string;
  cycle_id: string;
  academic_year: string;
  generated_at: string;
  total_candidates: number;
  total_accommodated: number;
  compliance_rate: number;
  accessible_rooms_count: number;
  accessible_beds_count: number;
  ground_floor_allocated: number;
  reserved_beds_held: number;
  violations_count: number;
}

export interface YearOnYearMetric {
  key: string;
  label: string;
  current_value: number;
  previous_value: number;
  delta_absolute: number;
  delta_percentage: number;
}

export interface YearOnYearReport {
  institution_id: string;
  cycle_id: string;
  current_year: string;
  previous_year: string;
  generated_at: string;
  metrics: YearOnYearMetric[];
}

export interface FairnessQuotaItem {
  category: string;
  count: number | null;
  first_choice_count: number | null;
  first_choice_rate: number | null;
  avg_score: number | null;
  is_suppressed: boolean;
  display_count: string;
}

export interface PriorityInversionDetail {
  higher_priority_unit_id: string;
  lower_priority_unit_id: string;
  quota_bucket: string;
  higher_priority_rank: number;
  lower_priority_rank: number;
}

export interface FairnessReport {
  institution_id: string;
  run_id: string;
  draft_id?: string | undefined;
  cycle_id: string;
  academic_year: string;
  generated_at: string;
  total_assigned: number;
  first_choice_rate: number;
  gini_preference_score: number;
  category_parity_gap: number;
  priority_inversions: number;
  mean_room_compatibility: number;
  min_room_compatibility: number;
  quota_breakdown: FairnessQuotaItem[];
  inversion_details: PriorityInversionDetail[];
}

export type ReportType =
  | "occupancy"
  | "preference_satisfaction"
  | "override_analysis"
  | "waitlist_movement"
  | "cycle_time"
  | "accessibility_compliance"
  | "year_on_year"
  | "fairness";
