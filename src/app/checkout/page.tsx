"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "../../../supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  ArrowLeft,
  Lock,
  Check,
  Sparkles,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/navbar";
import { useToast } from "@/components/ui/use-toast";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
}

// Pricing plans data
const PLANS = {
  starter: {
    name: "Starter",
    price: 29.99,
    minutes: 400,
    numbers: 1,
    features: [
      "400 minutes per month",
      "1 phone number",
      "Coming soon: calling & flows",
    ],
  },
  professional: {
    name: "Professional",
    price: 69.99,
    minutes: 1500,
    numbers: 3,
    features: [
      "1,500 minutes per month",
      "3 phone numbers",
      "Coming soon: calling & flows",
    ],
  },
  business: {
    name: "Business",
    price: 149.99,
    minutes: 3500,
    numbers: 7,
    features: [
      "3,500 minutes per month",
      "7 phone numbers",
      "Coming soon: calling & flows",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 349.99,
    minutes: 10000,
    numbers: 15,
    features: [
      "10,000 minutes per month",
      "15 phone numbers",
      "Coming soon: calling & flows",
    ],
  },
};

function PaymentForm({
  onSuccess,
  disabled,
  amount,
}: {
  onSuccess: () => void;
  disabled?: boolean;
  amount: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) {
      setError("Stripe is not initialized. Please refresh the page.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Please fill in all required fields.");
        setProcessing(false);
        return;
      }

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message || "Payment failed. Please try again.");
        setProcessing(false);
      } else if (result.paymentIntent) {
        if (result.paymentIntent.status === "succeeded") {
          onSuccess();
        } else if (result.paymentIntent.status === "processing") {
          setError("Payment is processing. Please wait...");
          setProcessing(false);
        } else if (result.paymentIntent.status === "requires_payment_method") {
          setError("Payment failed. Please try a different payment method.");
          setProcessing(false);
        } else {
          setError(`Payment status: ${result.paymentIntent.status}`);
          setProcessing(false);
        }
      } else {
        setError("Payment status unknown. Please contact support.");
        setProcessing(false);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      setError(error.message || "Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handlePay}
        disabled={disabled || processing || !stripe || !elements}
        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
      </motion.button>
    </div>
  );
}

export default function CheckoutPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const planKey = searchParams.get("plan") || "starter";
  const priceId = searchParams.get("priceId") || "";

  const plan = PLANS[planKey as keyof typeof PLANS] || PLANS.starter;

  // Redirect if priceId is missing
  useEffect(() => {
    if (!priceId && planKey) {
      console.error("Missing priceId for plan:", planKey);
      toast({
        title: "Plan Configuration Error",
        description: "This plan is not properly configured. Please select a plan from the pricing page.",
        variant: "destructive",
      });
      setTimeout(() => {
        router.push("/pricing");
      }, 2000);
    }
  }, [priceId, planKey, router, toast]);

  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  // Payment flow state
  const [currentStep, setCurrentStep] = useState<
    "config" | "subscription" | "topup" | "success"
  >("config");

  const [subscriptionClientSecret, setSubscriptionClientSecret] = useState<
    string | null
  >(null);
  const [topupClientSecret, setTopupClientSecret] = useState<string | null>(
    null,
  );

  const pricing = useMemo(() => {
    const subscriptionTotal = plan.price;

    // Apply coupon discount
    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.discount_type === "percentage") {
        discount = (subscriptionTotal * appliedCoupon.discount_value) / 100;
      } else {
        discount = appliedCoupon.discount_value;
      }
      // Don't let discount exceed total
      discount = Math.min(discount, subscriptionTotal);
    }

    const discountedSubscriptionTotal = subscriptionTotal - discount;
    const total = discountedSubscriptionTotal;

    return {
      subscriptionTotal,
      discount,
      discountedSubscriptionTotal,
      total,
    };
  }, [plan.price, appliedCoupon]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setCouponLoading(true);
    setCouponError("");

    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .single();

      if (error || !data) {
        setCouponError("Invalid coupon code");
        setCouponLoading(false);
        return;
      }

      // Check if coupon is active
      if (!data.is_active) {
        setCouponError("This coupon is no longer active");
        setCouponLoading(false);
        return;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCouponError("This coupon has expired");
        setCouponLoading(false);
        return;
      }

      // Check usage limit
      if (data.max_uses !== null && data.times_used >= data.max_uses) {
        setCouponError("This coupon has reached its usage limit");
        setCouponLoading(false);
        return;
      }

      setAppliedCoupon(data);
      setCouponError("");
    } catch (error) {
      console.error("Coupon error:", error);
      setCouponError("Failed to apply coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const createCheckout = async () => {
    if (!agree) {
      toast({
        title: "Terms Required",
        description: "Please agree to the Terms of Service",
        variant: "destructive",
      });
      return;
    }

    if (!priceId) {
      toast({
        title: "Invalid Plan",
        description: "Please select a plan from the pricing page",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login?redirect=/checkout?plan=" + planKey);
        setLoading(false);
        return;
      }

      // If coupon is applied, increment usage count
      if (appliedCoupon) {
        const { error: updateError } = await supabase
          .from("coupons")
          .update({ times_used: appliedCoupon.times_used + 1 })
          .eq("id", appliedCoupon.id);

        if (updateError) {
          console.error("Failed to update coupon usage:", updateError);
        }

        // Record coupon usage if table exists
        try {
          await supabase.from("coupon_usage").insert({
            coupon_id: appliedCoupon.id,
            user_id: session.user.id,
            discount_amount: pricing.discount,
            order_total: pricing.total,
          });
        } catch (err) {
          // Table might not exist, ignore
          console.log("Coupon usage table not available");
        }
      }

      const { data, error } = await supabase.functions.invoke(
        "create-subscription",
        {
          body: {
            priceId,
            totalAmount: pricing.total,
            subscriptionAmount: pricing.discountedSubscriptionTotal,
            topupAmount: 0,
            couponId: appliedCoupon?.id,
            discountAmount: pricing.discount,
          },
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      if (error) {
        console.error("Supabase function error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to create checkout",
          variant: "destructive",
        });
        return;
      }

      setSubscriptionClientSecret(data.clientSecret || null);
      setTopupClientSecret(data.topupClientSecret || null);

      if (data.clientSecret) {
        setCurrentStep("subscription");
      } else {
        toast({
          title: "Error",
          description: "Failed to create payment session",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionSuccess = async () => {
    // Verify subscription was created and is active
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        console.log("Payment succeeded, verifying subscription for user:", session.user.id);
        
        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check subscription status
        const { data: subscription, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error("Error fetching subscription:", error);
        } else if (subscription) {
          console.log("Subscription verified:", subscription);
          toast({
            title: "Subscription Active",
            description: `Your ${plan.name} plan is now active!`,
          });
        } else {
          console.warn("No subscription found after payment");
        }
      }
    } catch (error) {
      console.error("Error verifying subscription:", error);
    }

    if (topupClientSecret) {
      setCurrentStep("topup");
    } else {
      setCurrentStep("success");
    }
  };

  const handleTopupSuccess = () => {
    setCurrentStep("success");
  };

  // Features list for the left panel
  const features = plan.features;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-100">
        <AnimatePresence mode="wait">
          {currentStep === "config" && (
            <motion.div
              key="config"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen flex"
            >
              {/* Left Panel - Dark with product info */}
              <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden">
                {/* Background image overlay */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "url('https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-indigo-900/70" />

                <div className="relative z-10 flex flex-col justify-center p-12 w-full">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h1 className="text-4xl font-bold text-white mb-2">
                      Purchase {plan.name}
                    </h1>
                    <p className="text-slate-400 text-lg mb-8">
                      Monthly subscription
                    </p>

                    <div className="flex items-baseline gap-2 mb-8">
                      <span className="text-5xl font-bold text-white">
                        ${pricing.total.toFixed(2)}
                      </span>
                      <span className="text-slate-400">/month</span>
                    </div>

                    <div className="border-t border-slate-700 pt-8">
                      <p className="text-slate-400 text-sm uppercase tracking-wider mb-4">
                        What's included
                      </p>
                      <ul className="space-y-4">
                        {features.map((feature, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="flex items-center gap-3 text-white"
                          >
                            <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-indigo-400" />
                            </div>
                            {feature}
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    {appliedCoupon && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-8 bg-green-500/20 border border-green-500/30 rounded-2xl p-4"
                      >
                        <div className="flex items-center gap-2 text-green-400">
                          <Sparkles className="w-5 h-5" />
                          <span className="font-semibold">
                            {appliedCoupon.code} applied - Save $
                            {pricing.discount.toFixed(2)}!
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Right Panel - White with payment form */}
              <div className="w-full lg:w-1/2 bg-white flex flex-col">
                <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md mx-auto"
                  >
                    {/* Mobile price display */}
                    <div className="lg:hidden mb-8 p-6 bg-slate-900 rounded-2xl text-white">
                      <h2 className="text-xl font-bold mb-2">
                        Purchase {plan.name}
                      </h2>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">
                          ${pricing.total.toFixed(2)}
                        </span>
                        <span className="text-slate-400">/month</span>
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-6">
                      Review Your Plan
                    </h2>

                    {/* Coupon Code */}
                    <div className="mb-6">
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">
                        Coupon Code
                      </Label>
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-700">
                              {appliedCoupon.code}
                            </span>
                            <span className="text-sm text-green-600">
                              (
                              {appliedCoupon.discount_type === "percentage"
                                ? `${appliedCoupon.discount_value}% off`
                                : `$${appliedCoupon.discount_value} off`}
                              )
                            </span>
                          </div>
                          <button
                            onClick={removeCoupon}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Enter code"
                            value={couponCode}
                            onChange={(e) =>
                              setCouponCode(e.target.value.toUpperCase())
                            }
                            className="rounded-xl h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                            disabled={couponLoading}
                          />
                          <Button
                            onClick={applyCoupon}
                            disabled={couponLoading || !couponCode.trim()}
                            variant="outline"
                            className="rounded-xl h-12 px-6 border-slate-200"
                          >
                            {couponLoading ? "..." : "Apply"}
                          </Button>
                        </div>
                      )}
                      {couponError && (
                        <p className="text-sm text-red-500 mt-1">
                          {couponError}
                        </p>
                      )}
                    </div>

                    {/* Order Summary */}
                    <div className="mt-8 p-5 bg-slate-50 rounded-2xl">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">
                            {plan.name} Plan
                          </span>
                          <span>${plan.price.toFixed(2)}</span>
                        </div>
                        {appliedCoupon && pricing.discount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span>-${pricing.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-semibold text-base">
                          <span>Total</span>
                          <span>${pricing.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Terms */}
                    <div className="mt-6 flex items-start gap-3">
                      <Checkbox
                        id="tos"
                        checked={agree}
                        onCheckedChange={(val) => setAgree(Boolean(val))}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="tos"
                        className="text-sm text-slate-600 cursor-pointer leading-relaxed"
                      >
                        I agree to the Terms of Service and understand that my
                        subscription will renew monthly
                      </Label>
                    </div>

                    {/* Continue Button */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={createCheckout}
                      disabled={loading || !agree}
                      className="w-full mt-6 py-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Preparing..." : "Continue to Payment"}
                    </motion.button>

                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <Lock className="w-3 h-3" />
                      <span>Secure, 1-click checkout with Stripe</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === "subscription" && subscriptionClientSecret && (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: subscriptionClientSecret }}
            >
              <motion.div
                key="subscription"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-screen flex"
              >
                {/* Left Panel - Dark with product info */}
                <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "url('https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-indigo-900/70" />

                  <div className="relative z-10 flex flex-col justify-center p-12 w-full">
                    <button
                      onClick={() => setCurrentStep("config")}
                      className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to configuration
                    </button>

                    <h1 className="text-4xl font-bold text-white mb-2">
                      Purchase {plan.name}
                    </h1>
                    <p className="text-slate-400 text-lg mb-8">
                      Monthly subscription
                    </p>

                    <div className="flex items-baseline gap-2 mb-8">
                      <span className="text-5xl font-bold text-white">
                        ${pricing.discountedSubscriptionTotal.toFixed(2)}
                      </span>
                      <span className="text-slate-400">/month</span>
                    </div>

                    <div className="border-t border-slate-700 pt-8">
                      <p className="text-slate-400 text-sm uppercase tracking-wider mb-4">
                        What's included
                      </p>
                      <ul className="space-y-4">
                        {features.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-3 text-white"
                          >
                            <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-indigo-400" />
                            </div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Payment */}
                <div className="w-full lg:w-1/2 bg-white flex flex-col">
                  <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                    <div className="max-w-md mx-auto">
                      {/* Mobile back button */}
                      <button
                        onClick={() => setCurrentStep("config")}
                        className="lg:hidden flex items-center gap-2 text-slate-600 mb-6"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>

                      {/* Mobile price display */}
                      <div className="lg:hidden mb-8 p-6 bg-slate-900 rounded-2xl text-white">
                        <h2 className="text-xl font-bold mb-2">
                          Purchase {plan.name}
                        </h2>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">
                            ${pricing.discountedSubscriptionTotal.toFixed(2)}
                          </span>
                          <span className="text-slate-400">/month</span>
                        </div>
                      </div>

                      <h2 className="text-2xl font-bold text-slate-900 mb-6">
                        Payment
                      </h2>

                      {/* Payment Element */}
                      <div className="mb-6">
                        <PaymentElement
                          options={{
                            layout: "tabs",
                          }}
                        />
                      </div>

                      {/* Pay Button */}
                      <PaymentForm
                        onSuccess={handleSubscriptionSuccess}
                        disabled={!agree}
                        amount={pricing.discountedSubscriptionTotal}
                      />

                      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Lock className="w-3 h-3" />
                        <span>Secure payment powered by Stripe</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Elements>
          )}

          {currentStep === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="min-h-screen flex items-center justify-center p-8"
            >
              <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 mb-6"
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>

                <h1 className="text-3xl font-bold text-slate-900 mb-3">
                  Payment Successful!
                </h1>
                <p className="text-slate-600 mb-8">
                  Your subscription is now active. Welcome aboard!
                </p>

                <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left">
                  <h3 className="font-semibold text-slate-800 mb-4">
                    What's Next?
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-600 text-sm">
                        Your subscription is active
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-600 text-sm">
                        You'll receive a confirmation email shortly
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-600 text-sm">
                        Access your dashboard to manage your service
                      </span>
                    </li>
                  </ul>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push("/dashboard")}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all"
                >
                  Go to Dashboard
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
