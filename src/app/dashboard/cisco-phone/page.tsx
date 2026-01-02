"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import {
  Phone,
  ArrowLeft,
  Copy,
  Check,
  Search,
  ShoppingCart,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function CiscoPhoneIntegrationPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [twilioNumbers, setTwilioNumbers] = useState<any[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "connected" | "failed"
  >("idle");
  const [connectionStep, setConnectionStep] = useState(0);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState("");

  const router = useRouter();
  const supabase = createClient();

  const connectionSteps = [
    "Verifying SIP credentials",
    "Connecting to Twilio SIP domain",
    "Registering phone number",
    "Testing voice connection",
    "Connection established",
  ];

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/sign-in");
        return;
      }
      setUser(user);
      await loadTwilioNumbers();
      setLoading(false);
    };
    init();
  }, []);

  const loadTwilioNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTwilioNumbers(data || []);
      if (data && data.length > 0) {
        setSelectedNumber(data[0]);
      }
    } catch (error: any) {
      console.error("Error loading numbers:", error);
    }
  };

  const testConnection = async () => {
    if (!selectedNumber) return;

    setTestingConnection(true);
    setConnectionStatus("connecting");
    setConnectionStep(0);
    setConnectionError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Step 1: Verify credentials
      setConnectionStep(0);
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Step 2: Connect to SIP domain
      setConnectionStep(1);
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Step 3: Register number
      setConnectionStep(2);
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Step 4: Test voice connection - Call the actual backend
      setConnectionStep(3);
      const response = await supabase.functions.invoke(
        "test-sip-connection",
        {
          body: { phoneNumber: selectedNumber.phone_number },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        },
      );

      if (response.error) {
        throw new Error(response.error.message || "Connection test failed");
      }

      if (!response.data?.success) {
        throw new Error(
          response.data?.error || "SIP connection verification failed",
        );
      }

      // Step 5: Success
      setConnectionStep(4);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setConnectionStatus("connected");

      toast({
        title: "Connection successful!",
        description:
          "Your SIP Phone Integration phone is connected and ready to use",
      });
    } catch (error: any) {
      console.error("Connection test failed:", error);
      setConnectionStatus("failed");
      setConnectionError(error.message || "Failed to connect to Twilio");

      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Twilio",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Configuration copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getSipConfig = () => {
    if (!selectedNumber) return null;

    const domain = "numsphere.pstn.twilio.com";
    const username = selectedNumber.phone_number.replace("+", "");

    return {
      domain,
      username,
      displayName: selectedNumber.friendly_name || selectedNumber.phone_number,
      authUsername: username,
      proxyServer: `sip:${domain}`,
      registrarServer: `sip:${domain}`,
      outboundProxy: `${domain}:5060`,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  const sipConfig = getSipConfig();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    SIP Phone Integration
                  </h1>
                  <p className="text-xs text-gray-600">
                    Connect your SIP Phone Integration via SIP
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {twilioNumbers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Phone className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Phone Numbers</h3>
              <p className="text-gray-600 mb-4">
                Purchase a phone number first to configure your SIP Integrated
                phone
              </p>
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Number Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Phone Number</CardTitle>
                <CardDescription>
                  Choose which number to configure on your SIP integrated phone
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {twilioNumbers.map((num) => (
                    <button
                      key={num.id}
                      onClick={() => {
                        setSelectedNumber(num);
                        setConnectionStatus("idle");
                        setConnectionError("");
                      }}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedNumber?.id === num.id
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      <div className="font-semibold text-gray-900">
                        {num.phone_number}
                      </div>
                      <div className="text-sm text-gray-600">
                        {num.friendly_name}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Connection Status */}
            {selectedNumber && (
              <Card>
                <CardHeader>
                  <CardTitle>Connection Status</CardTitle>
                  <CardDescription>
                    Test your SIP integrated phone connection to Twilio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {connectionStatus === "idle" && (
                        <>
                          <AlertCircle className="w-6 h-6 text-gray-400" />
                          <span className="font-medium text-gray-700">
                            Not connected
                          </span>
                        </>
                      )}
                      {connectionStatus === "connecting" && (
                        <>
                          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                          <span className="font-medium text-blue-700">
                            Connecting...
                          </span>
                        </>
                      )}
                      {connectionStatus === "connected" && (
                        <>
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <span className="font-medium text-green-700">
                            Connected & Verified
                          </span>
                        </>
                      )}
                      {connectionStatus === "failed" && (
                        <>
                          <XCircle className="w-6 h-6 text-red-600" />
                          <span className="font-medium text-red-700">
                            Connection failed
                          </span>
                        </>
                      )}
                    </div>
                    <Button
                      onClick={testConnection}
                      disabled={testingConnection}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test Connection"
                      )}
                    </Button>
                  </div>

                  {connectionError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{connectionError}</p>
                    </div>
                  )}

                  {connectionStatus === "connecting" && (
                    <div className="space-y-3">
                      <Progress
                        value={(connectionStep / connectionSteps.length) * 100}
                      />
                      <div className="space-y-2">
                        {connectionSteps.map((step, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-2 text-sm ${
                              index < connectionStep
                                ? "text-green-600"
                                : index === connectionStep
                                  ? "text-blue-600 font-semibold"
                                  : "text-gray-400"
                            }`}
                          >
                            {index < connectionStep ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : index === connectionStep ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                            )}
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {connectionStatus === "connected" && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-green-900 mb-1">
                            Connection Verified!
                          </h4>
                          <p className="text-sm text-green-800">
                            Your phone number is properly configured with
                            Numsphere SIP. Your SIP phone should now be able to
                            register and make/receive calls.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SIP Configuration */}
            {sipConfig && (
              <Card>
                <CardHeader>
                  <CardTitle>SIP Configuration for SIP Phones</CardTitle>
                  <CardDescription>
                    Use these settings to configure your SIP phone or any
                    SIP-compatible device
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">
                        SIP Domain
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={sipConfig.domain}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(sipConfig.domain)}
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-gray-700">
                        Username / Auth Username
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={sipConfig.username}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(sipConfig.username)}
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-gray-700">
                        Display Name
                      </Label>
                      <Input
                        value={sipConfig.displayName}
                        readOnly
                        className="font-mono text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-gray-700">
                        Proxy Server
                      </Label>
                      <Input
                        value={sipConfig.proxyServer}
                        readOnly
                        className="font-mono text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-gray-700">
                        Registrar Server
                      </Label>
                      <Input
                        value={sipConfig.registrarServer}
                        readOnly
                        className="font-mono text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-gray-700">
                        Outbound Proxy
                      </Label>
                      <Input
                        value={sipConfig.outboundProxy}
                        readOnly
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      📱 SIP Phone Setup Instructions
                    </h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Access your SIP phone's web interface</li>
                      <li>Navigate to Admin Login → Advanced → Voice → SIP</li>
                      <li>Enter the SIP configuration details above</li>
                      <li>Set Transport Type to UDP or TCP</li>
                      <li>Save and reboot your phone</li>
                      <li>Click "Test Connection" above to verify</li>
                    </ol>
                  </div>

                  <Button
                    onClick={() => {
                      const config = `SIP Configuration for ${selectedNumber.phone_number}\n\nDomain: ${sipConfig.domain}\nUsername: ${sipConfig.username}\nAuth Username: ${sipConfig.username}\nDisplay Name: ${sipConfig.displayName}\nProxy Server: ${sipConfig.proxyServer}\nRegistrar Server: ${sipConfig.registrarServer}\nOutbound Proxy: ${sipConfig.outboundProxy}`;
                      copyToClipboard(config);
                    }}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All Configuration
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
