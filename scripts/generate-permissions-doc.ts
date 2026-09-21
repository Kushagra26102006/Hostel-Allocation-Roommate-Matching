import fs from "node:fs";
import path from "node:path";
import {
  ROLE_PERMISSIONS,
  type UserRole,
  type Capability,
} from "../packages/shared/src/permissions.ts";

const ROLES: UserRole[] = [
  "student",
  "warden",
  "chief_warden",
  "hostel_admin",
  "dean",
  "sys_admin",
];

const ALL_CAPABILITIES: Capability[] = [
  // Student capabilities
  "application:own",
  "preferences:own",
  "questionnaire:own",
  "result:own",
  "room_change:request",
  "appeal:submit",
  // Warden capabilities
  "hostel:review_own",
  "allocation:override_own",
  "allocation:approve_own",
  "allocation:publish_own",
  "waitlist:manage_own",
  "decisions:manage_own",
  // Chief Warden additional
  "hostel:review_all",
  "allocation:escalated_approval",
  "allocation:run",
  "appeals:decide",
  // Hostel Admin
  "inventory:manage",
  "cycles:manage",
  "policy:rules",
  "document:verify",
  // Dean
  "analytics:read",
  "audit:read",
  "drafts:read",
  // Sys Admin
  "weights:configure",
  "users:manage",
  "roles:manage",
  "feature_flags:manage",
  "api_keys:manage",
  "webhooks:manage",
];

function generateMarkdown(): string {
  const lines: string[] = [];

  lines.push("# Role-Based Access Control (RBAC) Permissions Matrix");
  lines.push("");
  lines.push(
    "> **Auto-generated document** from [`packages/shared/src/permissions.ts`](../packages/shared/src/permissions.ts).",
  );
  lines.push("> Do not edit manually. Run `pnpm run generate:permissions-doc` to update.");
  lines.push("");
  lines.push("## Overview of Roles");
  lines.push("");
  lines.push("| Role | Description | Scope |");
  lines.push("| :--- | :--- | :--- |");
  lines.push(
    "| **`student`** | Resident / Applicant student | Own profile, application, questionnaire, results, room changes, appeals |",
  );
  lines.push(
    "| **`warden`** | Residential block warden | Assigned hostel drafts, bed map overrides, waitlist promotions |",
  );
  lines.push(
    "| **`chief_warden`** | Head of campus residence welfare | All hostels, escalated overrides, maker-checker approval, draft publication, appeals |",
  );
  lines.push(
    "| **`hostel_admin`** | Administrative operations manager | Inventory CSV imports, cycle setup, eligibility policies, algorithm run trigger, document verification |",
  );
  lines.push(
    "| **`dean`** | Dean of Student Welfare (DoSW) | Read-only macro analytics, audit hash chain verification, drafts inspection |",
  );
  lines.push(
    "| **`sys_admin`** | Platform system administrator | Engine weights, user management, feature flags, API keys, webhooks, system audit |",
  );
  lines.push("");
  lines.push("## Complete Capability Permission Matrix");
  lines.push("");

  const header = `| Capability | Description | ${ROLES.map((r) => `\`${r}\``).join(" | ")} |`;
  const divider = `| :--- | :--- | ${ROLES.map(() => ":---:").join(" | ")} |`;

  lines.push(header);
  lines.push(divider);

  const capabilityDescriptions: Record<Capability, string> = {
    "application:own": "Create, edit, and submit own hostel application",
    "preferences:own": "Rank hostel and room type preferences",
    "questionnaire:own": "Complete or delete compatibility questionnaire",
    "result:own": "View assigned bed, download letter & access QR pass",
    "room_change:request": "Submit mutual swap or room transfer request",
    "appeal:submit": "Lodge an allocation grievance to appeals committee",
    "hostel:review_own": "View bed maps & assignments in assigned hostel",
    "allocation:override_own": "Move student bed with mandatory audit reason",
    "allocation:approve_own": "Provide Maker approval on draft allocation",
    "allocation:publish_own": "Publish approved draft to provisional list",
    "waitlist:manage_own": "Review waitlist candidates & vacate beds",
    "decisions:manage_own": "Record warden review determinations",
    "hostel:review_all": "View bed maps across all campus residences",
    "allocation:escalated_approval": "Two-person rule approval on escalated overrides",
    "allocation:run": "Execute Gale-Shapley matching algorithm run",
    "appeals:decide": "Adjudicate formal student housing appeals",
    "inventory:manage": "CRUD operations on hostels, blocks, floors, rooms, beds",
    "cycles:manage": "Create, configure, and schedule allocation cycles",
    "policy:rules": "Configure AST DSL eligibility policies and rules",
    "document:verify": "Approve or reject student uploaded documents",
    "analytics:read": "View executive allocation reports & equity charts",
    "audit:read": "Inspect append-only cryptographic audit chain",
    "drafts:read": "Inspect provisional allocation drafts across campus",
    "weights:configure": "Tune Multi-Criteria optimization weights",
    "users:manage": "Provision staff accounts and user directory",
    "roles:manage": "Assign or revoke staff operational roles",
    "feature_flags:manage": "Toggle system capabilities and feature flags",
    "api_keys:manage": "Create and revoke machine-to-machine API keys",
    "webhooks:manage": "Configure institutional webhook dispatch endpoints",
  };

  for (const cap of ALL_CAPABILITIES) {
    const desc = capabilityDescriptions[cap] || cap;
    const cells = ROLES.map((role) => {
      const allowed = ROLE_PERMISSIONS[role].includes(cap);
      return allowed ? "✅" : "❌";
    });
    lines.push(`| \`${cap}\` | ${desc} | ${cells.join(" | ")} |`);
  }

  lines.push("");
  lines.push("## Multi-Role Resolution Strategy");
  lines.push("");
  lines.push(
    "When a user holds multiple roles (e.g. `['warden', 'hostel_admin']`), permissions are evaluated additively using `hasPermission(roles, capability)`:",
  );
  lines.push(
    "- If **any** of the assigned roles grants the required capability, the operation is **permitted**.",
  );
  lines.push(
    "- If **none** of the assigned roles grants the capability, the operation returns `403 Forbidden`.",
  );
  lines.push(
    "- Institutional scoping (`institution_id`) is strictly enforced regardless of granted roles.",
  );
  lines.push("");

  return lines.join("\n");
}

const targetPath = path.resolve(__dirname, "../docs/roles-permissions.md");
const content = generateMarkdown();

if (process.argv.includes("--check")) {
  if (!fs.existsSync(targetPath)) {
    console.error(
      "❌ docs/roles-permissions.md does not exist. Run pnpm run generate:permissions-doc",
    );
    process.exit(1);
  }
  const existing = fs.readFileSync(targetPath, "utf8");
  if (existing.trim() !== content.trim()) {
    console.error(
      "❌ docs/roles-permissions.md is out of date with packages/shared/src/permissions.ts.",
    );
    console.error("Run `pnpm run generate:permissions-doc` to sync.");
    process.exit(1);
  }
  console.log("✅ docs/roles-permissions.md is in sync with permissions.ts");
} else {
  fs.writeFileSync(targetPath, content, "utf8");
  console.log(`✅ Generated docs/roles-permissions.md (${content.length} bytes)`);
}
