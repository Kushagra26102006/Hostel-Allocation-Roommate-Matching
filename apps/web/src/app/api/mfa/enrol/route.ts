import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  connectDb,
  UserRepository,
  UserModel,
} from "@hostelhub/db";
import { encryptPayload, decryptPayload } from "@hostelhub/shared";
import {
  generateBackupCodes,
  generateQrCode,
  generateTotpSecret,
  getTotpKeyUri,
  verifyTotpToken,
} from "@/lib/auth/mfa";

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json(
      { error: "Authentication required to enrol in MFA." },
      { status: 401 },
    );
  }

  await connectDb();
  const user = await UserRepository.findByEmailGlobal(session.user.email);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Re-enrolment protection: If MFA is already enabled, require current TOTP code confirmation
  if (user.mfa?.enabled && user.mfa?.secret) {
    let body: { currentTotpToken?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Body optional if not provided
    }

    const currentSecret = decryptPayload<string>(
      JSON.parse(user.mfa.secret),
      user.institution_id.toString(),
    );

    if (
      !body.currentTotpToken ||
      !verifyTotpToken(body.currentTotpToken, currentSecret)
    ) {
      return NextResponse.json(
        {
          error:
            "Re-enrolment requires verifying your current MFA authenticator code.",
        },
        { status: 400 },
      );
    }
  }

  const rawSecret = generateTotpSecret();
  const uri = getTotpKeyUri(user.email, rawSecret);
  const qrCode = await generateQrCode(uri);
  const { plainCodes, hashedCodes } = generateBackupCodes(10);

  // Encrypt TOTP secret at rest with per-institution HKDF key
  const encryptedSecret = JSON.stringify(
    encryptPayload(rawSecret, user.institution_id.toString()),
  );

  // Save pending MFA setup on user model (or memory/Redis) with 15-min expiration
  (user as any).mfaPendingSetup = {
    secret: encryptedSecret,
    hashedCodes,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  };

  // We use direct update to save mfaPendingSetup on user doc
  await UserModel.updateOne(
    { _id: user._id },
    {
      $set: {
        mfaPendingSetup: {
          secret: encryptedSecret,
          hashedCodes,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      },
    },
  );

  // Return ONLY qrCode, uri, and plain backupCodes to display ONCE.
  // Never send secret or hashedCodes back to client!
  return NextResponse.json({
    qrCode,
    uri,
    backupCodes: plainCodes,
  });
}
