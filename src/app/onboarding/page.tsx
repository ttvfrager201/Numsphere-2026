"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "../../../supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Building,
  User,
  Loader2,
  CheckCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Zap,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Define the pricing plans
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 29.99,
    minutes: 400,
    numbers: 1,
    popular: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: 69.99,
    minutes: 1500,
    numbers: 3,
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: 149.99,
    minutes: 3500,
    numbers: 7,
    popular: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 349.99,
    minutes: 10000,
    numbers: 15,
    popular: false,
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [subStep, setSubStep] = useState(0); // For tracking which input field in step 2
  const [accountType, setAccountType] = useState<"individual" | "business">(
    "individual",
  );
  const [businessName, setBusinessName] = useState("");
  const [personalName, setPersonalName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [stripePlans, setStripePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/sign-in");
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    const fetchStripePlans = async () => {
      if (step === 3) {
        setLoadingPlans(true);
        try {
          const { data, error } = await supabase.functions.invoke("get-plans");
          if (error) {
            console.error("Error fetching Stripe plans:", error);
          } else {
            setStripePlans(data || []);
          }
        } catch (error) {
          console.error("Error invoking get-plans function:", error);
        } finally {
          setLoadingPlans(false);
        }
      }
    };
    fetchStripePlans();
  }, [step]);

  const mapPlansWithPriceIds = () => {
    return PLANS.map((plan) => {
      const planPrice = Math.round(plan.price * 100);
      const stripePlan = stripePlans?.find((sp: any) => {
        const spAmount = sp.amount || 0;
        const spNickname = (sp.nickname || "").toLowerCase();
        const planNameLower = plan.name.toLowerCase();

        return (
          spNickname === planNameLower ||
          spAmount === planPrice ||
          (spNickname.includes(planNameLower) &&
            Math.abs(spAmount - planPrice) < 100)
        );
      });

      return {
        ...plan,
        priceId: stripePlan?.id || "",
        stripePlan: stripePlan,
      };
    });
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (accountType === "business") {
        if (!businessName) {
          toast({
            title: "Missing Information",
            description: "Please enter your business name",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Create business account
        const { error: businessError } = await supabase
          .from("business_accounts")
          .insert({
            owner_id: user.id,
            business_name: businessName,
          });

        if (businessError) throw businessError;

        // Update user
        await supabase
          .from("users")
          .update({
            onboarding_complete: true,
            account_type: "business",
          })
          .eq("id", user.id);
      } else {
        if (!personalName) {
          toast({
            title: "Missing Information",
            description: "Please enter your name",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Update user
        await supabase
          .from("users")
          .update({
            onboarding_complete: true,
            account_type: "individual",
            name: personalName,
          })
          .eq("id", user.id);
      }

      toast({
        title: "Welcome! 🎉",
        description: "Your account is ready to use",
      });

      // If a plan was selected, redirect to checkout
      if (selectedPlan) {
        const plansWithPriceIds = mapPlansWithPriceIds();
        const plan = plansWithPriceIds.find((p) => p.id === selectedPlan);
        if (plan?.priceId) {
          router.push(`/checkout?plan=${selectedPlan}&priceId=${plan.priceId}`);
          return;
        }
      }

      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPlan = () => {
    setSelectedPlan(null);
    handleCompleteOnboarding();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background elements */}
      <motion.div
        className="absolute inset-0 opacity-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 2 }}
      >
        <motion.div
          className="absolute top-20 left-20 w-72 h-72 bg-indigo-300 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -30, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-4xl relative z-10"
      >
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95">
          <CardHeader className="text-center pb-8">
            <motion.div
              className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg relative overflow-hidden"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  {step === 1 ? (
                    <User className="w-8 h-8 text-white" />
                  ) : step === 2 ? (
                    <Building className="w-8 h-8 text-white" />
                  ) : (
                    <Zap className="w-8 h-8 text-white" />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${step}-${subStep}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {step === 1
                    ? "Welcome! Let's Get Started"
                    : step === 2 && subStep === 0
                      ? accountType === "business"
                        ? "What's your business name?"
                        : "What's your name?"
                      : step === 2 && subStep === 1
                        ? "Perfect! Ready to continue?"
                        : "Choose Your Plan"}
                </CardTitle>
                <CardDescription className="text-lg">
                  {step === 1
                    ? "Choose your account type to get started"
                    : step === 2 && subStep === 0
                      ? accountType === "business"
                        ? "We'll use this to personalize your experience"
                        : "Let's personalize your experience"
                      : step === 2 && subStep === 1
                        ? "You're all set! Ready to choose a plan?"
                        : "Select a plan that fits your needs (or skip for now)"}
                </CardDescription>
              </motion.div>
            </AnimatePresence>
          </CardHeader>

          <CardContent className="space-y-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Account Type Selection */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.button
                      onClick={() => setAccountType("individual")}
                      className={`p-8 rounded-2xl border-2 transition-all duration-300 ${
                        accountType === "individual"
                          ? "border-indigo-600 bg-indigo-50 shadow-xl scale-105"
                          : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                      }`}
                      whileHover={{ scale: 1.02, y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <motion.div
                        animate={
                          accountType === "individual"
                            ? { scale: [1, 1.2, 1] }
                            : {}
                        }
                        transition={{ duration: 0.3 }}
                      >
                        <User
                          className={`w-16 h-16 mx-auto mb-4 ${
                            accountType === "individual"
                              ? "text-indigo-600"
                              : "text-gray-400"
                          }`}
                        />
                      </motion.div>
                      <h3 className="font-bold text-xl mb-2">Personal</h3>
                      <p className="text-sm text-gray-600">
                        Perfect for individual use and personal projects
                      </p>
                      {accountType === "individual" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="mt-4"
                        >
                          <CheckCircle className="w-6 h-6 text-indigo-600 mx-auto" />
                        </motion.div>
                      )}
                    </motion.button>

                    <motion.button
                      onClick={() => setAccountType("business")}
                      className={`p-8 rounded-2xl border-2 transition-all duration-300 ${
                        accountType === "business"
                          ? "border-indigo-600 bg-indigo-50 shadow-xl scale-105"
                          : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                      }`}
                      whileHover={{ scale: 1.02, y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <motion.div
                        animate={
                          accountType === "business"
                            ? { scale: [1, 1.2, 1] }
                            : {}
                        }
                        transition={{ duration: 0.3 }}
                      >
                        <Building
                          className={`w-16 h-16 mx-auto mb-4 ${
                            accountType === "business"
                              ? "text-indigo-600"
                              : "text-gray-400"
                          }`}
                        />
                      </motion.div>
                      <h3 className="font-bold text-xl mb-2">Business</h3>
                      <p className="text-sm text-gray-600">
                        For teams and organizations
                      </p>
                      {accountType === "business" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="mt-4"
                        >
                          <CheckCircle className="w-6 h-6 text-indigo-600 mx-auto" />
                        </motion.div>
                      )}
                    </motion.button>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={() => {
                        setSubStep(0);
                        setStep(2);
                      }}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-6 text-lg shadow-lg relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center justify-center">
                        Get Started
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </span>
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {/* Step 2: Business/Personal Info - One input at a time */}
              {step === 2 && (
                <motion.div
                  key={`step2-${subStep}`}
                  initial={{ opacity: 0, x: 100, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -100, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <AnimatePresence mode="wait">
                    {accountType === "business" && subStep === 0 && (
                      <motion.div
                        key="business-name"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-6"
                      >
                        <div className="space-y-2">
                          <Label
                            htmlFor="businessName"
                            className="text-xl font-bold text-gray-900 block"
                          >
                            What's your business name?
                          </Label>
                          <p className="text-sm text-gray-600">
                            This will be displayed on your account
                          </p>
                        </div>
                        <Input
                          id="businessName"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && businessName.trim()) {
                              setSubStep(1);
                            }
                          }}
                          placeholder="Acme Corporation"
                          autoFocus
                          className="h-14 text-lg border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Button
                            onClick={() => setSubStep(1)}
                            disabled={!businessName.trim()}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-6 text-lg shadow-lg relative overflow-hidden group"
                          >
                            <span className="relative z-10 flex items-center justify-center">
                              Get Started
                              <ArrowRight className="w-5 h-5 ml-2" />
                            </span>
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}

                    {accountType === "individual" && subStep === 0 && (
                      <motion.div
                        key="personal-name"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-6"
                      >
                        <div className="space-y-2">
                          <Label
                            htmlFor="personalName"
                            className="text-xl font-bold text-gray-900 block"
                          >
                            What's your name?
                          </Label>
                          <p className="text-sm text-gray-600">
                            How should we address you?
                          </p>
                        </div>
                        <Input
                          id="personalName"
                          value={personalName}
                          onChange={(e) => setPersonalName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && personalName.trim()) {
                              setSubStep(1);
                            }
                          }}
                          placeholder="John Doe"
                          autoFocus
                          className="h-14 text-lg border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Button
                            onClick={() => setSubStep(1)}
                            disabled={!personalName.trim()}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-6 text-lg shadow-lg relative overflow-hidden group"
                          >
                            <span className="relative z-10 flex items-center justify-center">
                              Get Started
                              <ArrowRight className="w-5 h-5 ml-2" />
                            </span>
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}

                    {subStep === 1 && (
                      <motion.div
                        key="ready-to-continue"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-6 text-center"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200 }}
                        >
                          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        </motion.div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          Great! Let's continue
                        </h3>
                        <p className="text-gray-600">
                          {accountType === "business"
                            ? `We've saved your business name: ${businessName}`
                            : `Nice to meet you, ${personalName}!`}
                        </p>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Button
                            onClick={() => {
                              setSubStep(0);
                              setStep(3);
                            }}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-6 text-lg shadow-lg"
                          >
                            Continue to Plans
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {subStep === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSubStep(0);
                          setStep(1);
                        }}
                        className="w-full text-gray-600 hover:text-gray-900"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Plan Selection */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  {loadingPlans ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {mapPlansWithPriceIds().map((plan) => (
                          <motion.button
                            key={plan.id}
                            onClick={() =>
                              setSelectedPlan(
                                selectedPlan === plan.id ? null : plan.id,
                              )
                            }
                            className={`p-6 rounded-xl border-2 transition-all duration-300 text-left ${
                              selectedPlan === plan.id
                                ? "border-indigo-600 bg-indigo-50 shadow-xl scale-105"
                                : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                            }`}
                            whileHover={{ scale: 1.02, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            {plan.popular && (
                              <Badge className="mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                Most Popular
                              </Badge>
                            )}
                            <h3 className="font-bold text-xl mb-2">
                              {plan.name}
                            </h3>
                            <div className="mb-4">
                              <span className="text-3xl font-bold">
                                ${plan.price}
                              </span>
                              <span className="text-gray-600">/month</span>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-indigo-600" />
                                <span>
                                  {plan.minutes.toLocaleString()} min/month
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-indigo-600" />
                                <span>
                                  {plan.numbers} phone number
                                  {plan.numbers !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                            {selectedPlan === plan.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="mt-4"
                              >
                                <CheckCircle className="w-6 h-6 text-indigo-600" />
                              </motion.div>
                            )}
                          </motion.button>
                        ))}
                      </div>

                      <div className="flex gap-3 pt-4">
                        <motion.div
                          className="flex-1"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline"
                            onClick={() => setStep(2)}
                            className="w-full h-12 text-lg border-2"
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                          </Button>
                        </motion.div>
                        <motion.div
                          className="flex-1"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="ghost"
                            onClick={handleSkipPlan}
                            disabled={loading}
                            className="w-full h-12 text-lg"
                          >
                            Skip for now
                          </Button>
                        </motion.div>
                        {selectedPlan && (
                          <motion.div
                            className="flex-1"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              onClick={handleCompleteOnboarding}
                              disabled={loading}
                              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold h-12 text-lg shadow-lg relative overflow-hidden group"
                            >
                          {loading ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                  Setting up...
                            </>
                          ) : (
                            <>
                                  Continue
                              <Sparkles className="w-5 h-5 ml-2" />
                            </>
                          )}
                      </Button>
                    </motion.div>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
