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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Building,
  Users,
  Loader2,
  CheckCircle,
  Sparkles,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<"individual" | "business">(
    "individual",
  );
  const [businessName, setBusinessName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [secondaryColor, setSecondaryColor] = useState("#7C3AED");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(
    null,
  );

  // Widget preferences
  const [widgets, setWidgets] = useState({
    overview_stats: true,
    recent_calls: true,
    call_flows: true,
    phone_numbers: true,
    quick_actions: true,
  });

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
    if (subdomain && subdomain.length >= 3) {
      const timer = setTimeout(async () => {
        setCheckingSubdomain(true);
        try {
          const response = await fetch(
            `/api/business/check-subdomain?subdomain=${subdomain}`,
          );
          const data = await response.json();
          setSubdomainAvailable(data.available);
        } catch (error) {
          console.error("Error checking subdomain:", error);
        } finally {
          setCheckingSubdomain(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSubdomainAvailable(null);
    }
  }, [subdomain]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("business-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("business-assets").getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      setLogoFile(file);

      toast({
        title: "Logo uploaded!",
        description: "Your logo has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubdomainChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomain(cleaned);
  };

  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value);
    if (!subdomain) {
      const suggested = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setSubdomain(suggested);
    }
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (accountType === "business") {
        if (!businessName || !subdomain) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Create business account with branding
        const { data: businessData, error: businessError } = await supabase
          .from("business_accounts")
          .insert({
            owner_id: user.id,
            business_name: businessName,
            subdomain,
            industry,
            company_size: companySize,
            logo_url: logoUrl,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
          })
          .select()
          .single();

        if (businessError) throw businessError;

        // Create widget preferences
        const widgetEntries = Object.entries(widgets).map(
          ([key, enabled], index) => ({
            business_id: businessData.id,
            widget_key: key,
            widget_name: key
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
            enabled_for_employees: enabled,
            display_order: index,
          }),
        );

        await supabase.from("dashboard_widgets").insert(widgetEntries);

        // Update user
        await supabase
          .from("users")
          .update({
            onboarding_complete: true,
            account_type: "business",
          })
          .eq("id", user.id);

        toast({
          title: "Success! 🎉",
          description: `Business account created! Your subdomain: ${subdomain}.numsphere.online`,
        });
      } else {
        await supabase
          .from("users")
          .update({
            onboarding_complete: true,
            account_type: "individual",
          })
          .eq("id", user.id);

        toast({
          title: "Welcome! 🎉",
          description: "Your account is ready to use",
        });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background elements */}
      <motion.div
        className="absolute inset-0 opacity-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
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
                    <Users className="w-8 h-8 text-white" />
                  ) : (
                    <Building className="w-8 h-8 text-white" />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {step === 1
                    ? "Welcome! Let's Get Started"
                    : "Set Up Your Business"}
                </CardTitle>
                <CardDescription className="text-lg">
                  {step === 1
                    ? "Choose your account type"
                    : "Tell us about your business"}
                </CardDescription>
              </motion.div>
            </AnimatePresence>
          </CardHeader>

          <CardContent className="space-y-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.button
                      onClick={() => setAccountType("individual")}
                      className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                        accountType === "individual"
                          ? "border-indigo-600 bg-indigo-50 shadow-lg"
                          : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                      }`}
                      whileHover={{ scale: 1.05, y: -5 }}
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
                        <Users
                          className={`w-12 h-12 mx-auto mb-3 ${accountType === "individual" ? "text-indigo-600" : "text-gray-400"}`}
                        />
                      </motion.div>
                      <h3 className="font-bold text-lg mb-2">Individual</h3>
                      <p className="text-sm text-gray-600">
                        Perfect for personal use
                      </p>
                    </motion.button>

                    <motion.button
                      onClick={() => setAccountType("business")}
                      className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                        accountType === "business"
                          ? "border-indigo-600 bg-indigo-50 shadow-lg"
                          : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                      }`}
                      whileHover={{ scale: 1.05, y: -5 }}
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
                          className={`w-12 h-12 mx-auto mb-3 ${accountType === "business" ? "text-indigo-600" : "text-gray-400"}`}
                        />
                      </motion.div>
                      <h3 className="font-bold text-lg mb-2">Business</h3>
                      <p className="text-sm text-gray-600">
                        For teams and organizations
                      </p>
                    </motion.button>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={() => {
                        if (accountType === "business") {
                          setStep(2);
                        } else {
                          handleCompleteOnboarding();
                        }
                      }}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-6 text-lg shadow-lg relative overflow-hidden group"
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.6 }}
                      />
                      <span className="relative z-10 flex items-center justify-center">
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
                      </span>
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left side - Form */}
                    <div className="space-y-6">
                      <motion.div
                        className="space-y-2"
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <Label
                          htmlFor="businessName"
                          className="text-base font-semibold"
                        >
                          Business Name *
                        </Label>
                        <Input
                          id="businessName"
                          value={businessName}
                          onChange={(e) =>
                            handleBusinessNameChange(e.target.value)
                          }
                          placeholder="Acme Corporation"
                          className="h-12 text-lg border-2 focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        className="space-y-2"
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.1 }}
                      >
                        <Label
                          htmlFor="subdomain"
                          className="text-base font-semibold"
                        >
                          Subdomain *
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="subdomain"
                            value={subdomain}
                            onChange={(e) =>
                              handleSubdomainChange(e.target.value)
                            }
                            placeholder="acme"
                            className="h-12 text-lg border-2 focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                          <span className="text-gray-500 font-medium">
                            .numsphere.online
                          </span>
                          <AnimatePresence mode="wait">
                            {checkingSubdomain && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                              >
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                              </motion.div>
                            )}
                            {!checkingSubdomain &&
                              subdomainAvailable === true && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0 }}
                                >
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                </motion.div>
                              )}
                            {!checkingSubdomain &&
                              subdomainAvailable === false && (
                                <motion.span
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0 }}
                                  className="text-red-600 text-sm font-medium"
                                >
                                  Taken
                                </motion.span>
                              )}
                          </AnimatePresence>
                        </div>
                        <p className="text-sm text-gray-500">
                          Your business will be accessible at{" "}
                          <span className="font-semibold text-indigo-600">
                            {subdomain || "your-subdomain"}.numsphere.online
                          </span>
                        </p>
                      </motion.div>

                      {/* Logo Upload */}
                      <motion.div className="space-y-2" variants={itemVariants}>
                        <Label className="text-base font-semibold">
                          Business Logo
                        </Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
                          {logoUrl ? (
                            <div className="space-y-3">
                              <img
                                src={logoUrl}
                                alt="Logo"
                                className="w-24 h-24 mx-auto object-contain rounded-lg"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  document
                                    .getElementById("logo-upload")
                                    ?.click()
                                }
                              >
                                Change Logo
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                                {uploadingLogo ? (
                                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                ) : (
                                  <ImageIcon className="w-8 h-8 text-gray-400" />
                                )}
                              </div>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  document
                                    .getElementById("logo-upload")
                                    ?.click()
                                }
                                disabled={uploadingLogo}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Logo
                              </Button>
                              <p className="text-xs text-gray-500">
                                PNG, JPG up to 2MB
                              </p>
                            </div>
                          )}
                          <input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                        </div>
                      </motion.div>

                      {/* Brand Colors */}
                      <motion.div
                        className="grid grid-cols-2 gap-4"
                        variants={itemVariants}
                      >
                        <div className="space-y-2">
                          <Label className="text-base font-semibold">
                            Primary Color
                          </Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                            />
                            <Input
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-base font-semibold">
                            Secondary Color
                          </Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={secondaryColor}
                              onChange={(e) =>
                                setSecondaryColor(e.target.value)
                              }
                              className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                            />
                            <Input
                              value={secondaryColor}
                              onChange={(e) =>
                                setSecondaryColor(e.target.value)
                              }
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </motion.div>

                      <motion.div
                        className="space-y-2"
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.2 }}
                      >
                        <Label
                          htmlFor="industry"
                          className="text-base font-semibold"
                        >
                          Industry
                        </Label>
                        <Select value={industry} onValueChange={setIndustry}>
                          <SelectTrigger className="h-12 text-lg border-2">
                            <SelectValue placeholder="Select your industry" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technology">
                              Technology
                            </SelectItem>
                            <SelectItem value="healthcare">
                              Healthcare
                            </SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </motion.div>

                      <motion.div
                        className="space-y-2"
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.3 }}
                      >
                        <Label
                          htmlFor="companySize"
                          className="text-base font-semibold"
                        >
                          Company Size
                        </Label>
                        <Select
                          value={companySize}
                          onValueChange={setCompanySize}
                        >
                          <SelectTrigger className="h-12 text-lg border-2">
                            <SelectValue placeholder="Select company size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-10">1-10 employees</SelectItem>
                            <SelectItem value="11-50">
                              11-50 employees
                            </SelectItem>
                            <SelectItem value="51-200">
                              51-200 employees
                            </SelectItem>
                            <SelectItem value="201-500">
                              201-500 employees
                            </SelectItem>
                            <SelectItem value="500+">500+ employees</SelectItem>
                          </SelectContent>
                        </Select>
                      </motion.div>

                      {/* Widget Preferences */}
                      <motion.div className="space-y-3" variants={itemVariants}>
                        <Label className="text-base font-semibold">
                          Employee Dashboard Widgets
                        </Label>
                        <p className="text-sm text-gray-500">
                          Choose which widgets employees can see
                        </p>
                        <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                          {Object.entries(widgets).map(([key, enabled]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm font-medium capitalize">
                                {key.split("_").join(" ")}
                              </span>
                              <Switch
                                checked={enabled}
                                onCheckedChange={(checked) =>
                                  setWidgets((prev) => ({
                                    ...prev,
                                    [key]: checked,
                                  }))
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </div>

                    {/* Right side - Live Preview */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">
                        Live Preview
                      </Label>
                      <div className="border-2 border-gray-200 rounded-xl p-6 bg-gradient-to-br from-gray-50 to-white">
                        <div className="space-y-4">
                          {/* Preview Navbar */}
                          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                            <div className="flex items-center gap-3">
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt="Logo"
                                  className="w-10 h-10 object-contain"
                                />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                                  style={{
                                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                                  }}
                                >
                                  <Building className="w-5 h-5 text-white" />
                                </div>
                              )}
                              <span className="font-bold text-lg">
                                {businessName || "Your Business"}
                              </span>
                            </div>
                          </div>

                          {/* Preview Dashboard */}
                          <div className="space-y-3">
                            <p className="text-sm font-semibold text-gray-600">
                              Employee Dashboard
                            </p>
                            {Object.entries(widgets)
                              .filter(([_, enabled]) => enabled)
                              .map(([key]) => (
                                <div
                                  key={key}
                                  className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
                                  style={{
                                    borderLeft: `4px solid ${primaryColor}`,
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                                      style={{
                                        backgroundColor: `${primaryColor}20`,
                                      }}
                                    >
                                      <CheckCircle
                                        className="w-4 h-4"
                                        style={{ color: primaryColor }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium capitalize">
                                      {key.split("_").join(" ")}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <motion.div
                    className="flex gap-3 pt-4"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.4 }}
                  >
                    <motion.div
                      className="flex-1"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="w-full h-12 text-lg border-2"
                      >
                        Back
                      </Button>
                    </motion.div>
                    <motion.div
                      className="flex-1"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={handleCompleteOnboarding}
                        disabled={
                          loading ||
                          !businessName ||
                          !subdomain ||
                          subdomainAvailable === false
                        }
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold h-12 text-lg shadow-lg relative overflow-hidden group"
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          initial={{ x: "-100%" }}
                          whileHover={{ x: "100%" }}
                          transition={{ duration: 0.6 }}
                        />
                        <span className="relative z-10 flex items-center justify-center">
                          {loading ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              Complete Setup
                              <Sparkles className="w-5 h-5 ml-2" />
                            </>
                          )}
                        </span>
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
