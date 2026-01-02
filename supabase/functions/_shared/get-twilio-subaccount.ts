// Helper function to get or create a Twilio subaccount for a user/business
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface TwilioSubaccountCredentials {
  accountSid: string;
  authToken: string;
  apiKey?: string;
  apiSecret?: string;
}

/**
 * Gets or creates a Twilio subaccount for a user
 * Returns the subaccount credentials to use for Twilio API calls
 */
export async function getOrCreateTwilioSubaccount(
  userId: string,
  supabaseClient: any,
  mainAccountSid: string,
  mainAuthToken: string
): Promise<TwilioSubaccountCredentials> {
  // First, check if user has a business account
  const { data: userData } = await supabaseClient
    .from("users")
    .select("account_type, business_id, twilio_subaccount_sid")
    .eq("id", userId)
    .single();

  if (!userData) {
    throw new Error("User not found");
  }

  let subaccountSid: string | null = null;
  let isBusinessAccount = false;

  // Check if user has a business account
  if (userData.account_type === "business" && userData.business_id) {
    isBusinessAccount = true;
    const { data: businessData } = await supabaseClient
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
    : `Individual Account for ${userId}`;

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
    await supabaseClient
      .from("business_accounts")
      .update({ twilio_subaccount_sid: newSubaccount.sid })
      .eq("id", userData.business_id);
  } else {
    await supabaseClient
      .from("users")
      .update({ twilio_subaccount_sid: newSubaccount.sid })
      .eq("id", userId);
  }

  return {
    accountSid: newSubaccount.sid,
    authToken: newSubaccount.auth_token,
  };
}
