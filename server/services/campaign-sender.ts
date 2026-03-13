import { storage } from "../storage";
import { evaluateSegment, type SegmentFilters } from "./segment-engine";
import { getMergeDataForUser, renderTemplate, type OfferInfo } from "./merge-tag-engine";
import { emailService } from "./email";

/**
 * Small helper to pause between emails so we don't exceed rate limits.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Orchestrate sending a campaign to all users in its audience segment.
 *
 * Steps:
 *  1. Load campaign, template, segment, and optional offer.
 *  2. Evaluate the segment to get matching users.
 *  3. Mark campaign as "sending".
 *  4. For each user: render personalised email, send, record outcome.
 *  5. Update campaign with final stats and mark as "sent".
 */
export async function sendCampaign(
  campaignId: number,
): Promise<{ sent: number; failed: number }> {
  // 1. Load entities
  const campaign = await storage.getCampaign(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
  if (!campaign.templateId) throw new Error(`Campaign ${campaignId} has no template`);
  if (!campaign.segmentId) throw new Error(`Campaign ${campaignId} has no segment`);

  const template = await storage.getEmailTemplate(campaign.templateId);
  if (!template) throw new Error(`Email template ${campaign.templateId} not found`);

  const segment = await storage.getAudienceSegment(campaign.segmentId);
  if (!segment) throw new Error(`Audience segment ${campaign.segmentId} not found`);

  // Load offer if one is attached
  let offer: OfferInfo | undefined;
  if (campaign.offerId) {
    const offerRecord = await storage.getOffer(campaign.offerId);
    if (offerRecord) {
      offer = {
        code: offerRecord.code,
        discountType: offerRecord.discountType,
        discountValue: String(offerRecord.discountValue),
        validUntil: new Date(offerRecord.validUntil),
      };
    }
  }

  // 2. Evaluate segment
  const filters = segment.filters as SegmentFilters;
  const users = await evaluateSegment(filters);

  // 3. Mark campaign as sending
  await storage.updateCampaign(campaignId, {
    status: "sending",
    totalRecipients: users.length,
  });

  // 4. Send to each user
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      // a. Build merge data
      const mergeData = await getMergeDataForUser(user.id, offer);

      // b. Render subject and body
      const renderedSubject = renderTemplate(template.subject, mergeData);
      const renderedBody = renderTemplate(template.body, mergeData);

      // c. Send email
      const success = await (emailService as any).sendCampaignEmail({
        to: user.email,
        subject: renderedSubject,
        html: renderedBody,
      });

      const recipientStatus = success ? "sent" : "bounced";

      // d. Create campaign recipient record
      await storage.createCampaignRecipient({
        campaignId,
        userId: user.id,
        status: recipientStatus,
        sentAt: new Date(),
        renderedSubject,
      });

      // e. Create communication log entry
      await storage.createCommunicationLog({
        userId: user.id,
        channel: campaign.channel ?? "email",
        direction: "outbound",
        subject: renderedSubject,
        body: renderedBody,
        campaignId,
        status: success ? "sent" : "failed",
      });

      if (success) {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(
        `[Campaign ${campaignId}] Failed to send to user ${user.id}:`,
        error,
      );
      failed++;

      // Still record the failed recipient
      try {
        await storage.createCampaignRecipient({
          campaignId,
          userId: user.id,
          status: "bounced",
        });
      } catch {
        // Swallow secondary errors
      }
    }

    // Respect rate limits
    await delay(100);
  }

  // 5. Finalize campaign
  await storage.updateCampaign(campaignId, {
    status: "sent",
    sentAt: new Date(),
    totalRecipients: users.length,
    totalSent: sent,
  });

  return { sent, failed };
}
