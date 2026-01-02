import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { businessId, email, role = "employee" } = body;

  if (!businessId || !email) {
    return NextResponse.json(
      { error: "Business ID and email are required" },
      { status: 400 }
    );
  }

  const { data: business } = await supabase
    .from("business_accounts")
    .select("id, owner_id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json(
      { error: "Business not found or unauthorized" },
      { status: 403 }
    );
  }

  const { data: invitation, error } = await supabase
    .from("employee_invitations")
    .insert({
      business_id: businessId,
      email,
      role,
      invited_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Invitation already sent to this email" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await supabase.functions.invoke("send-employee-invitation", {
      body: {
        email,
        businessName: business.business_name || "the business",
        invitationId: invitation.id,
      },
    });
  } catch (err) {
    console.error("Failed to send invitation email:", err);
  }

  return NextResponse.json({ invitation });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 }
    );
  }

  const { data: business } = await supabase
    .from("business_accounts")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json(
      { error: "Business not found or unauthorized" },
      { status: 403 }
    );
  }

  const { data: invitations, error } = await supabase
    .from("employee_invitations")
    .select("*")
    .eq("business_id", businessId)
    .order("invited_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invitations });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const invitationId = searchParams.get("id");

  if (!invitationId) {
    return NextResponse.json(
      { error: "Invitation ID is required" },
      { status: 400 }
    );
  }

  const { data: invitation } = await supabase
    .from("employee_invitations")
    .select("business_id")
    .eq("id", invitationId)
    .single();

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  const { data: business } = await supabase
    .from("business_accounts")
    .select("id")
    .eq("id", invitation.business_id)
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("employee_invitations")
    .delete()
    .eq("id", invitationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
