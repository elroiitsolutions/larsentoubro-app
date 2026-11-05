import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Screen } from "@/components/layout/Screen";
import { LoginForm } from "@/features/auth/components/LoginForm";

const videoSource = require("../../assets/videos/login-bg.mp4");

export default function LoginScreen() {
  const videoRef = useRef<Video>(null);

  return (
    <View style={styles.container}>
      {/* High-performance Hardware-Accelerated Background Video (no black overlay) */}
      <Video
        ref={videoRef}
        source={videoSource}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay
        useNativeControls={false}
      />

      {/* Login Screen Content */}
      <Screen
        scrollable={true}
        withKeyboardAvoid={true}
        style={styles.screen}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.cardContainer}>
          <LoginForm />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  screen: {
    backgroundColor: "transparent",
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 384,
    alignSelf: "center",
  },
});
