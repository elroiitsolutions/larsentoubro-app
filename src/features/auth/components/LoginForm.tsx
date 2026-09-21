import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Building2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { loginSchema, LoginFormValues } from "../validation/loginSchema";
import { useAuthStore } from "../store/authStore";
import { authService } from "../services/authService";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UserWaitingModal } from "./UserWaitingModal";
import { UserProfile } from "@/types/common.types";

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const { login } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingReq, setPendingReq] = useState<{ requestId: string; email: string } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setLoading(true);

    try {
      const data = await authService.login(values);

      // Check if login requires admin approval / 2FA request
      const reqId = data.requestId || data.data?.requestId;
      if (reqId || data.message?.includes("Waiting for administrator")) {
        setPendingReq({ requestId: reqId || "", email: values.email });
        setLoading(false);
        return;
      }

      if (!data.success || !data.token || !data.user) {
        throw new Error(data.message || "Invalid email or password");
      }

      await login(data.token, data.user);
    } catch (err: any) {
      const resData = err?.response?.data;
      const reqId = resData?.requestId || resData?.data?.requestId;

      if (reqId || resData?.message?.includes("Waiting for administrator")) {
        setPendingReq({ requestId: reqId || "", email: values.email });
        setLoading(false);
        return;
      }

      const message =
        resData?.message ||
        err?.message ||
        "Unable to connect to the server. Please check your network.";
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  if (pendingReq) {
    return (
      <UserWaitingModal
        requestId={pendingReq.requestId}
        email={pendingReq.email}
        onApproved={async (token: string, user: UserProfile) => {
          await login(token, user);
          setPendingReq(null);
        }}
        onCancel={() => setPendingReq(null)}
      />
    );
  }

  return (
    <View className="w-full">
      {/* L&T Portal Header */}
      <View className="items-center mb-8">
        <View className="w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center mb-3.5 shadow-md shadow-indigo-500/30">
          <Building2 size={28} color="#FFFFFF" />
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
          Sign In
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Enter your authorized credentials to access your account.
        </Text>

        {serverError && (
          <View className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-3 mb-4">
            <Text className="text-xs font-semibold text-red-600 dark:text-red-400">
              {serverError}
            </Text>
          </View>
        )}

        {/* Email Field */}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email Address"
              placeholder="name@larsentoubro.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.email?.message}
              leftIcon={<Mail size={18} color="#94A3B8" />}
              editable={!loading}
            />
          )}
        />

        {/* Password Field */}
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              placeholder="••••••••"
              isPassword
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.password?.message}
              leftIcon={<Lock size={18} color="#94A3B8" />}
              editable={!loading}
            />
          )}
        />

        {/* Forgot password link */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(auth)/forgot-password" as any)}
          className="self-end -mt-2 mb-5"
          disabled={loading}
        >
          <Text className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Forgot password?
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <Button
          title="Sign In"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          size="lg"
        />

        <Text className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-5 leading-normal">
          Authorized personnel only. Contact your administrator if you need access.
        </Text>
      </Card>
    </View>
  );
};
