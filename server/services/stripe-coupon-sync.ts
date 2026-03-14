import Stripe from "stripe";
import type { Offer } from "@shared/schema";

const stripeKey = process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const stripe: Stripe | null = stripeKey ? new Stripe(stripeKey) : null;

export type StripeSyncResult =
  | { status: "synced"; stripeCouponId: string; stripePromotionCodeId: string }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

function buildCouponParams(offer: Offer): Stripe.CouponCreateParams {
  const discountValue = parseFloat(offer.discountValue);
  const redeemBy = Math.floor(new Date(offer.validUntil).getTime() / 1000);

  const base: Stripe.CouponCreateParams = {
    name: offer.name,
    redeem_by: redeemBy,
    metadata: { offerId: offer.id.toString(), platform: "passport2fluency" },
  };

  if (offer.discountType === "percentage") {
    return { ...base, percent_off: discountValue };
  } else {
    return { ...base, amount_off: Math.round(discountValue * 100), currency: "usd" };
  }
}

export async function syncOfferToStripe(offer: Offer): Promise<StripeSyncResult> {
  if (!stripe) return { status: "not_configured" };

  try {
    const coupon = await stripe.coupons.create(buildCouponParams(offer));

    const promoParams: Stripe.PromotionCodeCreateParams = {
      coupon: coupon.id,
      code: offer.code,
      active: true,
      metadata: { offerId: offer.id.toString() },
    };
    if (offer.maxUses) promoParams.max_redemptions = offer.maxUses;

    const promoCode = await stripe.promotionCodes.create(promoParams);

    return {
      status: "synced",
      stripeCouponId: coupon.id,
      stripePromotionCodeId: promoCode.id,
    };
  } catch (err: any) {
    console.error("[stripe-coupon-sync] syncOfferToStripe failed:", err.message);
    return { status: "failed", error: err.message };
  }
}

export async function updateStripeCoupon(offer: Offer): Promise<StripeSyncResult> {
  if (!stripe) return { status: "not_configured" };

  // Delete old coupon/promo if they exist
  if (offer.stripePromotionCodeId) {
    try {
      await stripe.promotionCodes.update(offer.stripePromotionCodeId, { active: false });
    } catch (err: any) {
      console.warn("[stripe-coupon-sync] Could not deactivate old promo code:", err.message);
    }
  }
  if (offer.stripeCouponId) {
    try {
      await stripe.coupons.del(offer.stripeCouponId);
    } catch (err: any) {
      console.warn("[stripe-coupon-sync] Could not delete old coupon:", err.message);
    }
  }

  // Re-create with updated values
  return syncOfferToStripe(offer);
}

export async function deleteStripeCoupon(offer: Offer): Promise<void> {
  if (!stripe) return;

  if (offer.stripePromotionCodeId) {
    try {
      await stripe.promotionCodes.update(offer.stripePromotionCodeId, { active: false });
    } catch (err: any) {
      console.warn("[stripe-coupon-sync] Could not deactivate promo code:", err.message);
    }
  }
  if (offer.stripeCouponId) {
    try {
      await stripe.coupons.del(offer.stripeCouponId);
    } catch (err: any) {
      console.warn("[stripe-coupon-sync] Could not delete coupon:", err.message);
    }
  }
}
