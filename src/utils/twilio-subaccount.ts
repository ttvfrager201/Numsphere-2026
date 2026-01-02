import { createClient } from "@/utils/supabase/server";

export interface TwilioSubaccountCredentials {
  accountSid: string;
  authToken: string;
}

/**
 * Gets or creates a Twilio subaccount for the authenticated user
 * Returns the subaccount credentials to use for Twilio API calls
 */
export async function getOrCreateTwilioSubaccount(): Promise<TwilioSubaccountCredentials> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const mainAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const mainAuthToken = process.env.TWILIO_AUTH_TOKEN;

  if (!mainAccountSid || !mainAuthToken) {
    throw new Error("Twilio credentials not configured");
  }

  // First, check if user has a business account
  const { data: userData } = await supabase
    .from("users")
    .select("account_type, business_id, twilio_subaccount_sid")
    .eq("id", user.id)
    .single();

  if (!userData) {
    throw new Error("User not found");
  }

  let subaccountSid: string | null = null;
  let isBusinessAccount = false;

  // Check if user has a business account
  if (userData.account_type === "business" && userData.business_id) {
    isBusinessAccount = true;
    const { data: businessData } = await supabase
      .from("business_accounts")
      .select("twilio_subaccount_sid")
      .eq("id", userData.business_id)
      .single();

    if (businessData?.twilio_subaccount_sid) {
      subaccountSid = businessData.twilio_subaccount_sid;
    }
  } else {
    // Individual account - check user's subaccount
    subaccountSid = userData.twilio_subaccount_sid;
  }

  // If subaccount exists, get its auth token
  if (subaccountSid) {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${subaccountSid}.json`,
        {
          headers: {
            Authorization: `Basic ${btoa(`${mainAccountSid}:${mainAuthToken}`)}`,
          },
        }
      );

      if (response.ok) {
        const subaccount = await response.json();
        return {
          accountSid: subaccount.sid,
          authToken: subaccount.auth_token,
        };
      }
    } catch (error) {
      console.error("Error fetching subaccount:", error);
      // If subaccount doesn't exist in Twilio, we'll create a new one
    }
  }

  // Create a new subaccount
  const friendlyName = isBusinessAccount
    ? `Business Account for ${userData.business_id}`
    : `Individual Account for ${user.id}`;

  const createResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${mainAccountSid}:${mainAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        FriendlyName: friendlyName,
      }),
    }
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create Twilio subaccount: ${errorText}`);
  }

  const newSubaccount = await createResponse.json();

  // Save the subaccount SID to the database
  if (isBusinessAccount && userData.business_id) {
    await supabase
      .from("business_accounts")
      .update({ twilio_subaccount_sid: newSubaccount.sid })
      .eq("id", userData.business_id);
  } else {
    await supabase
      .from("users")
      .update({ twilio_subaccount_sid: newSubaccount.sid })
      .eq("id", user.id);
  }

  return {
    accountSid: newSubaccount.sid,
    authToken: newSubaccount.auth_token,
  };
}
