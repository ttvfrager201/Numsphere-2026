"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { useRouter } from "next/navigation";

import {
  Phone,
  PhoneCall,
  MessageSquare,
  Settings,
  BarChart3,
  Globe,
  Users,
  Search,
  Plus,
  Play,
  Pause,
  Volume2,
  MapPin,
  Building,
  Clock,
  TrendingUp,
  Zap,
  RefreshCw,
  ShoppingCart,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import DashboardNavbar from "@/components/dashboard-navbar";

interface TwilioPhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  status: string;
  dateCreated: string;
  origin: string;
  owned: boolean;
}

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  isoCountry: string;
  capabilities: any;
  estimatedPrice: string;
}

interface CallFlow {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  calls: number;
  phone_number_id?: string;
}

interface CallLog {
  id: string;
  from_number: string;
  to_number: string;
  direction: "inbound" | "outbound";
  status: string;
  duration: number;
  started_at: string;
  ended_at: string;
}

interface BusinessAccount {
  id: string;
  business_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface UserRole {
  account_type: "individual" | "business";
  is_owner: boolean;
  business_id: string | null;
}

const formatPhoneNumber = (number?: string) => {
  if (!number) return "Unknown";
  const cleaned = number.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const withoutCountry = cleaned.slice(1);
    return `+1 (${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(3, 6)}-${withoutCountry.slice(6)}`;
  } else if (cleaned.length === 10) {
    return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return number.startsWith("+") ? number : `+${number}`;
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("overview");
  const [twilioNumbers, setTwilioNumbers] = useState<TwilioPhoneNumber[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>(
    [],
  );
  const [callFlows, setCallFlows] = useState<CallFlow[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loadingTwilio, setLoadingTwilio] = useState(false);
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [purchasingNumber, setPurchasingNumber] = useState<string | null>(null);

  // Dashboard selection dialog
  const [showDashboardDialog, setShowDashboardDialog] = useState(false);
  const [hasEmployeeAccount, setHasEmployeeAccount] = useState(false);
  const [hasPersonalAccount, setHasPersonalAccount] = useState(false);
  const [rememberPreference, setRememberPreference] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<
    "employee" | "personal" | null
  >(null);

  // Business account state
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [businessAccount, setBusinessAccount] =
    useState<BusinessAccount | null>(null);
  const [allowedWidgets, setAllowedWidgets] = useState<string[]>([]);

  // Search states
  const [numberSearch, setNumberSearch] = useState({
    country: "US",
    areaCode: "",
    contains: "",
  });

  // Add toll-free search state
  const [searchType, setSearchType] = useState<"Local" | "TollFree">("Local");
  const [tollFreePrefix, setTollFreePrefix] = useState("800");

  // Call flow creation
  const [newCallFlow, setNewCallFlow] = useState({
    name: "",
    description: "",
    phoneNumberId: "",
  });

  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/sign-in");
        return;
      }
      setUser(user);

      // Check for saved preference
      const savedPreference = localStorage.getItem("dashboard_preference");

      // Get user role and business info
      const { data: userData } = await supabase
        .from("users")
        .select("account_type")
        .eq("id", user.id)
        .single();

      // Check if employee
      const { data: employeeData } = await supabase
        .from("business_employees")
        .select("business_id, business_accounts(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      // Check if owner
      const { data: ownerData } = await supabase
        .from("business_accounts")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      const isEmployee = !!employeeData;
      const isOwner = !!ownerData;
      const hasPersonal = userData?.account_type === "individual" || isOwner;

      setHasEmployeeAccount(isEmployee);
      setHasPersonalAccount(hasPersonal);

      // If user has both employee and personal accounts
      if (isEmployee && hasPersonal) {
        // Check if they have a saved preference
        if (savedPreference === "employee" || savedPreference === "personal") {
          // Load their preferred dashboard
          if (savedPreference === "employee") {
            await loadEmployeeDashboard(employeeData);
          } else {
            await loadPersonalDashboard(ownerData);
          }
        } else {
          // Show dialog to choose
          setShowDashboardDialog(true);
          setLoading(false);
          return;
        }
      } else if (isEmployee) {
        // Only employee account
        await loadEmployeeDashboard(employeeData);
      } else if (isOwner) {
        // Only owner account
        await loadPersonalDashboard(ownerData);
      } else {
        // Individual account
        setUserRole({
          account_type: "individual",
          is_owner: false,
          business_id: null,
        });
        setAllowedWidgets([
          "overview_stats",
          "recent_calls",
          "call_flows",
          "phone_numbers",
          "quick_actions",
        ]);
      }

      setLoading(false);
    };

    getUser();
  }, []);

  const loadEmployeeDashboard = async (employeeData: any) => {
    if (!employeeData) return;

    setBusinessAccount(employeeData.business_accounts);
    setUserRole({
      account_type: "business",
      is_owner: false,
      business_id: employeeData.business_id,
    });

    // Get allowed widgets for employee
    const { data: widgetsData } = await supabase
      .from("dashboard_widgets")
      .select("widget_key")
      .eq("business_id", employeeData.business_id)
      .eq("enabled_for_employees", true);

    setAllowedWidgets(widgetsData?.map((w) => w.widget_key) || []);
    setSelectedDashboard("employee");
  };

  const loadPersonalDashboard = async (ownerData: any) => {
    if (ownerData) {
      setBusinessAccount(ownerData);
      setUserRole({
        account_type: "business",
        is_owner: true,
        business_id: ownerData.id,
      });
    } else {
      setUserRole({
        account_type: "individual",
        is_owner: false,
        business_id: null,
      });
    }

    setAllowedWidgets([
      "overview_stats",
      "recent_calls",
      "call_flows",
      "phone_numbers",
      "quick_actions",
    ]);
    setSelectedDashboard("personal");
  };

  const handleDashboardChoice = async (choice: "employee" | "personal") => {
    setLoading(true);

    try {
      if (rememberPreference) {
        localStorage.setItem("dashboard_preference", choice);
      }

      if (choice === "employee") {
        const { data: employeeData } = await supabase
          .from("business_employees")
          .select("business_id, business_accounts(*)")
          .eq("user_id", user?.id)
          .eq("status", "active")
          .single();

        await loadEmployeeDashboard(employeeData);
      } else {
        const { data: ownerData } = await supabase
          .from("business_accounts")
          .select("*")
          .eq("owner_id", user?.id)
          .maybeSingle();

        await loadPersonalDashboard(ownerData);
      }

      setShowDashboardDialog(false);
      toast({
        title: "Dashboard loaded",
        description: `Switched to ${choice} dashboard`,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const switchDashboard = () => {
    localStorage.removeItem("dashboard_preference");
    setShowDashboardDialog(true);
  };

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        // First check if user is an employee
        const { data: employeeData } = await supabase
          .from("business_employees")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        // If user is an employee, skip onboarding check
        if (employeeData) {
          console.log("User is an employee, skipping onboarding");
          return;
        }

        // Only check onboarding for non-employees
        const { data: userData, error } = await supabase
          .from("users")
          .select("onboarding_complete")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error checking onboarding:", error);
          return;
        }

        // If onboarding is not complete and user is not an employee, redirect to onboarding
        if (!userData?.onboarding_complete) {
          router.push("/onboarding");
        }
      } catch (err) {
        console.error("Error in onboarding check:", err);
      }
    };

    checkOnboardingStatus();
  }, [user, router]);
  const fetchTwilioNumbers = async () => {
    setLoadingTwilio(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-get-twilio-numbers",
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        },
      );

      if (error) throw error;
      setTwilioNumbers(data.numbers || []);
    } catch (error) {
      console.error("Error fetching Twilio numbers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch Twilio numbers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingTwilio(false);
    }
  };

  const searchAvailableNumbers = async () => {
    setSearchingNumbers(true);
    try {
      const body: any = {
        type: searchType,
        country: numberSearch.country,
        pageSize: 20,
      };

      if (searchType === "TollFree") {
        body.tollFreePrefix = tollFreePrefix;
      } else if (numberSearch.areaCode) {
        body.areaCode = numberSearch.areaCode;
      }

      if (numberSearch.contains) {
        body.contains = numberSearch.contains;
      }

      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-search-available-numbers",
        {
          body,
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        },
      );

      if (error) throw error;
      setAvailableNumbers(data.numbers || []);
      toast({
        title: "Success",
        description: `Found ${data.numbers?.length || 0} available numbers.`,
      });
    } catch (error) {
      console.error("Error searching numbers:", error);
      toast({
        title: "Error",
        description: "Failed to search numbers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearchingNumbers(false);
    }
  };

  const purchaseNumber = async (phoneNumber: string) => {
    setPurchasingNumber(phoneNumber);
    try {
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-purchase-phone-number",
        {
          body: { phoneNumber },
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        },
      );

      if (error) throw error;

      // Refresh the numbers list to show the new purchase
      await fetchTwilioNumbers();

      // Remove from available numbers
      setAvailableNumbers((prev) =>
        prev.filter((num) => num.phoneNumber !== phoneNumber),
      );

      toast({
        title: "Success",
        description: "Phone number purchased successfully!",
      });

      // Switch to numbers view to show the purchased number
      setCurrentView("numbers");
    } catch (error) {
      console.error("Error purchasing number:", error);
      toast({
        title: "Error",
        description: "Failed to purchase number. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPurchasingNumber(null);
    }
  };

  const createCallFlow = async () => {
    try {
      const { data, error } = await supabase
        .from("call_flows")
        .insert({
          user_id: user?.id,
          name: newCallFlow.name,
          description: newCallFlow.description,
          phone_number_id: newCallFlow.phoneNumberId || null,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      setCallFlows((prev) => [...prev, data]);
      setNewCallFlow({ name: "", description: "", phoneNumberId: "" });
      toast({
        title: "Success",
        description: "Call flow created successfully!",
      });
    } catch (error) {
      console.error("Error creating call flow:", error);
      toast({
        title: "Error",
        description: "Failed to create call flow. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchTwilioNumbers();

      // Fetch call flows
      supabase
        .from("call_flows")
        .select("*")
        .eq("user_id", user.id)
        .then(({ data }) => setCallFlows(data || []));

      // Fetch call logs
      supabase
        .from("call_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(50)
        .then(({ data }) => setCallLogs(data || []));
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin">
            <BarChart3 className="h-12 w-12 text-indigo-600" />
          </div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const isWidgetAllowed = (widgetKey: string) => {
    return allowedWidgets.includes(widgetKey);
  };

  const renderContent = () => {
    switch (currentView) {
      case "overview":
        return (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* Business Branding Header */}
            {businessAccount && (
              <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {businessAccount.logo_url ? (
                      <img
                        src={businessAccount.logo_url}
                        alt="Business Logo"
                        className="w-16 h-16 object-contain rounded-lg"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-lg flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${businessAccount.primary_color}, ${businessAccount.secondary_color})`,
                        }}
                      >
                        <Building className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {businessAccount.business_name}
                      </h2>
                      <p className="text-gray-600">
                        {userRole?.is_owner
                          ? "Owner Dashboard"
                          : "Employee Dashboard"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards - Only show if allowed */}
            {isWidgetAllowed("overview_stats") && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div
                  className="animate-in fade-in slide-in-from-left-4 duration-500"
                  style={{ animationDelay: "0ms" }}
                >
                  <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Total Numbers
                      </CardTitle>
                      <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <Phone className="h-4 w-4 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                        {twilioNumbers.filter((n) => n.owned).length}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Active phone numbers
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div
                  className="animate-in fade-in slide-in-from-left-4 duration-500"
                  style={{ animationDelay: "50ms" }}
                >
                  <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Call Flows
                      </CardTitle>
                      <div className="p-2 bg-gradient-to-br from-green-600 to-green-700 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <Zap className="h-4 w-4 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                        {callFlows.length}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Active call flows
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div
                  className="animate-in fade-in slide-in-from-left-4 duration-500"
                  style={{ animationDelay: "100ms" }}
                >
                  <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Calls Today
                      </CardTitle>
                      <div className="p-2 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <PhoneCall className="h-4 w-4 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                        {
                          callLogs.filter(
                            (log) =>
                              new Date(log.started_at).toDateString() ===
                              new Date().toDateString(),
                          ).length
                        }
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Calls processed today
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div
                  className="animate-in fade-in slide-in-from-left-4 duration-500"
                  style={{ animationDelay: "150ms" }}
                >
                  <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Success Rate
                      </CardTitle>
                      <div className="p-2 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">
                        98.5%
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Call completion rate
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Quick Actions - Only show if allowed */}
            {isWidgetAllowed("quick_actions") && (
              <Card
                className="bg-white border-0 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: "200ms" }}
              >
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-indigo-600" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    Get started with common tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 h-24 flex-col space-y-2 shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105"
                      onClick={() =>
                        window.open("/dashboard/calling", "_blank")
                      }
                    >
                      <PhoneCall className="w-6 h-6" />
                      <span className="font-semibold">Make a Call</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-24 flex-col space-y-2 border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300 hover:scale-105 group"
                      onClick={() => setCurrentView("purchase")}
                    >
                      <ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-indigo-600" />
                      <span className="font-semibold text-gray-700 group-hover:text-indigo-600">
                        Buy Numbers
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-24 flex-col space-y-2 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-300 hover:scale-105 group"
                      onClick={() => setCurrentView("flows")}
                    >
                      <Zap className="w-6 h-6 text-gray-700 group-hover:text-purple-600" />
                      <span className="font-semibold text-gray-700 group-hover:text-purple-600">
                        Create Flow
                      </span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity - Only show if allowed */}
            {isWidgetAllowed("recent_calls") && (
              <Card
                className="bg-white border-0 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: "250ms" }}
              >
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-indigo-600" />
                    Recent Call Logs
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    Your latest call activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {callLogs.slice(0, 5).map((log, index) => (
                      <div
                        key={log.id}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className="flex items-center space-x-4 p-4 rounded-xl border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-300 animate-in fade-in slide-in-from-left-4"
                      >
                        {/* Status indicator */}
                        <div
                          className={`w-3 h-3 rounded-full shadow-lg ${
                            log.status === "completed"
                              ? "bg-green-500 shadow-green-500/50"
                              : log.status === "busy" ||
                                  log.status === "in-progress"
                                ? "bg-yellow-500 shadow-yellow-500/50"
                                : "bg-red-500 shadow-red-500/50"
                          }`}
                        />

                        {/* Call info */}
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {log.direction === "inbound"
                              ? "📞 Incoming"
                              : "📱 Outgoing"}{" "}
                            call
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatPhoneNumber(log.from_number)} →{" "}
                            {formatPhoneNumber(log.to_number)} •{" "}
                            {formatDuration(log.duration)}
                          </p>
                        </div>

                        {/* Call time */}
                        <div className="text-xs text-gray-500 font-medium">
                          {log.started_at
                            ? new Date(log.started_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </div>
                      </div>
                    ))}
                    {callLogs.length === 0 && (
                      <div className="text-center py-12">
                        <PhoneCall className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">
                          No call logs yet
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Your call history will appear here
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "numbers":
        return (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Phone className="h-6 w-6 text-indigo-600" />
                  My Phone Numbers
                </h2>
                <p className="text-gray-600 mt-1">
                  Manage your purchased phone numbers
                </p>
              </div>
              <Button
                variant="outline"
                onClick={fetchTwilioNumbers}
                disabled={loadingTwilio}
                className="border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300"
              >
                {loadingTwilio ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="grid gap-4">
              {twilioNumbers
                .filter((n) => n.owned)
                .map((number, index) => (
                  <div
                    key={number.sid}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className="animate-in fade-in slide-in-from-left-4 duration-500"
                  >
                    <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                              <Phone className="w-7 h-7 text-white" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">
                                {formatPhoneNumber(number.phoneNumber)}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {number.friendlyName}
                              </p>
                              <div className="flex items-center space-x-2 mt-2">
                                {number.capabilities.voice && (
                                  <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                                    Voice
                                  </Badge>
                                )}
                                {number.capabilities.sms && (
                                  <Badge className="bg-green-100 text-green-700 border border-green-200">
                                    SMS
                                  </Badge>
                                )}
                                {number.capabilities.mms && (
                                  <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
                                    MMS
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-100 text-green-700 border-2 border-green-200 px-3 py-1">
                              ✓ Active
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300"
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}

              {twilioNumbers.filter((n) => n.owned).length === 0 && (
                <Card className="bg-white border-0 shadow-lg">
                  <CardContent className="p-12 text-center">
                    <div className="inline-block p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 animate-bounce shadow-lg">
                      <Phone className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No phone numbers yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Purchase your first phone number to get started
                    </p>
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105"
                      onClick={() => setCurrentView("purchase")}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Buy Your First Number
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      case "purchase":
        const tollFreePrefixes = ["800", "888", "877", "866", "855", "844", "833"];

        return (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-indigo-600" />
                Buy Phone Numbers
              </h2>
              <p className="text-gray-600 mt-1">
                Search and purchase local or toll-free phone numbers
              </p>
            </div>

            <Card className="bg-white border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Search className="h-5 w-5 text-indigo-600" />
                  Search Available Numbers
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Find local numbers or toll-free (800, 888, 877, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-gray-700 font-semibold">
                      Number Type
                    </Label>
                    <Select value={searchType} onValueChange={(value: "Local" | "TollFree") => setSearchType(value)}>
                      <SelectTrigger className="border-2 border-gray-200 focus:border-indigo-500 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Local">Local Numbers</SelectItem>
                        <SelectItem value="TollFree">Toll-Free Numbers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {searchType === "Local" ? (
                    <>
                      <div>
                        <Label className="text-gray-700 font-semibold">
                          Country
                        </Label>
                        <Select
                          value={numberSearch.country}
                          onValueChange={(value) =>
                            setNumberSearch((prev) => ({ ...prev, country: value }))
                          }
                        >
                          <SelectTrigger className="border-2 border-gray-200 focus:border-indigo-500 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="CA">Canada</SelectItem>
                            <SelectItem value="GB">United Kingdom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-gray-700 font-semibold">
                          Area Code
                        </Label>
                        <Input
                          placeholder="e.g., 313"
                          value={numberSearch.areaCode}
                          onChange={(e) =>
                            setNumberSearch((prev) => ({
                              ...prev,
                              areaCode: e.target.value,
                            }))
                          }
                          className="border-2 border-gray-200 focus:border-indigo-500 mt-1"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label className="text-gray-700 font-semibold">
                        Toll-Free Prefix
                      </Label>
                      <Select value={tollFreePrefix} onValueChange={setTollFreePrefix}>
                        <SelectTrigger className="border-2 border-gray-200 focus:border-indigo-500 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tollFreePrefixes.map((prefix) => (
                            <SelectItem key={prefix} value={prefix}>
                              {prefix}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label className="text-gray-700 font-semibold">
                      Contains
                    </Label>
                    <Input
                      placeholder="e.g., 3333"
                      value={numberSearch.contains}
                      onChange={(e) =>
                        setNumberSearch((prev) => ({
                          ...prev,
                          contains: e.target.value,
                        }))
                      }
                      className="border-2 border-gray-200 focus:border-indigo-500 mt-1"
                    />
                  </div>
                </div>
                <Button
                  onClick={searchAvailableNumbers}
                  disabled={searchingNumbers}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105"
                >
                  {searchingNumbers ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search Numbers
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {availableNumbers.length > 0 && (
              <Card className="bg-white border-0 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Phone className="h-5 w-5 text-indigo-600" />
                    Available Numbers
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    Click to purchase a number
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {availableNumbers.map((number, index) => (
                      <div
                        key={index}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-300 animate-in fade-in slide-in-from-left-4 group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {formatPhoneNumber(number.phoneNumber)}
                            </h4>
                            {searchType === "TollFree" && (
                              <Badge className="bg-green-100 text-green-800 border border-green-200">
                                Toll-Free
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            📍 {number.locality}, {number.region} •{" "}
                            {number.estimatedPrice}
                          </p>
                        </div>
                        <Button
                          onClick={() => purchaseNumber(number.phoneNumber)}
                          disabled={purchasingNumber === number.phoneNumber}
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg shadow-green-600/30 transition-all duration-300 hover:scale-105"
                        >
                          {purchasingNumber === number.phoneNumber ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Purchase
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "calling":
        return (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <PhoneCall className="h-6 w-6 text-indigo-600" />
                Make a Call
              </h2>
              <p className="text-gray-600 mt-1">
                Use our calling SDK to make calls directly from your browser
              </p>
            </div>

            <Card className="bg-white border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-indigo-600" />
                  Web Calling Interface
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Make calls using your purchased phone numbers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="inline-block p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 animate-pulse shadow-lg">
                    <PhoneCall className="w-16 h-16 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Calling SDK Coming Soon
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    We're working on integrating the Twilio Voice SDK to enable
                    browser-based calling.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105"
                    onClick={() => setCurrentView("numbers")}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Manage Phone Numbers
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return <div>Content for {currentView}</div>;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <DashboardNavbar />

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-white shadow-lg border-r border-gray-200 min-h-screen">
            <div className="p-6">
              {/* User Profile */}
              <div className="mb-8 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-100">
                <div className="flex items-center space-x-3">
                  {businessAccount?.logo_url ? (
                    <img
                      src={businessAccount.logo_url}
                      alt="Business Logo"
                      className="w-12 h-12 object-contain rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                      {user?.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-lg">
                          {user?.user_metadata?.full_name?.charAt(0) ||
                            user?.email?.charAt(0) ||
                            "U"}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {user?.user_metadata?.full_name ||
                        user?.email?.split("@")[0] ||
                        "User"}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {selectedDashboard === "employee"
                        ? "Employee"
                        : userRole?.is_owner
                          ? "Owner"
                          : "Individual"}
                    </p>
                  </div>
                </div>

                {/* Switch Dashboard Button */}
                {hasEmployeeAccount && hasPersonalAccount && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={switchDashboard}
                    className="w-full mt-3 text-xs border-2 border-indigo-200 hover:bg-indigo-50"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Switch Dashboard
                  </Button>
                )}
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setCurrentView("overview")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    currentView === "overview"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Overview</span>
                </button>

                <a
                  href="/dashboard/calling"
                  target="_blank"
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>Make Calls</span>
                </a>

                <button
                  onClick={() => setCurrentView("numbers")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    currentView === "numbers"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  <Phone className="w-5 h-5" />
                  <span>Phone Numbers</span>
                </button>
                
                <button
                  onClick={() => setCurrentView("purchase")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    currentView === "purchase"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Buy Numbers</span>
                </button>
                
                <a
                  href="/dashboard/call-flows"
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <Zap className="w-5 h-5" />
                  <span>Call Flows (Builder)</span>
                </a>
                
                <a
                  href="/dashboard/call-logs"
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>Call Logs</span>
                </a>

                <a
                  href="/dashboard/cisco-phone"
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <Phone className="w-5 h-5" />
                  <span>Cisco Phone</span>
                </a>

                {/* Business Settings - Only for owners */}
                {userRole?.is_owner && (
                  <a
                    href="/dashboard/business-settings"
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border-t-2 border-gray-100 mt-2 pt-4"
                  >
                    <Building className="w-5 h-5" />
                    <span>Business Settings</span>
                  </a>
                )}

                <button
                  onClick={() => setCurrentView("settings")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    currentView === "settings"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8">
            <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center gap-3 mb-2">
                {businessAccount?.logo_url ? (
                  <img
                    src={businessAccount.logo_url}
                    alt="Logo"
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                )}
                <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
              </div>
              <p className="text-gray-600 text-lg">
                {businessAccount
                  ? `${businessAccount.business_name} - ${userRole?.is_owner ? "Owner" : "Employee"} Portal`
                  : "Manage your VoIP communications and phone numbers."}
              </p>
            </div>

            {renderContent()}
          </div>
        </div>
      </div>

      {/* Dashboard Selection Dialog */}
      <Dialog open={showDashboardDialog} onOpenChange={setShowDashboardDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              Choose Your Dashboard
            </DialogTitle>
            <DialogDescription className="text-center pt-4">
              <div className="space-y-4">
                <p className="text-lg font-semibold text-gray-900">
                  You have access to multiple dashboards
                </p>
                <p className="text-sm text-gray-600">
                  Which dashboard would you like to use?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {hasEmployeeAccount && (
              <Button
                onClick={() => handleDashboardChoice("employee")}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-6 flex-col h-auto"
              >
                <Building className="w-8 h-8 mb-2" />
                <span>Employee</span>
                <span className="text-xs font-normal opacity-90">
                  Business Account
                </span>
              </Button>
            )}

            {hasPersonalAccount && (
              <Button
                onClick={() => handleDashboardChoice("personal")}
                variant="outline"
                className="border-2 border-gray-300 font-bold py-6 flex-col h-auto hover:bg-gray-50"
              >
                <UserIcon className="w-8 h-8 mb-2" />
                <span>Personal</span>
                <span className="text-xs font-normal opacity-70">
                  {userRole?.is_owner ? "Owner Account" : "Individual Account"}
                </span>
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-4 p-3 bg-gray-50 rounded-lg">
            <Checkbox
              id="remember"
              checked={rememberPreference}
              onCheckedChange={(checked) =>
                setRememberPreference(checked as boolean)
              }
            />
            <label
              htmlFor="remember"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Remember my choice and always open this dashboard
            </label>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}