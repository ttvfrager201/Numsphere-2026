"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { getSubscriptionStatus, type SubscriptionStatus } from "@/utils/subscription";

export function useSubscription() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isActive: false,
    status: null,
    subscription: null,
    needsPayment: false,
    isPastDue: false,
    isCanceled: false,
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();

    const checkSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);
      const status = await getSubscriptionStatus(user.id);
      setSubscriptionStatus(status);
      setLoading(false);
    };

    checkSubscription();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const status = await getSubscriptionStatus(session.user.id);
        setSubscriptionStatus(status);
      } else {
        setUser(null);
        setSubscriptionStatus({
          isActive: false,
          status: null,
          subscription: null,
          needsPayment: false,
          isPastDue: false,
          isCanceled: false,
        });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshSubscription = async () => {
    if (!user) return;
    setLoading(true);
    const status = await getSubscriptionStatus(user.id);
    setSubscriptionStatus(status);
    setLoading(false);
  };

  return {
    ...subscriptionStatus,
    loading,
    user,
    refreshSubscription,
  };
}
