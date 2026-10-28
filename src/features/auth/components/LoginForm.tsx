import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Mail, KeyRound, ArrowRight, ArrowLeft, RotateCw, QrCode, CheckCircle2 } from "lucide-react-native";
import { useAuthStore } from "../store/authStore";
import { authService } from "../services/authService";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LNT_LOGO_BASE64 } from "@/assets/logoBase64";

export const LoginForm: React.FC = () => {
  const { login } = useAuthStore();
  
  // Steps: 'email' (Step 1) | 'otp' (Step 2)
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("lntqr@gmail.com");
  const [otp, setOtp] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Request OTP
  const handleRequestOtp = async () => {
    setServerError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setServerError("Please enter your registered email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setServerError("Please enter a valid email format.");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.requestOtp(cleanEmail);
      if (res.success) {
        setStep("otp");
        setOtp("");
        setCooldown(res.resendCooldown || 60);
        if (res.devOtp) {
        }
      } else {
        throw new Error(res.message || "Failed to send verification code");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to send verification code. Please check your network.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setServerError(null);
    setResending(true);

    try {
      const res = await authService.requestOtp(email.trim().toLowerCase());
      if (res.success) {
        setCooldown(res.resendCooldown || 60);
        setOtp("");
        if (res.devOtp) {
        }
      } else {
        throw new Error(res.message || "Failed to resend verification code");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to resend code";
      setServerError(msg);
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    setServerError(null);
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6) {
      setServerError("Please enter the full 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const data = await authService.verifyOtp(email.trim().toLowerCase(), cleanOtp);
      if (!data.success || !data.token || !data.user) {
        throw new Error(data.message || "Invalid or expired verification code");
      }

      await login(data.token, data.user);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Invalid or expired verification code";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Guest Login
  const handleGuestLogin = async () => {
    setServerError(null);
    setLoading(true);
    try {
      const data = await authService.guestLogin();
      if (!data.success || !data.token || !data.user) {
        throw new Error(data.message || "Failed to log in as Guest");
      }
      await login(data.token, data.user);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to log in as Guest";
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="w-full">
      {/* L&T Portal Header */}
      <View className="items-center mb-8">
        <View className="w-16 h-16 rounded-2xl bg-white items-center justify-center mb-3.5 shadow-md shadow-indigo-500/20 p-2.5 border border-slate-200 dark:border-slate-800">
          <Image
            source={{ uri: LNT_LOGO_BASE64 }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        </View>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          L&T Enterprise
        </Text>
        <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
          Tool Management & Tracking System
        </Text>
      </View>

      <Card className="p-5">
        <Text className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          {step === "email" ? "Sign In with Email OTP" : "Enter Verification Code"}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          {step === "email"
            ? "Enter your registered company email to receive a single-use login code."
            : `We sent a 6-digit verification code to ${email}.`}
        </Text>

        {serverError && (
          <View className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-3 mb-4">
            <Text className="text-xs font-semibold text-red-600 dark:text-red-400">
              {serverError}
            </Text>
          </View>
        )}

        {step === "email" ? (
          /* STEP 1: EMAIL INPUT */
          <View>
            <Input
              label="Registered Email Address"
              placeholder="e.g. lntqr@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              leftIcon={<Mail size={18} color="#94A3B8" />}
              editable={!loading}
            />

            <View className="mt-2">
              <Button
                title={loading ? "Sending Code..." : "Continue with Email OTP"}
                onPress={handleRequestOtp}
                loading={loading}
                disabled={!email.trim() || loading}
                size="lg"
              />
            </View>

            {/* Guest Divider */}
            <View className="relative my-4 flex-row items-center justify-center">
              <View className="absolute inset-0 flex-row items-center">
                <View className="w-full border-t border-slate-200 dark:border-slate-800" />
              </View>
              <View className="bg-white dark:bg-slate-900 px-3">
                <Text className="text-[10px] uppercase font-bold text-slate-400">
                  Or access as Guest
                </Text>
              </View>
            </View>

            {/* Continue as Guest Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleGuestLogin}
              disabled={loading}
              className="w-full flex-row items-center justify-center py-3 px-4 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30"
            >
              <QrCode size={18} color="#059669" />
              <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400 ml-2">
                Continue as Guest User
              </Text>
            </TouchableOpacity>

            <Text className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-5 leading-normal">
              Authorized personnel only. Contact your administrator if you need access.
            </Text>
          </View>
        ) : (
          /* STEP 2: 6-DIGIT OTP VERIFICATION */
          <View>
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Security Code
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setStep("email");
                  setServerError(null);
                }}
                disabled={loading}
              >
                <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Change email
                </Text>
              </TouchableOpacity>
            </View>

            <Input
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, "").slice(0, 6))}
              leftIcon={<KeyRound size={18} color="#94A3B8" />}
              editable={!loading}
            />

            <View className="mt-2">
              <Button
                title={loading ? "Verifying..." : "Verify & Sign In"}
                onPress={handleVerifyOtp}
                loading={loading}
                disabled={otp.trim().length !== 6 || loading}
                size="lg"
              />
            </View>

            {/* Resend Cooldown Section */}
            <View className="flex-row items-center justify-between mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Text className="text-xs text-slate-400 dark:text-slate-500">
                Didn't receive the email?
              </Text>
              {cooldown > 0 ? (
                <Text className="text-xs font-semibold text-slate-400">
                  Resend in {cooldown}s
                </Text>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleResendOtp}
                  disabled={resending}
                >
                  <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {resending ? "Sending..." : "Resend Code"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Card>
    </View>
  );
};

export default LoginForm;
