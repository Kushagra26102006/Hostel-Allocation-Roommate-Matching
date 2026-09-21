import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Types } from "mongoose";
import { setupTestDatabase, teardownTestDatabase } from "./test-helper.js";
import {
  InstitutionModel,
  HostelModel,
  BlockModel,
  RoomModel,
  BedModel,
  AllocationCycleModel,
  AllocationDraftModel,
  AllocationAssignmentModel,
  AllocationRunModel,
  ApplicationModel,
  UserModel,
  OverrideModel,
  WaitlistEntryModel,
  ReportReadModelModel,
  ReportService,
} from "../index.js";

describe("Prompt 25: Reports Reconciliation & Privacy Suppression Tests", () => {
  let institutionId: Types.ObjectId;
  let cycleId: Types.ObjectId;
  let draftId: Types.ObjectId;
  let runId: Types.ObjectId;
  let hostel1Id: Types.ObjectId;
  let hostel2Id: Types.ObjectId;
  let block1Id: Types.ObjectId;
  let block2Id: Types.ObjectId;
  let reportService: ReportService;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await InstitutionModel.deleteMany({});
    await HostelModel.deleteMany({});
    await BlockModel.deleteMany({});
    await RoomModel.deleteMany({});
    await BedModel.deleteMany({});
    await AllocationCycleModel.deleteMany({});
    await AllocationDraftModel.deleteMany({});
    await AllocationRunModel.deleteMany({});
    await AllocationAssignmentModel.deleteMany({});
    await ApplicationModel.deleteMany({});
    await UserModel.deleteMany({});
    await OverrideModel.deleteMany({});
    await WaitlistEntryModel.deleteMany({});
    await ReportReadModelModel.deleteMany({});

    reportService = new ReportService();

    institutionId = new Types.ObjectId();
    cycleId = new Types.ObjectId();
    draftId = new Types.ObjectId();
    runId = new Types.ObjectId();

    await InstitutionModel.create({
      _id: institutionId,
      name: "National Institute of Technology",
      code: "NIT-1",
    });

    await AllocationCycleModel.create({
      _id: cycleId,
      institution_id: institutionId,
      name: "Academic Year 2026-27 Allocation",
      academic_year: "2026-2027",
      status: "open",
      window_open: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      window_close: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      quota_buckets: [{ name: "General", capacity: 10 }],
      document_requirements: [],
      priority_tier_order: ["P1", "P2", "P3"],
    });

    // Create 2 Hostels
    hostel1Id = new Types.ObjectId();
    hostel2Id = new Types.ObjectId();

    await HostelModel.create([
      {
        _id: hostel1Id,
        institution_id: institutionId,
        name: "Aryabhata Hall",
        gender_policy: "male",
        address: "North Campus, NIT",
        status: "active",
      },
      {
        _id: hostel2Id,
        institution_id: institutionId,
        name: "Gargi Hall",
        gender_policy: "female",
        address: "South Campus, NIT",
        status: "active",
      },
    ]);

    // Create 2 Blocks
    block1Id = new Types.ObjectId();
    block2Id = new Types.ObjectId();

    await BlockModel.create([
      {
        _id: block1Id,
        institution_id: institutionId,
        hostel_id: hostel1Id,
        name: "Block A",
        floor_no: 1,
        wing: "East",
      },
      {
        _id: block2Id,
        institution_id: institutionId,
        hostel_id: hostel2Id,
        name: "Block B",
        floor_no: 1,
        wing: "West",
      },
    ]);

    // Create Rooms and Beds:
    // Hostel 1 (Aryabhata): 3 rooms with 2 beds each = 6 beds (total >= 5)
    // Hostel 2 (Gargi): 1 room with 2 beds = 2 beds (total < 5, will test privacy suppression on occupied count)
    const roomDocs: Array<Record<string, unknown>> = [];
    const bedDocs: Array<Record<string, unknown>> = [];

    // 3 Double rooms in Block 1
    for (let i = 1; i <= 3; i++) {
      const rId = new Types.ObjectId();
      roomDocs.push({
        _id: rId,
        institution_id: institutionId,
        hostel_id: hostel1Id,
        block_id: block1Id,
        room_number: `A-10${i}`,
        capacity: 2,
        room_type: "double",
        floor: 1,
        accessible: i === 1,
      });

      for (let b = 1; b <= 2; b++) {
        bedDocs.push({
          _id: new Types.ObjectId(),
          institution_id: institutionId,
          room_id: rId,
          bed_no: `${i}${b === 1 ? "A" : "B"}`,
          status: "available",
          attributes: { window: true, accessible: i === 1 },
        });
      }
    }

    // 1 Double room in Block 2 (2 beds total, occupied count = 2 which is < 5)
    const r2Id = new Types.ObjectId();
    roomDocs.push({
      _id: r2Id,
      institution_id: institutionId,
      hostel_id: hostel2Id,
      block_id: block2Id,
      room_number: "B-201",
      capacity: 2,
      room_type: "double",
      floor: 2,
      accessible: false,
    });
    for (let b = 1; b <= 2; b++) {
      bedDocs.push({
        _id: new Types.ObjectId(),
        institution_id: institutionId,
        room_id: r2Id,
        bed_no: `201${b === 1 ? "A" : "B"}`,
        status: "available",
        attributes: { window: false, accessible: false },
      });
    }

    await RoomModel.create(roomDocs);
    await BedModel.create(bedDocs);

    // Create Draft & Run
    await AllocationRunModel.create({
      _id: runId,
      institution_id: institutionId,
      cycle_id: cycleId,
      seed: 42,
      weights_version: "v1.0",
      rules_version: "1.0.0",
      engine_version: "1.0.0",
      input_hash: "seed_hash_123",
      status: "completed",
      metrics: {
        totalUnits: 8,
        assigned: 7,
        unassigned: 1,
        firstChoiceRate: 0.857,
        avgRankSatisfied: 1.14,
        giniPreferenceScore: 0.082,
        categoryParityGap: 0.05,
        priorityInversions: 0,
        meanRoomCompatibility: 0.91,
        minRoomCompatibility: 0.82,
      },
    });

    await AllocationDraftModel.create({
      _id: draftId,
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      seed: 42,
      input_hash: "seed_hash_123",
      approval_id: "approval_test_123",
      status: "PUBLISHED",
      published_at: new Date(),
    });

    // Populate 5 assignments in Hostel 1 (Aryabhata) and 2 in Hostel 2 (Gargi)
    // Total occupied = 7, total beds = 8
    const h1Beds = bedDocs.slice(0, 5);
    const h2Beds = bedDocs.slice(6, 8); // 2 beds

    const assignments: Array<Record<string, unknown>> = [];
    let studentIndex = 1;

    for (const b of [...h1Beds, ...h2Beds]) {
      const sId = new Types.ObjectId();
      const aId = new Types.ObjectId();

      await UserModel.create({
        _id: sId,
        institution_id: institutionId,
        name: `Student ${studentIndex}`,
        email: `student${studentIndex}@nit.edu`,
        roles: ["student"],
      });

      await ApplicationModel.create({
        _id: aId,
        institution_id: institutionId,
        student_id: sId,
        cycle_id: cycleId,
        reference_number: `APP-2026-${studentIndex}`,
        status: "submitted",
        priority_tier: "P1",
        form_data: {
          quota_category: studentIndex <= 5 ? "General" : "OBC",
          priority_score: 90 - studentIndex,
          accessibility_needed: studentIndex === 1,
        },
      });

      assignments.push({
        _id: new Types.ObjectId(),
        institution_id: institutionId,
        draft_id: draftId,
        run_id: runId,
        application_id: aId,
        student_id: sId,
        bed_id: b._id,
        room_id: b.room_id,
        hostel_id: studentIndex <= 5 ? hostel1Id : hostel2Id,
        score: 85 - studentIndex,
        explanation: JSON.stringify({
          rankSatisfied: studentIndex === 1 ? 1 : studentIndex <= 5 ? 1 : 2,
          quotaBucket: studentIndex <= 5 ? "General" : "OBC",
          priorityTier: "P1",
        }),
      });

      studentIndex++;
    }

    await AllocationAssignmentModel.create(assignments);
  });

  describe("1. Occupancy Numbers Reconciliation & Privacy Suppression", () => {
    it("reconciles raw bed inventory and marks groups < 5 as suppressed", async () => {
      const report = await reportService.getOccupancyReport(institutionId.toString(), {
        cycleId: cycleId.toString(),
        forceLive: true,
      });

      // Total capacity = 8 beds (6 in Aryabhata + 2 in Gargi)
      expect(report.total_capacity).toBe(8);
      // Total occupied = 7 (5 in Aryabhata + 2 in Gargi)
      expect(report.total_occupied).toBe(7);
      expect(report.total_vacant).toBe(1);
      expect(report.overall_occupancy_rate).toBeCloseTo(87.5, 1);

      // Aryabhata has 5 occupied beds (>= 5 -> NOT suppressed)
      const aryabhata = report.by_hostel.find((h) => h.id === hostel1Id.toString())!;
      expect(aryabhata.occupied_beds).toBe(5);
      expect(aryabhata.is_suppressed).toBe(false);
      expect(aryabhata.display_count).toBe("5");

      // Gargi has 2 occupied beds (< 5 threshold -> MUST BE SUPPRESSED)
      const gargi = report.by_hostel.find((h) => h.id === hostel2Id.toString())!;
      expect(gargi.is_suppressed).toBe(true);
      expect(gargi.occupied_beds).toBeNull();
      expect(gargi.occupancy_rate).toBeNull();
      expect(gargi.display_count).toBe("< 5");

      // Verify drilldown contains blocks and rooms
      expect(report.drilldown).toHaveLength(2);
      const h1Drill = report.drilldown.find((d) => d.hostelId === hostel1Id.toString())!;
      expect(h1Drill.blocks).toHaveLength(1);
      expect(h1Drill.blocks[0]!.rooms).toHaveLength(3);
    });
  });

  describe("2. Preference Satisfaction Reconciliation", () => {
    it("reconciles first-choice rate and suppresses quota breakdown with < 5 students", async () => {
      const report = await reportService.getPreferenceSatisfactionReport(institutionId.toString(), {
        cycleId: cycleId.toString(),
        forceLive: true,
      });

      // Total assigned = 7
      expect(report.total_assigned).toBe(7);
      // First choice count: 5 General got rank 1, 2 OBC got rank 2 -> firstChoiceCount = 5
      expect(report.first_choice_count).toBe(5);
      expect(report.first_choice_rate).toBeCloseTo(5 / 7, 2);

      // General quota (5 students) -> unsuppressed
      const general = report.by_quota_category.find((q) => q.category === "General")!;
      expect(general.is_suppressed).toBe(false);
      expect(general.count).toBe(5);
      expect(general.first_choice_rate).toBe(1.0);

      // OBC quota (2 students < 5) -> suppressed
      const obc = report.by_quota_category.find((q) => q.category === "OBC")!;
      expect(obc.is_suppressed).toBe(true);
      expect(obc.count).toBeNull();
      expect(obc.first_choice_rate).toBeNull();
      expect(obc.display_count).toBe("< 5");
    });
  });

  describe("3. Overrides & Waitlist Reports", () => {
    it("aggregates overrides and applies privacy suppression", async () => {
      const wardenId = new Types.ObjectId();
      await UserModel.create({
        _id: wardenId,
        institution_id: institutionId,
        name: "Chief Warden Sharma",
        email: "warden@nit.edu",
        roles: ["warden"],
      });

      // 2 overrides (< 5)
      await OverrideModel.create([
        {
          institution_id: institutionId,
          draft_id: draftId,
          assignment_id: new Types.ObjectId(),
          application_id: new Types.ObjectId(),
          actor: {
            id: wardenId.toString(),
            role: "warden",
            email: "warden@nit.edu",
          },
          from_bed_id: new Types.ObjectId(),
          to_bed_id: new Types.ObjectId(),
          reason: "Medical condition mobility accommodation",
          escalated: false,
        },
        {
          institution_id: institutionId,
          draft_id: draftId,
          assignment_id: new Types.ObjectId(),
          application_id: new Types.ObjectId(),
          actor: {
            id: wardenId.toString(),
            role: "warden",
            email: "warden@nit.edu",
          },
          from_bed_id: new Types.ObjectId(),
          to_bed_id: new Types.ObjectId(),
          reason: "Medical condition mobility accommodation",
          escalated: false,
        },
      ]);

      const report = await reportService.getOverrideAnalysis(institutionId.toString(), {
        cycleId: cycleId.toString(),
        forceLive: true,
      });

      expect(report.total_overrides).toBe(2);
      expect(report.by_category[0]!.is_suppressed).toBe(true);
      expect(report.by_category[0]!.count).toBeNull();
      expect(report.by_category[0]!.display_count).toBe("< 5");
    });

    it("tracks waitlist movement", async () => {
      await WaitlistEntryModel.create([
        {
          institution_id: institutionId,
          cycle_id: cycleId,
          draft_id: draftId,
          run_id: runId,
          application_id: new Types.ObjectId(),
          student_id: new Types.ObjectId(),
          quota_bucket: "General",
          position: 1,
          status: "promoted",
        },
        {
          institution_id: institutionId,
          cycle_id: cycleId,
          draft_id: draftId,
          run_id: runId,
          application_id: new Types.ObjectId(),
          student_id: new Types.ObjectId(),
          quota_bucket: "General",
          position: 2,
          status: "waiting",
        },
      ]);

      const report = await reportService.getWaitlistMovement(institutionId.toString(), {
        cycleId: cycleId.toString(),
        forceLive: true,
      });

      expect(report.total_waitlisted).toBe(2);
      expect(report.total_promoted).toBe(1);
      expect(report.total_active_remaining).toBe(1);
      expect(report.promotion_rate).toBe(0.5);
    });
  });

  describe("4. Accessibility Compliance & Fairness Reports", () => {
    it("reports 100% compliance when candidate is assigned to accessible ground room", async () => {
      const report = await reportService.getAccessibilityCompliance(institutionId.toString(), {
        cycleId: cycleId.toString(),
        forceLive: true,
      });

      expect(report.total_candidates).toBe(1);
      expect(report.total_accommodated).toBe(1);
      expect(report.compliance_rate).toBe(1.0);
      expect(report.violations_count).toBe(0);
    });

    it("verifies 0 priority inversions in fairness report", async () => {
      const report = await reportService.getFairnessReport(
        institutionId.toString(),
        runId.toString(),
      );

      expect(report.priority_inversions).toBe(0);
      expect(report.inversion_details).toHaveLength(0);
      expect(report.gini_preference_score).toBeGreaterThanOrEqual(0);
      expect(report.first_choice_rate).toBeGreaterThan(0);
    });
  });

  describe("5. Read Model Pre-aggregation & Caching", () => {
    it("pre-aggregates and serves subsequent requests from read model", async () => {
      await reportService.refreshReadModels(institutionId.toString(), cycleId.toString());

      const cachedOccupancy = await ReportReadModelModel.findOne({
        institution_id: institutionId,
        cycle_id: cycleId,
        report_type: "occupancy",
      }).lean();

      expect(cachedOccupancy).not.toBeNull();
      expect(cachedOccupancy?.data).toBeDefined();

      // Querying without forceLive returns cached data
      const liveReport = await reportService.getOccupancyReport(institutionId.toString(), {
        cycleId: cycleId.toString(),
        forceLive: false,
      });
      expect(liveReport.total_capacity).toBe(8);
    });
  });

  describe("6. Export Formats (CSV, XLSX, PDF)", () => {
    it("generates a valid CSV export with headers and suppressed values", async () => {
      const exportRes = await reportService.generateExport(
        "occupancy",
        "csv",
        institutionId.toString(),
        { cycleId: cycleId.toString() },
      );

      expect(exportRes.contentType).toContain("text/csv");
      expect(exportRes.filename).toContain(".csv");
      const content = exportRes.buffer.toString("utf-8");

      expect(content).toContain(
        '"Hostel","Total Beds","Occupied Beds","Vacant Beds","Occupancy Rate (%)"',
      );
      expect(content).toContain("Aryabhata Hall");
      expect(content).toContain("< 5"); // Gargi hall count suppressed
    });

    it("generates a valid XLSX binary export", async () => {
      const exportRes = await reportService.generateExport(
        "occupancy",
        "xlsx",
        institutionId.toString(),
        { cycleId: cycleId.toString() },
      );

      expect(exportRes.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(exportRes.filename).toContain(".xlsx");
      expect(exportRes.buffer.length).toBeGreaterThan(1000);
      // First 4 bytes of a valid zip/xlsx archive are PK\x03\x04
      expect(exportRes.buffer[0]).toBe(0x50);
      expect(exportRes.buffer[1]).toBe(0x4b);
    });

    it("generates a valid PDF export starting with %PDF-1.4", async () => {
      const exportRes = await reportService.generateExport(
        "fairness",
        "pdf",
        institutionId.toString(),
        { cycleId: cycleId.toString() },
      );

      expect(exportRes.contentType).toBe("application/pdf");
      expect(exportRes.filename).toContain(".pdf");
      const pdfText = exportRes.buffer.toString("binary");
      expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
      expect(pdfText).toContain("%%EOF");
    });
  });
});
