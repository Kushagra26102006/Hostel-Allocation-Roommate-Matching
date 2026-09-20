import { apiHandler } from "@/lib/api/handler";
import { getRoleCapabilities } from "@hostelhub/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiHandler(
  {
    permission: null, // Requires authentication, any valid role
    operationId: "getCurrentUser",
    summary: "Get Current Authenticated User",
    description: "Returns the authenticated session user, institution ID, roles, and granted capabilities.",
    tags: ["Authentication"],
  },
  async ({ user }) => {
    const activeRole = user?.roles[0] ?? "student";
    const capabilities = user
      ? user.roles.flatMap((role) => getRoleCapabilities(role))
      : [];
    const uniqueCapabilities = Array.from(new Set(capabilities));

    return {
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        institution_id: user?.institution_id,
        roles: user?.roles,
        hostelAssignments: user?.hostelAssignments ?? [],
        mfaEnabled: !user?.mfaPending,
      },
      capabilities: uniqueCapabilities,
      activeRole,
    };
  },
);
