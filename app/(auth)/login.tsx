import React from "react";
import { View } from "react-native";
import { Screen } from "@/components/layout/Screen";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginScreen() {
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", width: "100%", maxWidth: 384, alignSelf: "center", paddingVertical: 20 }}>
        <LoginForm />
      </View>
    </Screen>
  );
}
