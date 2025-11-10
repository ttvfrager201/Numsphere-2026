"use server";

import { encodedRedirect } from "@/utils/utils";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const fullName = formData.get("full_name")?.toString() || "";
  const address = formData.get("address")?.toString() || "";
  const supabase = await createClient();

  if (!email) {
    return encodedRedirect("error", "/sign-up", "Email is required");
  }

  // Send OTP for sign up
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: {
        full_name: fullName,
        address: address,
        email: email,
      },
    },
  });

  if (error) {
    return encodedRedirect("error", "/sign-up", error.message);
  }

  return redirect(`/verify-otp?email=${encodeURIComponent(email)}&type=signup`);
};

export const verifyOtpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const token = formData.get("token")?.toString();
  const type = formData.get("type")?.toString() as "signup" | "magiclink";
  const supabase = await createClient();

  if (!email || !token) {
    return encodedRedirect(
      "error",
      "/sign-in",
      "Email and verification code are required",
    );
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.verifyOtp({
    email,
    token,
    type: type || "magiclink",
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  if (user) {
    try {
      // Check if user already exists in our users table
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!existingUser) {
        // Create user record if it doesn't exist
        const { error: updateError } = await supabase.from("users").insert({
          id: user.id,
          user_id: user.id,
          name: user.user_metadata?.full_name || "",
          email: user.email || "",
          address: user.user_metadata?.address || "",
          token_identifier: user.id,
          created_at: new Date().toISOString(),
        });

        if (updateError) {
          return encodedRedirect(
            "error",
            "/sign-in",
            "Error creating user profile. Please try again.",
          );
        }
      }
    } catch (err) {
      return encodedRedirect(
        "error",
        "/sign-in",
        "Error creating user profile. Please try again.",
      );
    }
  }

  return redirect("/dashboard");
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const supabase = await createClient();

  if (!email) {
    return encodedRedirect("error", "/sign-in", "Email is required");
  }

  // Send OTP for sign in
  const { error } = await supabase.auth.signInWithOtp({
    email,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect(
    `/verify-otp?email=${encodeURIComponent(email)}&type=magiclink`,
  );
};

export const signInWithGoogleAction = async () => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `https://66861be7-0835-4ca2-9e0d-8735189e5980.canvases.tempo.build/auth/callback`,
    },
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  if (data.url) {
    redirect(data.url);
  }
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {});

  if (error) {
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export const signInWithPasswordAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", "Could not authenticate user");
  }

  return redirect("/dashboard");
};

export const signUpWithPasswordAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://a3e7eede-1fb4-49e2-a6c1-0471dd7dfb92.canvases.tempo.build"}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", "Could not authenticate user");
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Check email to continue sign in process",
  );
};

export const checkUserSubscription = async (userId: string) => {
  const supabase = await createClient();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error) {
    return false;
  }

  return !!subscription;
};
