import { google } from "googleapis";

import { env } from "@/config/env";

export function getGmailRedirectUri(): string {
  if (env.GOOGLE_REDIRECT_URI) return env.GOOGLE_REDIRECT_URI;
  const base = env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error("GOOGLE_REDIRECT_URI is not configured");
  return `${base.replace(/\/$/, "")}/api/gmail/callback`;
}

export function getOAuthClient() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    getGmailRedirectUri()
  );
}

export function getGmailAuthUrl(userId: string): string {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    state: userId,
  });
}

export function isGmailConfigured(): boolean {
  return Boolean(
    env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      (env.GOOGLE_REDIRECT_URI || env.NEXT_PUBLIC_APP_URL)
  );
}
