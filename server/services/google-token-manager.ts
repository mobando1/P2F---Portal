import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { storage } from "../storage";

class GoogleTokenManager {
  private createOAuth2Client(): OAuth2Client | null {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return new google.auth.OAuth2(clientId, clientSecret);
  }

  async getAuthClientForTutor(tutorId: number): Promise<OAuth2Client | null> {
    const token = await storage.getTutorGoogleToken(tutorId);
    if (!token) return null;

    const client = this.createOAuth2Client();
    if (!client) return null;

    client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.tokenExpiry.getTime(),
    });

    // Refresh if token expires within 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    if (token.tokenExpiry.getTime() - Date.now() < fiveMinutes) {
      try {
        const { credentials } = await client.refreshAccessToken();
        client.setCredentials(credentials);

        await storage.updateTutorGoogleToken(tutorId, {
          accessToken: credentials.access_token!,
          tokenExpiry: new Date(credentials.expiry_date!),
        });
      } catch (error) {
        console.error(`[GoogleTokenManager] Failed to refresh token for tutor ${tutorId}:`, error);
        return null;
      }
    }

    return client;
  }

  async isTutorConnected(tutorId: number): Promise<boolean> {
    const token = await storage.getTutorGoogleToken(tutorId);
    return !!token;
  }

  async getTutorCalendarId(tutorId: number): Promise<string> {
    const token = await storage.getTutorGoogleToken(tutorId);
    return token?.googleCalendarId || "primary";
  }
}

export const googleTokenManager = new GoogleTokenManager();
