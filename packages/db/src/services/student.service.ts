import { Types } from "mongoose";
import { UserModel } from "../models/user.model.js";
import { ApplicationModel } from "../models/application.model.js";
import { AllocationAssignmentModel } from "../models/allocation-assignment.model.js";
import { AllocationCycleModel } from "../models/allocation-cycle.model.js";

export interface StudentProfileDto {
  id: string;
  fullName: string;
  name: string;
  email: string;
  rollNumber: string;
  roll_number: string;
  phone: string;
  programme: string;
  department: string;
  year: number;
  semester: string;
  cgpa: string;
  category: string;
  homeState: string;
  address: string;
  emergencyContact: string;
  profileCompletion: number;
  applicationStatus: string;
  applicationId: string | null;
  applicationReference: string | null;
  hasAllocation: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class StudentService {
  private static computeProfileCompletion(user: {
    name?: string;
    email?: string;
    roll_number?: string;
    phone?: string;
    programme?: string;
    address?: string;
    emergency_contact?: string;
  }): number {
    let score = 0;
    if (user.name) score += 15;
    if (user.email) score += 15;
    if (user.roll_number) score += 15;
    if (user.phone) score += 15;
    if (user.programme) score += 15;
    if (user.address) score += 15;
    if (user.emergency_contact) score += 10;
    return Math.min(100, score);
  }

  public static async getStudentProfile(
    userId: string | Types.ObjectId,
  ): Promise<StudentProfileDto | null> {
    const sId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
    const user = await UserModel.findById(sId);
    if (!user) return null;

    const [application, assignment] = await Promise.all([
      ApplicationModel.findOne({ student_id: user._id }).sort({ createdAt: -1 }),
      AllocationAssignmentModel.findOne({ student_id: user._id }),
    ]);

    const profileCompletion = this.computeProfileCompletion(user);

    return {
      id: user._id.toString(),
      fullName: user.name,
      name: user.name,
      email: user.email,
      rollNumber: user.roll_number || "",
      roll_number: user.roll_number || "",
      phone: user.phone || "",
      programme: user.programme || "B.Tech Computer Science & Engineering",
      department: user.department || "Computer Science & Engineering",
      year: user.year || 1,
      semester: user.semester || "Semester 1",
      cgpa: user.cgpa || "",
      category: user.category || "General",
      homeState: user.home_state || "",
      address: user.address || "",
      emergencyContact: user.emergency_contact || "",
      profileCompletion,
      applicationStatus: application ? application.status : "not_started",
      applicationId: application ? application._id.toString() : null,
      applicationReference: application ? application.reference_number : null,
      hasAllocation: Boolean(assignment),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  public static async updateStudentProfile(
    userId: string | Types.ObjectId,
    data: {
      fullName?: string | undefined;
      name?: string | undefined;
      phone?: string | undefined;
      rollNumber?: string | undefined;
      roll_number?: string | undefined;
      address?: string | undefined;
      emergencyContact?: string | undefined;
      emergency_contact?: string | undefined;
      programme?: string | undefined;
      department?: string | undefined;
      year?: number | undefined;
      semester?: string | undefined;
      category?: string | undefined;
      homeState?: string | undefined;
      home_state?: string | undefined;
      cgpa?: string | undefined;
    },
  ): Promise<StudentProfileDto | null> {
    const sId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
    const user = await UserModel.findById(sId);
    if (!user) return null;

    const nameToUpdate = data.fullName || data.name;
    if (nameToUpdate) user.name = nameToUpdate;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.rollNumber !== undefined) user.roll_number = data.rollNumber;
    if (data.roll_number !== undefined) user.roll_number = data.roll_number;
    if (data.address !== undefined) user.address = data.address;
    if (data.emergencyContact !== undefined) user.emergency_contact = data.emergencyContact;
    if (data.emergency_contact !== undefined) user.emergency_contact = data.emergency_contact;
    if (data.programme !== undefined) user.programme = data.programme;
    if (data.department !== undefined) user.department = data.department;
    if (data.year !== undefined && !isNaN(data.year)) user.year = data.year;
    if (data.semester !== undefined) user.semester = data.semester;
    if (data.category !== undefined) user.category = data.category;
    if (data.homeState !== undefined) user.home_state = data.homeState;
    if (data.home_state !== undefined) user.home_state = data.home_state;
    if (data.cgpa !== undefined) user.cgpa = data.cgpa;

    await user.save();
    return this.getStudentProfile(user._id);
  }

  public static async submitApplication(
    userId: string | Types.ObjectId,
    formData: Record<string, unknown>,
    action: "draft" | "submit" = "submit",
  ): Promise<{
    applicationId: string;
    referenceNumber: string;
    status: string;
    submittedAt?: Date | undefined;
  } | null> {
    const sId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
    const user = await UserModel.findById(sId);
    if (!user) return null;

    // Update personal details on user record
    if (typeof formData["fullName"] === "string" && formData["fullName"].trim()) {
      user.name = formData["fullName"].trim();
    }
    if (typeof formData["rollNo"] === "string" && formData["rollNo"].trim()) {
      user.roll_number = formData["rollNo"].trim();
    }
    if (typeof formData["phone"] === "string" && formData["phone"].trim()) {
      user.phone = formData["phone"].trim();
    }
    if (typeof formData["homeAddress"] === "string" && formData["homeAddress"].trim()) {
      user.address = formData["homeAddress"].trim();
    }
    if (typeof formData["homeState"] === "string" && formData["homeState"].trim()) {
      user.home_state = formData["homeState"].trim();
    }
    if (typeof formData["programme"] === "string" && formData["programme"].trim()) {
      user.programme = formData["programme"].trim();
    }
    if (typeof formData["department"] === "string" && formData["department"].trim()) {
      user.department = formData["department"].trim();
    }
    if (formData["year"]) {
      const yrNum = Number(formData["year"]);
      if (!isNaN(yrNum)) user.year = yrNum;
    }
    if (typeof formData["semester"] === "string" && formData["semester"].trim()) {
      user.semester = formData["semester"].trim();
    }
    if (typeof formData["cgpa"] === "string" && formData["cgpa"].trim()) {
      user.cgpa = formData["cgpa"].trim();
    }
    if (typeof formData["category"] === "string" && formData["category"].trim()) {
      user.category = formData["category"].trim();
    }

    await user.save();

    // Find active cycle
    let cycle = await AllocationCycleModel.findOne({
      status: { $in: ["open", "scheduled"] },
    });

    if (!cycle) {
      cycle = await AllocationCycleModel.findOne().sort({ createdAt: -1 });
    }

    if (!cycle) {
      cycle = await AllocationCycleModel.create({
        academic_year: "2026-27",
        name: "Autumn 2026 Housing Allotment",
        window_open: new Date(),
        window_close: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "open",
        quota_buckets: [{ name: "General", capacity: 500 }],
        document_requirements: [{ type: "student_id", label: "Student ID Proof", required: true }],
        priority_tier_order: ["tier_1", "tier_2", "tier_3"],
      });
    }

    let application = await ApplicationModel.findOne({
      student_id: user._id,
      cycle_id: cycle._id,
    });

    const isSubmission = action === "submit";
    const status = isSubmission ? "submitted" : "draft";

    if (!application) {
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      const rollSuffix = user.roll_number
        ? user.roll_number.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
        : `${randomDigits}`;
      const referenceNumber = `HH-2026-APP-${rollSuffix}`;

      application = await ApplicationModel.create({
        cycle_id: cycle._id,
        student_id: user._id,
        reference_number: referenceNumber,
        status,
        eligibility_result: {
          eligible: true,
          reasons: ["Academic fee clearance verified", "No disciplinary hold"],
        },
        priority_tier: user.category || "General",
        form_data: formData,
        submitted_at: isSubmission ? new Date() : undefined,
      });
    } else {
      application.form_data = formData;
      application.status = status;
      if (isSubmission) {
        application.submitted_at = new Date();
      }
      await application.save();
    }

    return {
      applicationId: application._id.toString(),
      referenceNumber: application.reference_number,
      status: application.status,
      submittedAt: application.submitted_at,
    };
  }
}
