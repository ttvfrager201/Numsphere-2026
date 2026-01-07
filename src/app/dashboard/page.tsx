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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
      setLoading(false);
    };

    getUser();
  }, []);


  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        const { data: userData, error } = await supabase
          .from("users")
          .select("onboarding_complete")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error checking onboarding:", error);
          return;
        }

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
        "get-twilio-numbers",
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
        "search-available-numbers",
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
        "purchase-phone-number",
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


  const renderContent = () => {
    switch (currentView) {
      case "overview":
        return (
          <div className="space-y-6">

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200/50 hover:border-indigo-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Phone Numbers
                  </p>
                  <p className="text-4xl font-bold text-slate-900">
                    {twilioNumbers.filter((n) => n.owned).length}
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200/50 hover:border-green-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg shadow-green-500/30">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Call Flows
                  </p>
                  <p className="text-4xl font-bold text-slate-900">
                    {callFlows.length}
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200/50 hover:border-purple-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/30">
                      <PhoneCall className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Calls Today
                  </p>
                  <p className="text-4xl font-bold text-slate-900">
                    {
                      callLogs.filter(
                        (log) =>
                          new Date(log.started_at).toDateString() ===
                          new Date().toDateString(),
                      ).length
                    }
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200/50 hover:border-orange-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Success Rate
                  </p>
                  <p className="text-4xl font-bold text-slate-900">
                    98.5%
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/50">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => window.open("/dashboard/calling", "_blank")}
                  className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl p-6 text-white transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                  <div className="relative flex flex-col items-center space-y-3">
                    <PhoneCall className="w-8 h-8" />
                    <span className="font-semibold">Make a Call</span>
                  </div>
                </button>
                <button
                  onClick={() => setCurrentView("purchase")}
                  className="group relative overflow-hidden bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-indigo-300 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:scale-105"
                >
                  <div className="flex flex-col items-center space-y-3">
                    <ShoppingCart className="w-8 h-8 text-slate-700 group-hover:text-indigo-600 transition-colors" />
                    <span className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                      Buy Numbers
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => router.push("/dashboard/call-flows")}
                  className="group relative overflow-hidden bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-purple-300 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:scale-105"
                >
                  <div className="flex flex-col items-center space-y-3">
                    <Zap className="w-8 h-8 text-slate-700 group-hover:text-purple-600 transition-colors" />
                    <span className="font-semibold text-slate-700 group-hover:text-purple-600 transition-colors">
                      Create Flow
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
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
          </div>
        );

      case "numbers":
        return (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={fetchTwilioNumbers}
                disabled={loadingTwilio}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg text-sm font-medium text-slate-700 hover:text-indigo-600 transition-all duration-200 shadow-sm hover:shadow"
              >
                {loadingTwilio ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </>
                )}
              </button>
            </div>

            <div className="grid gap-4">
              {twilioNumbers
                .filter((n) => n.owned)
                .map((number, index) => (
                  <div key={number.sid}>
                    <div className="bg-white rounded-xl p-5 shadow-lg border border-slate-200/50 hover:border-indigo-300 hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Phone className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {formatPhoneNumber(number.phoneNumber)}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {number.friendlyName}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {number.capabilities.voice && (
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md">
                                  Voice
                                </span>
                              )}
                              {number.capabilities.sms && (
                                <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-md">
                                  SMS
                                </span>
                              )}
                              {number.capabilities.mms && (
                                <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-md">
                                  MMS
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="px-3 py-1.5 bg-green-50 text-green-700 text-sm font-semibold rounded-lg border border-green-200">
                            Active
                          </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300"
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
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
        const tollFreePrefixes = ["888", "877", "866", "855", "844", "833"];

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/50">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Search Available Numbers
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Find local or toll-free phone numbers
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-gray-700 font-semibold">
                      Number Type
                    </Label>
                    <Select
                      value={searchType}
                      onValueChange={(value: "Local" | "TollFree") =>
                        setSearchType(value)
                      }
                    >
                      <SelectTrigger className="border-2 border-gray-200 focus:border-indigo-500 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Local">Local Numbers</SelectItem>
                        <SelectItem value="TollFree">
                          Toll-Free Numbers
                        </SelectItem>
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
                            setNumberSearch((prev) => ({
                              ...prev,
                              country: value,
                            }))
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
                      <Select
                        value={tollFreePrefix}
                        onValueChange={setTollFreePrefix}
                      >
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
                <button
                  onClick={searchAvailableNumbers}
                  disabled={searchingNumbers}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searchingNumbers ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                    </>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Search className="w-5 h-5" />
                      Search Numbers
                    </span>
                  )}
                </button>
              </div>
            </div>

            {availableNumbers.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200/50">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Available Numbers ({availableNumbers.length})
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Click to purchase a number
                </p>
                <div className="space-y-3">
                  {availableNumbers.map((number, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">
                            {formatPhoneNumber(number.phoneNumber)}
                          </h4>
                          {searchType === "TollFree" && (
                            <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-md">
                              Toll-Free
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {number.locality}, {number.region} • {number.estimatedPrice}
                        </p>
                      </div>
                      <button
                        onClick={() => purchaseNumber(number.phoneNumber)}
                        disabled={purchasingNumber === number.phoneNumber}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {purchasingNumber === number.phoneNumber ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            Purchase
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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
      <div className="min-h-screen bg-slate-900">
        <DashboardNavbar />

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 min-h-screen shadow-2xl">
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    NumSphere
                  </h2>
                  <p className="text-xs text-slate-400">VoIP Platform</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-white/30">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {user?.user_metadata?.full_name ||
                        user?.email?.split("@")[0] ||
                        "User"}
                    </p>
                    <p className="text-xs text-indigo-100 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3">
              <nav className="space-y-1.5">
                <button
                  onClick={() => setCurrentView("overview")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentView === "overview"
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Dashboard</span>
                </button>

                <a
                  href="/dashboard/calling"
                  target="_blank"
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all duration-200"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>Make Calls</span>
                </a>

                <button
                  onClick={() => setCurrentView("numbers")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentView === "numbers"
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <Phone className="w-5 h-5" />
                  <span>Phone Numbers</span>
                </button>

                <button
                  onClick={() => setCurrentView("purchase")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentView === "purchase"
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Buy Numbers</span>
                </button>

                <a
                  href="/dashboard/call-flows"
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all duration-200"
                >
                  <Zap className="w-5 h-5" />
                  <span>Call Flows</span>
                </a>

                <a
                  href="/dashboard/call-logs"
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all duration-200"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>Call Logs</span>
                </a>

                <div className="pt-3 mt-3 border-t border-slate-700/50">
                  <button
                    onClick={() => setCurrentView("settings")}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      currentView === "settings"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50"
                        : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
            <div className="p-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {currentView === "overview" && "Dashboard"}
                  {currentView === "numbers" && "Phone Numbers"}
                  {currentView === "purchase" && "Buy Numbers"}
                  {currentView === "flows" && "Call Flows"}
                  {currentView === "settings" && "Settings"}
                </h1>
                <p className="text-slate-600 mt-2">
                  Manage your VoIP communications and phone numbers
                </p>
              </div>

              {renderContent()}
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
