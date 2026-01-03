import { createClient } from "../../supabase/client";

export interface SubscriptionStatus {
  isActive: boolean;
  status: string | null;
  subscription: any | null;
  needsPayment: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
}

/**
 * Check if user has an active subscription
 * Returns detailed subscription status
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const supabase = createClient();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !subscription) {
    return {
      isActive: false,
      status: null,
      subscription: null,
      needsPayment: false,
      isPastDue: false,
      isCanceled: false,
    };
  }

  const status = subscription.status?.toLowerCase() || "";
  const isActive = status === "active" || status === "trialing";
  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled" || status === "unpaid";
  const needsPayment = isPastDue || status === "incomplete" || status === "incomplete_expired";

  // Check if subscription period has ended
  const now = Math.floor(Date.now() / 1000);
  const periodEnded = subscription.current_period_end && subscription.current_period_end < now;

  return {
    isActive: isActive && !periodEnded,
    status: subscription.status,
    subscription,
    needsPayment: needsPayment || periodEnded,
    isPastDue,
    isCanceled,
  };
}

/**
 * Check if user has an active subscription (simple boolean)
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const status = await getSubscriptionStatus(userId);
  return status.isActive;
}

/**
 * Get subscription details for display
 */
export async function getSubscriptionDetails(userId: string) {
  const status = await getSubscriptionStatus(userId);
  
  if (!status.subscription) {
    return null;
  }

  return {
    planName: status.subscription.metadata?.plan_name || "Unknown",
    amount: status.subscription.amount ? status.subscription.amount / 100 : 0,
    status: status.status,
    currentPeriodEnd: status.subscription.current_period_end 
      ? new Date(status.subscription.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: status.subscription.cancel_at_period_end || false,
  };
}
