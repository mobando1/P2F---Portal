import { storage } from "../storage";
import type { User } from "@shared/schema";

export interface SegmentRule {
  field: string;
  operator: string;
  value: any;
}

export interface SegmentFilters {
  logic: "AND" | "OR";
  rules: SegmentRule[];
}

/**
 * Compute the number of days between a past date and now.
 * Returns Infinity if the date is null/undefined.
 */
function daysSince(date: Date | string | null | undefined): number {
  if (!date) return Infinity;
  const then = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Evaluate a single numeric comparison.
 */
function compareNumber(actual: number, operator: string, target: number): boolean {
  switch (operator) {
    case "equals":
      return actual === target;
    case "greaterThan":
      return actual > target;
    case "lessThan":
      return actual < target;
    case "greaterThanOrEqual":
      return actual >= target;
    case "lessThanOrEqual":
      return actual <= target;
    default:
      return false;
  }
}

/**
 * Check whether a single rule matches a user.
 * `userTags` is the pre-fetched list of CRM tag names for that user (only loaded when needed).
 */
function matchesRule(
  user: User,
  rule: SegmentRule,
  userTagNames: string[],
): boolean {
  const { field, operator, value } = rule;

  switch (field) {
    // ---- string fields ----
    case "userType":
    case "level": {
      const actual = user[field] as string;
      if (operator === "equals") return actual === value;
      if (operator === "in" && Array.isArray(value)) return value.includes(actual);
      return false;
    }

    // ---- boolean fields ----
    case "trialCompleted":
    case "aiSubscriptionActive": {
      const actual = Boolean(user[field]);
      if (operator === "equals") return actual === Boolean(value);
      return false;
    }

    // ---- numeric field ----
    case "classCredits": {
      const actual = user.classCredits ?? 0;
      return compareNumber(actual, operator, Number(value));
    }

    // ---- computed date fields ----
    case "daysSinceRegistration": {
      const days = daysSince(user.createdAt);
      return compareNumber(days, operator, Number(value));
    }
    case "daysSinceLastActivity": {
      const days = daysSince(user.lastActivityAt);
      return compareNumber(days, operator, Number(value));
    }

    // ---- CRM tags ----
    case "crmTags": {
      if (operator === "includes") {
        return userTagNames.includes(String(value));
      }
      return false;
    }

    default:
      // Unknown field — rule does not match
      return false;
  }
}

/**
 * Determine whether any rule in the filter set requires CRM tag data.
 */
function needsTagData(filters: SegmentFilters): boolean {
  return filters.rules.some((r) => r.field === "crmTags");
}

/**
 * Evaluate segment filters and return all matching users.
 */
export async function evaluateSegment(filters: SegmentFilters): Promise<User[]> {
  const allUsers = await storage.getAllUsers();

  // Pre-fetch tag names for every user only when at least one rule needs them
  const tagMap = new Map<number, string[]>();
  if (needsTagData(filters)) {
    await Promise.all(
      allUsers.map(async (user) => {
        const tags = await storage.getUserCrmTags(user.id);
        tagMap.set(user.id, tags.map((t) => t.name));
      }),
    );
  }

  return allUsers.filter((user) => {
    const tagNames = tagMap.get(user.id) ?? [];

    if (filters.logic === "AND") {
      return filters.rules.every((rule) => matchesRule(user, rule, tagNames));
    }
    // OR logic
    return filters.rules.some((rule) => matchesRule(user, rule, tagNames));
  });
}

/**
 * Count users matching the segment without returning full objects.
 */
export async function countSegment(filters: SegmentFilters): Promise<number> {
  const matched = await evaluateSegment(filters);
  return matched.length;
}
