"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../../supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Loader2, Mail, Shield } from "lucide-react";

interface BusinessBranding {
  id: string;
  business_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

export default function BusinessSignupPage() {
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessBranding | null>(null);
  const [invitationEmail, setInvitationEmail] = useState("");
  const [invitationToken, setInvitationToken] = useState("");
  const [signingUp, setSigningUp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    loadInvitationData();
  }, []);

  const loadInvitationData = async () => {
    try {
      const token = searchParams.get("token");
      if (!token) {
        toast({
          title: "Invalid invitation",
          description: "No invitation token found",
          variant: "destructive",
        });
        router.push("/sign-in");
        return;
      }

      setInvitationToken(token);

      const { data: invitation, error: inviteError } = await supabase
        .from("employee_invitations")
        .select("*, business_accounts(*)")
        .eq("invitation_token", token)
        .eq("status", "pending")
        .single();

      if (inviteError || !invitation) {
        toast({
          title: "Invalid invitation",
          description: "This invitation is invalid or has expired",
          variant: "destructive",
        });
        router.push("/sign-in");
        return;
      }

      setInvitationEmail(invitation.email);
      setBusiness(invitation.business_accounts);
    } catch (error: any) {
      console.error("Error loading invitation:", error);
      toast({
        title: "Error",
        description: "Failed to load invitation details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSigningUp(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;

      if (email !== invitationEmail) {
        toast({
          title: "Email mismatch",
          description: `You must use the invited email: ${invitationEmail}`,
          variant: "destructive",
        });
        setSigningUp(false);
        return;
      }

      // Send OTP code
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setOtpSent(true);
      toast({
        title: "Code sent!",
        description: "Check your email for the 6-digit verification code",
      });
    } catch (error: any) {
      toast({
        title: "Failed to send code",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSigningUp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setVerifying(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: invitationEmail,
        token: otpCode,
        type: "email",
      });

      if (error) throw error;

      // Redirect to accept invitation
      router.push(`/accept-invitation?token=${invitationToken}`);
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This invitation link is invalid or has expired.
            </p>
            <Button onClick={() => router.push("/sign-in")}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = business.primary_color || "#4F46E5";
  const secondaryColor = business.secondary_color || "#7C3AED";

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
      }}
    >
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="inline-flex flex-col items-center gap-4 mb-8">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.business_name}
                className="w-24 h-24 object-contain bg-white rounded-2xl p-4 shadow-2xl"
              />
            ) : (
              <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                <Building
                  className="w-12 h-12"
                  style={{ color: primaryColor }}
                />
              </div>
            )}
            <h1 className="text-4xl font-black text-white">
              {business.business_name}
            </h1>
          </div>

          <h2 className="text-5xl font-black text-white mb-4 leading-tight">
            Join the Team
          </h2>
          <p className="text-xl text-white/90 font-medium">
            You've been invited to join {business.business_name}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
            <Mail className="w-4 h-4 text-white" />
            <span className="text-white font-semibold">{invitationEmail}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border-4 border-gray-900 p-8">
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <Label
                  htmlFor="email"
                  className="text-sm font-black text-gray-900 mb-2 block"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={invitationEmail}
                  readOnly
                  className="mt-1 block w-full px-4 py-3 border-4 border-gray-900 rounded-2xl shadow-sm bg-gray-50 font-semibold"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You must use this email address
                </p>
              </div>

              <Button
                type="submit"
                disabled={signingUp}
                className="w-full flex justify-center items-center py-4 px-4 border-4 border-gray-900 rounded-2xl shadow-lg text-base font-black text-white focus:outline-none focus:ring-4 transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                {signingUp ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <Label
                  htmlFor="otp"
                  className="text-sm font-black text-gray-900 mb-2 block"
                >
                  Verification Code
                </Label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border-4 border-gray-900 rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500 font-mono text-center text-lg tracking-widest"
                  placeholder="000000"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter the 6-digit code from your email
                </p>
              </div>

              <Button
                type="submit"
                disabled={verifying || otpCode.length !== 6}
                className="w-full flex justify-center items-center py-4 px-4 border-4 border-gray-900 rounded-2xl shadow-lg text-base font-black text-white focus:outline-none focus:ring-4 transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Verify Code
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode("");
                }}
                className="w-full text-sm"
              >
                ← Back to email
              </Button>
            </form>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-white/90 font-medium">
            Your data is protected with enterprise-grade encryption
          </p>
        </div>
      </div>
    </div>
  );
}