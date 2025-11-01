"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function AcceptInvitationPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    acceptInvitation();
  }, []);

  const acceptInvitation = async () => {
    try {
      const invitationId = searchParams.get("id");
      if (!invitationId) {
        throw new Error("Invalid invitation link");
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect to sign in with invitation ID
        router.push(`/sign-in?invitation=${invitationId}`);
        return;
      }

      // Get invitation details
      const { data: invitation, error: inviteError } = await supabase
        .from("business_employees")
        .select("*, business_accounts(business_name)")
        .eq("id", invitationId)
        .single();

      if (inviteError) throw inviteError;

      // Check if email matches
      if (invitation.email !== user.email) {
        throw new Error("This invitation is for a different email address");
      }

      // Update invitation status
      await supabase
        .from("business_employees")
        .update({
          user_id: user.id,
          status: "active",
        })
        .eq("id", invitationId);

      // Update user account type
      await supabase
        .from("users")
        .update({
          account_type: "business",
        })
        .eq("id", user.id);

      setStatus("success");
      setMessage(`You've successfully joined ${invitation.business_accounts?.business_name}!`);

      toast({
        title: "Success!",
        description: "You've joined the business. Redirecting to dashboard...",
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      setStatus("error");
      setMessage(error.message || "Failed to accept invitation");
      
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {status === "loading" && "Processing Invitation..."}
            {status === "success" && "Welcome Aboard! 🎉"}
            {status === "error" && "Invitation Error"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
              <p className="text-gray-600">Accepting your invitation...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-gray-900 font-semibold">{message}</p>
              <p className="text-sm text-gray-600">Redirecting to your dashboard...</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <p className="text-gray-900 font-semibold">{message}</p>
              <Button
                onClick={() => router.push("/sign-in")}
                className="bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                Go to Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}