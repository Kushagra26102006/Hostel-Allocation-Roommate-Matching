import { apiHandler } from "@/lib/api/handler";
import { getRoleCapabilities, type UserRole } from "@hostelhub/shared";
import { UserRepository } from "@hostelhub/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiHandler(
  {
    permission: null, // Requires authentication, any valid role
    operationId: "getCurrentUser",
    summary: "Get Current Authenticated User",
    description:
      "Returns the authenticated session user, institution ID, roles, and granted capabilities.",
    tags: ["Authentication"],
  },
  async ({ user, institution_id }) => {
    let mfaEnabled = false;
    let activeRole: UserRole =
      (user as unknown as { activeRole?: UserRole })?.activeRole ?? user?.roles[0] ?? "student";

    if (user?.id) {
      try {
        const repo = new UserRepository(institution_id);
        const dbUser = await repo.findById(user.id);
        if (dbUser) {
          mfaEnabled = dbUser.mfa?.enabled ?? false;
          if (dbUser.roles.includes(activeRole)) {
            // Valid active role
          } else {
            activeRole = dbUser.roles[0] ?? "student";
          }
        }
      } catch {
        mfaEnabled = !user.mfaPending;
      }
    }

    const capabilities = user ? user.roles.flatMap((role) => getRoleCapabilities(role)) : [];
    const uniqueCapabilities = Array.from(new Set(capabilities));

    return {
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        institution_id: user?.institution_id,
        roles: user?.roles,
        hostelAssignments: user?.hostelAssignments ?? [],
        mfaEnabled,
      },
      capabilities: uniqueCapabilities,
      activeRole,
    };
  },
);
