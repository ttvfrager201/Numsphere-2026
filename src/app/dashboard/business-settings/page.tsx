"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../../supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Users,
  Mail,
  Loader2,
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckCircle,
  XCircle,
  Settings,
  Clock,
  UserPlus,
} from "lucide-react";
import DashboardNavbar from "@/components/dashboard-navbar";

interface BusinessAccount {
  id: string;
  business_name: string;
  subdomain: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface EmployeeInvitation {
  id: string;
  business_id: string;
  email: string;
  invited_at: string;
  status: "pending" | "accepted" | "expired";
  invitation_token?: string;
}

interface Employee {
  id: string;
  business_id: string;
  user_id: string;
  email: string;
  created_at: string;
  profile_picture_url?: string;
}

interface Widget {
  id: string;
  widget_key: string;
  widget_name: string;
  enabled_for_employees: boolean;
  display_order: number;
}

export default function BusinessSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessAccount | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invitations, setInvitations] = useState<EmployeeInvitation[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/sign-in");
        return;
      }

      // 1️⃣ Fetch business account
      const { data: businessData, error: businessError } = await supabase
        .from("business_accounts")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (businessError) throw businessError;
      setBusiness(businessData);

      // 2️⃣ Fetch active employees
      const { data: employeesData, error: employeesError } = await supabase
        .from("business_employees")
        .select("*")
        .eq("business_id", businessData.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      // 3️⃣ Fetch ONLY pending invitations (accepted ones are deleted)
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("employee_invitations")
        .select("*")
        .eq("business_id", businessData.id)
        .eq("status", "pending")
        .order("invited_at", { ascending: false });

      if (invitationsError) throw invitationsError;
      setInvitations(invitationsData || []);

      // 4️⃣ Fetch widgets (optional - only if you're using this feature)
      const { data: widgetsData } = await supabase
        .from("dashboard_widgets")
        .select("*")
        .eq("business_id", businessData.id)
        .order("display_order", { ascending: true });

      setWidgets(widgetsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load business data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !business) return;

    setUploadingLogo(true);
    try {
      // Delete old logo if exists
      if (business.logo_url) {
        const oldPath = business.logo_url.split('/').slice(-2).join('/');
        await supabase.storage.from("business-assets").remove([oldPath]);
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${business.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("business-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("business-assets").getPublicUrl(filePath);

      await supabase
        .from("business_accounts")
        .update({ logo_url: publicUrl })
        .eq("id", business.id);

      setBusiness({ ...business, logo_url: publicUrl });

      toast({
        title: "Logo updated!",
        description: "Your business logo has been updated successfully.",
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

  const handleColorUpdate = async (
    field: "primary_color" | "secondary_color",
    value: string,
  ) => {
    if (!business) return;

    try {
      await supabase
        .from("business_accounts")
        .update({ [field]: value })
        .eq("id", business.id);

      setBusiness({ ...business, [field]: value });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update color",
        variant: "destructive",
      });
    }
  };

  const handleInviteEmployee = async () => {
    if (!inviteEmail || !business) return;

    setInviting(true);
    try {
      // Generate invitation token
      const invitationToken = crypto.randomUUID();

      // Create employee invitation in the new table
      const { data: invitation, error: inviteError } = await supabase
        .from("employee_invitations")
        .insert({
          business_id: business.id,
          email: inviteEmail,
          status: "pending",
          invitation_token: invitationToken,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Send invitation email via Supabase function
      const { error: emailError } = await supabase.functions.invoke(
        "send-employee-invitation",
        {
          body: {
            email: inviteEmail,
            businessName: business.business_name,
            invitationToken: invitationToken,
            businessId: business.id,
          },
        },
      );

      if (emailError) {
        console.error("Email sending failed:", emailError);
        // Don't throw - invitation was created successfully
        toast({
          title: "Invitation created",
          description:
            "Invitation created but email sending failed. Please check your email configuration.",
          variant: "default",
        });
      } else {
        toast({
          title: "Invitation sent!",
          description: `Invitation email sent to ${inviteEmail}`,
        });
      }

      setInvitations([invitation, ...invitations]);
      setInviteEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("employee_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      setInvitations(invitations.filter((inv) => inv.id !== invitationId));

      toast({
        title: "Invitation removed",
        description: "The invitation has been cancelled",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove invitation",
        variant: "destructive",
      });
    }
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from("business_employees")
        .delete()
        .eq("id", employeeId);

      if (error) throw error;

      setEmployees(employees.filter((e) => e.id !== employeeId));

      toast({
        title: "Employee removed",
        description: "Employee has been removed from your business",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove employee",
        variant: "destructive",
      });
    }
  };

  const handleToggleWidget = async (widgetId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("dashboard_widgets")
        .update({ enabled_for_employees: enabled })
        .eq("id", widgetId);

      if (error) throw error;

      setWidgets(
        widgets.map((w) =>
          w.id === widgetId ? { ...w, enabled_for_employees: enabled } : w,
        ),
      );

      toast({
        title: "Widget updated",
        description: `Widget ${enabled ? "enabled" : "disabled"} for employees`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update widget",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <DashboardNavbar />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <DashboardNavbar />
        <div className="flex items-center justify-center h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No Business Account</CardTitle>
              <CardDescription>
                You need to create a business account first
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/onboarding")}>
                Go to Onboarding
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <DashboardNavbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-10 h-10 text-indigo-600" />
            Business Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your business branding, employees, and dashboard widgets
          </p>
        </div>

        <div className="grid gap-6">
          {/* Branding Section */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                Business Branding
              </CardTitle>
              <CardDescription>
                Customize your business logo and colors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div>
                <Label className="text-base font-semibold">Business Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt="Logo"
                      className="w-20 h-20 object-contain rounded-lg border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        document.getElementById("logo-upload")?.click()
                      }
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {business.logo_url ? "Change Logo" : "Upload Logo"}
                    </Button>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </div>
                </div>
              </div>

              {/* Brand Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-base font-semibold">
                    Primary Color
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="color"
                      value={business.primary_color}
                      onChange={(e) =>
                        handleColorUpdate("primary_color", e.target.value)
                      }
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                    />
                    <Input
                      value={business.primary_color}
                      onChange={(e) =>
                        handleColorUpdate("primary_color", e.target.value)
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-base font-semibold">
                    Secondary Color
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="color"
                      value={business.secondary_color}
                      onChange={(e) =>
                        handleColorUpdate("secondary_color", e.target.value)
                      }
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                    />
                    <Input
                      value={business.secondary_color}
                      onChange={(e) =>
                        handleColorUpdate("secondary_color", e.target.value)
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Subdomain Info */}
              <div>
                <Label className="text-base font-semibold">
                  Custom Sign-In URL
                </Label>
                <div className="mt-2 p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Your employees can sign in at:
                  </p>
                  <code className="text-indigo-600 font-mono font-bold">
                    https://{business.subdomain}.numsphere.online/sign-in
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Management */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Team Management
              </CardTitle>
              <CardDescription>
                Invite and manage your team members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Invite Form */}
              <div className="flex gap-2">
                <Input
                  placeholder="employee@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleInviteEmployee()
                  }
                  className="flex-1"
                />
                <Button
                  onClick={handleInviteEmployee}
                  disabled={inviting || !inviteEmail}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600"
                >
                  {inviting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Invite
                    </>
                  )}
                </Button>
              </div>

              {/* Pending Invitations Section */}
              {invitations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-semibold text-gray-700">
                      Pending Invitations ({invitations.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-4 border-2 border-amber-100 bg-amber-50/50 rounded-lg hover:border-amber-200 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                            <Mail className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {invitation.email}
                            </p>
                            <p className="text-sm text-gray-500">
                              Invited{" "}
                              {new Date(
                                invitation.invited_at,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemoveInvitation(invitation.id)
                            }
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Employees Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-4 h-4 text-green-600" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    Active Employees ({employees.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-lg hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {employee.profile_picture_url ? (
                          <img
                            src={employee.profile_picture_url}
                            alt={employee.email}
                            className="w-10 h-10 rounded-full object-cover border-2 border-indigo-200"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">
                              {employee.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {employee.email}
                          </p>
                          <p className="text-sm text-gray-500">
                            Joined{" "}
                            {new Date(employee.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEmployee(employee.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {employees.length === 0 && invitations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No team members yet. Invite your first employee!</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Widget Preferences */}
          {widgets.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  Employee Dashboard Widgets
                </CardTitle>
                <CardDescription>
                  Control which widgets employees can see on their dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-lg hover:border-indigo-200 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {widget.widget_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {widget.enabled_for_employees
                            ? "Visible to employees"
                            : "Hidden from employees"}
                        </p>
                      </div>
                      <Switch
                        checked={widget.enabled_for_employees}
                        onCheckedChange={(checked) =>
                          handleToggleWidget(widget.id, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}