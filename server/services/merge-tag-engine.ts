import { storage } from "../storage";
import type { User } from "@shared/schema";

const BASE_URL = process.env.APP_URL || "https://passport2fluency.com";

export interface MergeData {
  firstName: string;
  lastName: string;
  email: string;
  level: string;
  classCredits: number;
  userType: string;
  trialStatus: string;
  classesCompleted: number;
  currentStreak: number;
  learningHours: string;
  offerCode?: string;
  offerDiscount?: string;
  offerExpiry?: string;
  packagesUrl: string;
  portalUrl: string;
  tutorName?: string;
}

export interface OfferInfo {
  code: string;
  discountType: string;
  discountValue: string;
  validUntil: Date;
}

/**
 * Build a MergeData object for a given user, optionally attaching offer details.
 */
export async function getMergeDataForUser(
  userId: number,
  offer?: OfferInfo,
): Promise<MergeData> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const progress = await storage.getUserProgress(userId);

  // Try to find the most recent class to get the tutor name
  let tutorName: string | undefined;
  try {
    const userClasses = await storage.getUserClasses(userId);
    if (userClasses.length > 0) {
      // Sort descending by scheduledAt to get the most recent
      const sorted = [...userClasses].sort(
        (a, b) =>
          new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      );
      const latestClass = sorted[0];
      const tutor = await storage.getTutor(latestClass.tutorId);
      tutorName = tutor?.name;
    }
  } catch {
    // Tutor name is optional — ignore errors
  }

  const trialStatus = user.trialCompleted
    ? "completed"
    : user.userType === "trial"
      ? "active"
      : "none";

  const data: MergeData = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    level: user.level,
    classCredits: user.classCredits ?? 0,
    userType: user.userType,
    trialStatus,
    classesCompleted: progress?.classesCompleted ?? 0,
    currentStreak: progress?.currentStreak ?? 0,
    learningHours: progress?.learningHours ?? "0.00",
    packagesUrl: `${BASE_URL}/packages`,
    portalUrl: BASE_URL,
    tutorName,
  };

  if (offer) {
    data.offerCode = offer.code;
    data.offerDiscount =
      offer.discountType === "percentage"
        ? `${offer.discountValue}%`
        : `$${offer.discountValue}`;
    data.offerExpiry = offer.validUntil.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return data;
}

/**
 * Replace all `{{tagName}}` placeholders in the template with the corresponding
 * values from the MergeData object. Unknown tags are left as-is.
 */
export function renderTemplate(template: string, data: MergeData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, tagName: string) => {
    if (tagName in data) {
      const value = (data as Record<string, any>)[tagName];
      return value != null ? String(value) : "";
    }
    // Unknown tag — leave it unchanged
    return match;
  });
}

/**
 * Return the full catalog of available merge tags with descriptions and examples.
 */
export function getAvailableMergeTags(): {
  tag: string;
  description: string;
  example: string;
}[] {
  return [
    { tag: "firstName", description: "Student first name", example: "Maria" },
    { tag: "lastName", description: "Student last name", example: "Garcia" },
    { tag: "email", description: "Student email address", example: "maria@example.com" },
    { tag: "level", description: "Current language level", example: "A2" },
    { tag: "classCredits", description: "Remaining class credits", example: "3" },
    { tag: "userType", description: "User type (trial, lead, customer)", example: "customer" },
    { tag: "trialStatus", description: "Trial status (active, completed, none)", example: "completed" },
    { tag: "classesCompleted", description: "Total classes completed", example: "12" },
    { tag: "currentStreak", description: "Current learning streak in days", example: "5" },
    { tag: "learningHours", description: "Total hours spent learning", example: "24.50" },
    { tag: "offerCode", description: "Promotional offer code", example: "SPRING25" },
    { tag: "offerDiscount", description: "Offer discount amount", example: "25%" },
    { tag: "offerExpiry", description: "Offer expiration date", example: "March 31, 2026" },
    { tag: "packagesUrl", description: "Link to packages page", example: `${BASE_URL}/packages` },
    { tag: "portalUrl", description: "Link to student portal", example: BASE_URL },
    { tag: "tutorName", description: "Name of last/assigned tutor", example: "Prof. Carlos" },
  ];
}
