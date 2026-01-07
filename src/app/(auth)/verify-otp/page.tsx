"use client";

import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage, Message } from "@/components/form-message";
import {
  Phone,
  Zap,
  ArrowRight,
  Shield,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { verifyOtpAction } from "@/app/actions";
import { useRouter } from "next/navigation";

export default function VerifyOtp({
  searchParams,
}: {
  searchParams: Message & { email?: string; type?: string; token?: string };
}) {
  const email = searchParams.email || "";
  const type = searchParams.type || "magiclink";
  const invitationToken = searchParams.token || "";
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        ></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo and Header */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-3 group mb-8 hover:scale-105 transition-transform"
          >
            <div className="relative w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white/30">
              <Phone className="w-6 h-6 text-indigo-600" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white"></div>
            </div>
            <span className="text-3xl font-black text-white">Numsphere*</span>
          </Link>

          <h2 className="text-5xl font-black text-white mb-4 leading-tight">
            Verify Your Email
          </h2>
          <p className="text-xl text-indigo-100 font-medium">
            Enter the verification code sent to your email
          </p>
        </div>

        {/* OTP Form */}
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-gray-900 p-8">
          <form className="space-y-6" action={async (formData: FormData) => {
            const token = formData.get("token") as string;
            const email = formData.get("email") as string;
            const invToken = formData.get("invitationToken") as string;
            
            // This will be handled by the server action
            await verifyOtpAction(formData);
            
            // If signup type and has invitation token, redirect to accept-invitation
            if (type === "signup" && invToken) {
              router.push(`/accept-invitation?token=${invToken}`);
            }
          }}>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="invitationToken" value={invitationToken} />

            <div>
              <Label
                htmlFor="token"
                className="text-sm font-black text-gray-900 mb-2 block"
              >
                Verification Code
              </Label>
              <Input
                id="token"
                name="token"
                type="text"
                autoComplete="one-time-code"
                required
                maxLength={6}
                className="mt-1 block w-full px-4 py-3 border-4 border-gray-900 rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500 font-mono text-center text-lg tracking-widest"
                placeholder="000000"
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter the 6-digit code from your email
              </p>
            </div>

            <SubmitButton
              formAction={verifyOtpAction}
              className="w-full flex justify-center items-center py-4 px-4 border-4 border-gray-900 rounded-2xl shadow-lg text-base font-black text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-500 transition-all hover:scale-105"
              pendingText="Verifying..."
            >
              <Shield className="mr-2 w-5 h-5" />
              Verify Code
              <ArrowRight className="ml-2 w-5 h-5" />
            </SubmitButton>

            <FormMessage message={searchParams} />
          </form>

          <div className="mt-6 text-center space-y-4">
            <p className="text-sm text-gray-700 font-semibold">
              Didn't receive the code?{" "}
              <Link
                href={`/sign-in?email=${encodeURIComponent(email)}`}
                className="font-black text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Resend code
              </Link>
            </p>

            <p className="text-sm text-gray-700 font-semibold">
              Wrong email?{" "}
              <Link
                href="/sign-in"
                className="font-black text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Try again
              </Link>
            </p>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white font-bold mt-6">
          <div className="flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Easy setup
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center mt-4">
          <p className="text-sm text-indigo-100 font-medium">
            This code will expire in 10 minutes for your security
          </p>
        </div>
      </div>
    </div>
  );
}