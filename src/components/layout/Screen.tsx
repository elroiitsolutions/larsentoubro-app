import React from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ViewProps,
} from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  scrollable?: boolean;
  withKeyboardAvoid?: boolean;
  headerShown?: boolean;
  className?: string;
  contentContainerClassName?: string;
  contentContainerStyle?: any;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = true,
  withKeyboardAvoid = true,
  className = "",
  contentContainerClassName = "",
  contentContainerStyle,
  style,
  ...props
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const content = scrollable ? (
    <ScrollView
      className={`flex-1 ${className}`}
      style={{ flex: 1 }}
      contentContainerStyle={[
        { flexGrow: 1, padding: 16 },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
    >
      {children}
    </ScrollView>
  ) : (
    <View className={`flex-1 p-4 ${className}`} style={[{ flex: 1 }, style]} {...props}>
      {children}
    </View>
  );

  const body =
    withKeyboardAvoid && Platform.OS === "ios" ? (
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={10}
      >
        {content}
      </KeyboardAvoidingView>
    ) : (
      content
    );

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      style={[{ flex: 1 }, style]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#020617" : "#F8FAFC"}
      />
      {body}
    </SafeAreaView>
  );
};

