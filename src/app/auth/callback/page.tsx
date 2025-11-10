"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building, User, Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [hasEmployeeAccount, setHasEmployeeAccount] = useState(false);
  const [hasPersonalAccount, setHasPersonalAccount] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push("/sign-in");
        return;
      }

      setUserEmail(user.email || "");

      // Check if user exists in users table
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, account_type")
        .eq("id", user.id)
        .single();

      if (!existingUser) {
        // Create user record
        await supabase.from("users").insert({
          id: user.id,
          user_id: user.id,
          name: user.user_metadata?.full_name || "",
          email: user.email || "",
          token_identifier: user.id,
          created_at: new Date().toISOString(),
        });
      }

      // Check for employee invitation
      const { data: employeeData } = await supabase
        .from("business_employees")
        .select("*, business_accounts(business_name, logo_url)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      // Check for pending invitation
      const { data: pendingInvitation } = await supabase
        .from("employee_invitations")
        .select("*, business_accounts(business_name, logo_url)")
        .eq("email", user.email)
        .eq("status", "pending")
        .single();

      if (employeeData) {
        setHasEmployeeAccount(true);
        setBusinessInfo(employeeData.business_accounts);
      }

      if (pendingInvitation) {
        // Auto-accept invitation
        await supabase
          .from("business_employees")
          .insert({
            business_id: pendingInvitation.business_id,
            user_id: user.id,
            email: user.email,
            profile_picture_url: user.user_metadata?.avatar_url || null,
          });

        await supabase
          .from("employee_invitations")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", pendingInvitation.id);

        await supabase
          .from("users")
          .update({ account_type: "business" })
          .eq("id", user.id);

        toast({
          title: "Welcome!",
          description: `You've joined ${pendingInvitation.business_accounts.business_name}`,
        });

        router.push("/dashboard");
        return;
      }

      // Check if they have a personal account setup
      if (existingUser?.account_type === "individual") {
        setHasPersonalAccount(true);
      }

      // Show dialog if they have both options
      if (employeeData && existingUser?.account_type === "individual") {
        setShowDialog(true);
        setLoading(false);
        return;
      }

      // Direct to dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Auth callback error:", error);
      toast({
        title: "Error",
        description: "Failed to complete sign in",
        variant: "destructive",
      });
      router.push("/sign-in");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("users")
          .update({ account_type: "business" })
          .eq("id", user.id);
      }
      router.push("/dashboard");
    } catch (error) {
      console.error("Error:", error);
      router.push("/dashboard");
    }
  };

  const handlePersonalDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("users")
          .update({ account_type: "individual" })
          .eq("id", user.id);
      }
      router.push("/dashboard");
    } catch (error) {
      console.error("Error:", error);
      router.push("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
          <p className="text-gray-600 font-medium">Completing sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              Choose Your Dashboard
            </DialogTitle>
            <DialogDescription className="text-center pt-4">
              <div className="space-y-4">
                {businessInfo && (
                  <div className="flex justify-center">
                    {businessInfo.logo_url ? (
                      <img
                        src={businessInfo.logo_url}
                        alt={businessInfo.business_name}
                        className="w-20 h-20 object-contain rounded-lg border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <Building className="w-10 h-10 text-white" />
                      </div>
                    )}
                  </div>
                )}
                <p className="text-lg font-semibold text-gray-900">
                  You have access to both employee and personal accounts
                </p>
                <p className="text-sm text-gray-600">
                  Which dashboard would you like to access?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button
              onClick={handleEmployeeDashboard}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-6"
            >
              <Building className="w-5 h-5 mr-2" />
              Employee
            </Button>
            <Button
              onClick={handlePersonalDashboard}
              variant="outline"
              className="border-2 border-gray-300 font-bold py-6"
            >
              <User className="w-5 h-5 mr-2" />
              Personal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}