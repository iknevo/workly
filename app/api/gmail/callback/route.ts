import { google } from "googleapis";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { gmailAccounts, users } from "@/db/schema";
import { encrypt } from "@/lib/encryption";
import { getOAuthClient } from "@/lib/gmail";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    const reason = error
      ? `Google returned: ${error}`
      : "No authorization code was returned.";
    return NextResponse.redirect(
      `${req.nextUrl.origin}/settings?gmail=error&reason=${encodeURIComponent(reason)}`
    );
  }

  if (!state) {
    return NextResponse.redirect(`${req.nextUrl.origin}/settings?gmail=error&reason=Missing state`);
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(state)) {
    return NextResponse.redirect(`${req.nextUrl.origin}/settings?gmail=error&reason=Invalid state`);
  }

  const [user] = await db.select().from(users).where(eq(users.id, state)).limit(1);
  if (!user) {
    return NextResponse.redirect(
      `${req.nextUrl.origin}/settings?gmail=error&reason=Account not found`
    );
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token || !tokens.access_token || !tokens.expiry_date) {
      return NextResponse.redirect(
        `${req.nextUrl.origin}/settings?gmail=error&reason=Google did not return valid tokens`
      );
    }

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const email = profile.data.emailAddress;

    if (!email) {
      return NextResponse.redirect(
        `${req.nextUrl.origin}/settings?gmail=error&reason=Could not read the account email`
      );
    }

    await db
      .insert(gmailAccounts)
      .values({
        userId: user.id,
        email,
        gmailId: profile.data.emailAddress,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt: new Date(tokens.expiry_date),
      })
      .onConflictDoUpdate({
        target: [gmailAccounts.userId, gmailAccounts.email],
        set: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          tokenExpiresAt: new Date(tokens.expiry_date),
          updatedAt: new Date(),
        },
      });

    return NextResponse.redirect(`${req.nextUrl.origin}/settings?gmail=success`);
  } catch (err) {
    const reason =
      err instanceof Error ? err.message.replace(/["']/g, "") : "Unknown error";
    console.error("Gmail OAuth callback error", err);
    return NextResponse.redirect(
      `${req.nextUrl.origin}/settings?gmail=error&reason=${encodeURIComponent(reason)}`
    );
  }
}
