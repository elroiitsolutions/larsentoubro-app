import React from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, KeyRound } from "lucide-react-native";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <Screen contentContainerClassName="justify-center min-h-[85vh]">
      <Card className="w-full max-w-sm mx-auto p-6 items-center">
        <View className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 items-center justify-center mb-4">
          <KeyRound size={28} color="#4F46E5" />
        </View>

        <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
          Password Reset
        </Text>

        <Text className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-6">
          For security and audit compliance in the L&T Enterprise portal, password resets are handled directly by your system administrator.
        </Text>

        <Button
          title="Back to Login"
          variant="outline"
          onPress={() => router.back()}
          icon={<ArrowLeft size={16} color="#475569" />}
        />
      </Card>
    </Screen>
  );
}
