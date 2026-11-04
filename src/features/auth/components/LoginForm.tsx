import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import { Mail, KeyRound, ArrowRight, ArrowLeft, RotateCw, QrCode, CheckCircle2, Phone, Smartphone, ShieldCheck } from "lucide-react-native";
import { useAuthStore } from "../store/authStore";
import { authService } from "../services/authService";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LNT_LOGO_BASE64 } from "@/assets/logoBase64";
import { validateEmail } from "@/utils/validation";

export const LoginForm: React.FC = () => {
  const { login } = useAuthStore();
  
  // Steps: 'email' (Staff Step 1) | 'otp' (Staff Step 2) | 'guest-phone' (Guest Step 1) | 'guest-otp' (Guest Step 2)
  const [step, setStep] = useState<"email" | "otp" | "guest-phone" | "guest-otp">("email");
  const [email, setEmail] = useState("lntqr@gmail.com");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // --- STAFF AUTH FLOW ---
  // Step 1: Request Email OTP
  const handleRequestOtp = async () => {
    setServerError(null);
    const cleanEmail = email.trim().toLowerCase();

    const emailCheck = validateEmail(cleanEmail);
    if (!emailCheck.isValid) {
      setServerError(emailCheck.error || "Please enter a valid email address with '@' and '.'.");
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
          setDevOtpHint(res.devOtp);
        }
      } else {
        throw new Error(res.message || "Failed to send verification code");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        err?.message ||
        "Unable to send verification code. Please check your network.";
      setServerError(msg);
      Alert.alert("Unable to Send Code", msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend Staff Email OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setServerError(null);
    const cleanEmail = email.trim().toLowerCase();

    const emailCheck = validateEmail(cleanEmail);
    if (!emailCheck.isValid) {
      const err = emailCheck.error || "Please enter a valid email address with '@' and '.'.";
      setServerError(err);
      Alert.alert("Invalid Email", err);
      return;
    }

    setResending(true);

    try {
      const res = await authService.requestOtp(email.trim().toLowerCase());
      if (res.success) {
        setCooldown(res.resendCooldown || 60);
        setOtp("");
        if (res.devOtp) {
          setDevOtpHint(res.devOtp);
        }
      } else {
        throw new Error(res.message || "Failed to resend verification code");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        err?.message ||
        "Failed to resend code";
      setServerError(msg);
      Alert.alert("Resend Failed", msg);
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify Staff Email OTP
  const handleVerifyOtp = async () => {
    setServerError(null);
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      const msg = "Please enter the 6-digit verification code.";
      setServerError(msg);
      Alert.alert("Verification Code Required", msg);
      return;
    }

    if (cleanOtp.length !== 6) {
      const msg = "Please enter the full 6-digit verification code.";
      setServerError(msg);
      Alert.alert("Incomplete Code", msg);
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
        err?.response?.data?.errors?.[0]?.message ||
        err?.message ||
        "Invalid or expired verification code";
      setServerError(msg);
      Alert.alert("Verification Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  // --- GUEST MOBILE SMS OTP FLOW ---
  // Start Guest Flow
  const handleStartGuestFlow = () => {
    setServerError(null);
    setOtp("");
    setDevOtpHint(null);
    setCooldown(0);
    setStep("guest-phone");
  };

  // Step 1 (Guest): Request SMS OTP
  const handleRequestGuestOtp = async () => {
    setServerError(null);
    const cleanDigits = phone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
      setServerError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.requestGuestOtp(cleanDigits);
      if (res.success) {
        setStep("guest-otp");
        setOtp("");
        setCooldown(res.resendCooldown || 60);
        if (res.devOtp) {
          setDevOtpHint(res.devOtp);
        }
      } else {
        throw new Error(res.message || "Failed to send SMS code");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        err?.message ||
        "Unable to send SMS verification code.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend Guest SMS OTP
  const handleResendGuestOtp = async () => {
    if (cooldown > 0 || resending) return;
    setServerError(null);
    setResending(true);

    try {
      const cleanDigits = phone.replace(/\D/g, "");
      const res = await authService.requestGuestOtp(cleanDigits);
      if (res.success) {
        setCooldown(res.resendCooldown || 60);
        setOtp("");
        if (res.devOtp) {
          setDevOtpHint(res.devOtp);
        }
      } else {
        throw new Error(res.message || "Failed to resend SMS code");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to resend SMS code";
      setServerError(msg);
    } finally {
      setResending(false);
    }
  };

  // Step 2 (Guest): Verify SMS OTP
  const handleVerifyGuestOtp = async () => {
    setServerError(null);
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6) {
      setServerError("Please enter the full 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const cleanDigits = phone.replace(/\D/g, "");
      const data = await authService.verifyGuestOtp(cleanDigits, cleanOtp);
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

      <Card className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/5">
        <Text className="text-xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
          {step === "email" && "Sign in to your account"}
          {step === "otp" && "Enter Verification Code"}
          {step === "guest-phone" && "Guest Scanner Access"}
          {step === "guest-otp" && "Enter SMS Verification Code"}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          {step === "email" && "Enter your registered L&T company email to receive a single-use login code."}
          {step === "otp" && `We sent a 6-digit verification code to ${email}.`}
          {step === "guest-phone" && "Enter your 10-digit mobile number to receive a verification code via SMS to access the equipment QR scanner."}
          {step === "guest-otp" && `We sent a 6-digit verification code via SMS to +91 ${phone.replace(/\D/g, "")}.`}
        </Text>

        {serverError && (
          <View className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
            <Text className="text-xs font-semibold text-rose-600 dark:text-rose-400 leading-normal">
              {serverError}
            </Text>
          </View>
        )}

        {/* STEP 1: STAFF EMAIL ENTRY FORM */}
        {step === "email" && (
          <View>
            <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Registered Email Address
            </Text>
            <Input
              placeholder="e.g. lntqr@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
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
              onPress={handleStartGuestFlow}
              disabled={loading}
              className="w-full flex-row items-center justify-center py-3 px-4 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30"
            >
              <Smartphone size={18} color="#059669" />
              <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400 ml-2">
                Continue as Guest User (Mobile OTP)
              </Text>
            </TouchableOpacity>

            <Text className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-5 leading-normal">
              Authorized personnel only. Contact your administrator if you need access.
            </Text>
          </View>
        )}

        {/* STEP 2: STAFF EMAIL OTP VERIFICATION */}
        {step === "otp" && (
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
                  setDevOtpHint(null);
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
              onChangeText={(text) => {
                setServerError(null);
                setOtp(text.replace(/[^0-9]/g, "").slice(0, 6));
              }}
              leftIcon={<KeyRound size={18} color="#94A3B8" />}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleVerifyOtp}
              error={serverError || undefined}
            />

            {devOtpHint && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setOtp(devOtpHint)}
                className="my-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <CheckCircle2 size={16} color="#2563EB" />
                  <Text className="text-xs font-medium text-blue-700 dark:text-blue-300 ml-2">
                    Local Test OTP: <Text className="font-bold">{devOtpHint}</Text>
                  </Text>
                </View>
                <Text className="text-xs font-bold text-blue-600 underline">Auto-fill</Text>
              </TouchableOpacity>
            )}

            <View className="mt-2">
              <Button
                title={loading ? "Verifying..." : "Verify & Sign In"}
                onPress={handleVerifyOtp}
                loading={loading}
                disabled={loading}
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

        {/* STEP 3: GUEST MOBILE PHONE ENTRY */}
        {step === "guest-phone" && (
          <View>
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mobile Number
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setStep("email");
                  setServerError(null);
                }}
                disabled={loading}
              >
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Back to Staff
                </Text>
              </TouchableOpacity>
            </View>

            <Input
              placeholder="9876543210"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, "").slice(0, 10))}
              leftIcon={<Phone size={18} color="#94A3B8" />}
              editable={!loading}
            />

            <View className="mt-2">
              <Button
                title={loading ? "Sending SMS..." : "Send Verification SMS"}
                onPress={handleRequestGuestOtp}
                loading={loading}
                disabled={phone.replace(/\D/g, "").length !== 10 || loading}
                size="lg"
              />
            </View>

            <Text className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-4 leading-normal">
              A 6-digit SMS verification code will be sent to your mobile phone to access the equipment QR scanner.
            </Text>
          </View>
        )}

        {/* STEP 4: GUEST SMS OTP VERIFICATION */}
        {step === "guest-otp" && (
          <View>
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                SMS Security Code
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setStep("guest-phone");
                  setServerError(null);
                  setDevOtpHint(null);
                }}
                disabled={loading}
              >
                <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Change number
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

            {devOtpHint && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setOtp(devOtpHint)}
                className="my-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <CheckCircle2 size={16} color="#059669" />
                  <Text className="text-xs font-medium text-emerald-700 dark:text-emerald-300 ml-2">
                    Local Test SMS OTP: <Text className="font-bold">{devOtpHint}</Text>
                  </Text>
                </View>
                <Text className="text-xs font-bold text-emerald-600 underline">Auto-fill</Text>
              </TouchableOpacity>
            )}

            <View className="mt-2">
              <Button
                title={loading ? "Verifying..." : "Verify & Access Scanner"}
                onPress={handleVerifyGuestOtp}
                loading={loading}
                disabled={otp.trim().length !== 6 || loading}
                size="lg"
              />
            </View>

            {/* Resend Cooldown Section */}
            <View className="flex-row items-center justify-between mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Text className="text-xs text-slate-400 dark:text-slate-500">
                Didn't receive the SMS?
              </Text>
              {cooldown > 0 ? (
                <Text className="text-xs font-semibold text-slate-400">
                  Resend in {cooldown}s
                </Text>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleResendGuestOtp}
                  disabled={resending}
                >
                  <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {resending ? "Sending..." : "Resend SMS Code"}
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
