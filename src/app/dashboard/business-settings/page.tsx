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

interface Employee {
  id: string;
  email: string;
  status: "pending" | "active";
  invited_at: string;
  user_id: string;
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

      // Get business account
      const { data: businessData, error: businessError } = await supabase
        .from("business_accounts")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (businessError) throw businessError;
      setBusiness(businessData);

      // Get employees
      const { data: employeesData } = await supabase
        .from("business_employees")
        .select("*")
        .eq("business_id", businessData.id)
        .order("invited_at", { ascending: false });

      setEmployees(employeesData || []);

      // Get widgets
      const { data: widgetsData } = await supabase
        .from("dashboard_widgets")
        .select("*")
        .eq("business_id", businessData.id)
        .order("display_order");

      setWidgets(widgetsData || []);
    } catch (error: any) {
      console.error("Error loading business data:", error);
      toast({
        title: "Error",
        description: "Failed to load business settings",
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
      const fileExt = file.name.split(".").pop();
      const fileName = `${business.id}-${Math.random()}.${fileExt}`;
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
      // Create employee invitation
      const { data: invitation, error: inviteError } = await supabase
        .from("business_employees")
        .insert({
          business_id: business.id,
          email: inviteEmail,
          status: "pending",
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke(
        "supabase-functions-send-employee-invitation",
        {
          body: {
            email: inviteEmail,
            businessName: business.business_name,
            invitationId: invitation.id,
          },
        },
      );

      if (emailError) throw emailError;

      setEmployees([invitation, ...employees]);
      setInviteEmail("");

      toast({
        title: "Invitation sent!",
        description: `Invitation email sent to ${inviteEmail}`,
      });
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

  const handleToggleWidget = async (widgetId: string, enabled: boolean) => {
    try {
      await supabase
        .from("dashboard_widgets")
        .update({ enabled_for_employees: enabled })
        .eq("id", widgetId);

      setWidgets(
        widgets.map((w) =>
          w.id === widgetId ? { ...w, enabled_for_employees: enabled } : w,
        ),
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update widget",
        variant: "destructive",
      });
    }
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    try {
      await supabase.from("business_employees").delete().eq("id", employeeId);

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
                Employee Management
              </CardTitle>
              <CardDescription>
                Invite and manage your team members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {/* Employee List */}
              <div className="space-y-2">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-lg hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {employee.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {employee.email}
                        </p>
                        <p className="text-sm text-gray-500">
                          Invited{" "}
                          {new Date(employee.invited_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          employee.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }
                      >
                        {employee.status === "active" ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {employee.status}
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
                {employees.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No employees yet. Invite your first team member!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Widget Preferences */}
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
        </div>
      </div>
    </div>
  );
}
