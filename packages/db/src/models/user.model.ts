import mongoose, { Schema, model, type Model } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type UserRole =
  "student" | "warden" | "chief_warden" | "hostel_admin" | "dean" | "sys_admin";

export type UserStatus = "active" | "suspended" | "pending" | "invited";

export interface UserMfa {
  enabled: boolean;
  secret?: string;
  method?: "totp" | "sms" | "email";
  backupCodes?: string[];
  lastTimeStep?: number;
}

export interface IUser {
  email: string;
  name: string;
  passwordHash?: string;
  roles: UserRole[];
  mfa: UserMfa;
  hostelAssignments: string[];
  status: UserStatus;
  is_synthetic?: boolean;
}

export interface UserDocument extends BaseTenantDocument, IUser {}

const userMfaSchema = new Schema<UserMfa>(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    secret: {
      type: String,
      select: false,
    },
    method: {
      type: String,
      enum: ["totp", "sms", "email"],
      default: "totp",
    },
    backupCodes: {
      type: [String],
      default: [],
      select: false,
    },
    lastTimeStep: {
      type: Number,
    },
  },
  { _id: false },
);

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    roles: {
      type: [String],
      required: true,
      enum: ["student", "warden", "chief_warden", "hostel_admin", "dean", "sys_admin"],
      default: ["student"],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "User must have at least one role",
      },
    },
    mfa: {
      type: userMfaSchema,
      default: () => ({ enabled: false, backupCodes: [] }),
    },
    hostelAssignments: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending", "invited"],
      default: "active",
      index: true,
    },
    is_synthetic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        if (ret.mfa) {
          delete ret.mfa.secret;
          delete ret.mfa.backupCodes;
        }
        return ret;
      },
    },
  },
);

userSchema.plugin(baseSchemaPlugin);

// Compound unique index on institution_id and email
userSchema.index({ institution_id: 1, email: 1 }, { unique: true });

export const UserModel: Model<UserDocument> =
  (mongoose.models?.["User"] as Model<UserDocument>) || model<UserDocument>("User", userSchema);
