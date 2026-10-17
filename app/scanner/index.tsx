import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import {
  ArrowLeft,
  Menu,
  Zap,
  ZapOff,
  Camera,
  Search,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  QrCode,
  Shield,
  Layers,
  Calendar,
  Building2,
  Store,
  Tag,
  LogOut,
} from "lucide-react-native";
import { toolService } from "@/features/tools/services/toolService";
import { ToolRecord, ToolValidityData } from "@/features/tools/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useSidebarStore } from "@/store/sidebarStore";
import { useAuthStore } from "@/features/auth/store/authStore";

export default function QRScannerScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebarStore();
  const { user, logout } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedTool, setScannedTool] = useState<ToolRecord | null>(null);
  const [validityResult, setValidityResult] = useState<ToolValidityData | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const isGuest = user?.role === "Guest";
  const scanLock = useRef(false);

  const handleBack = useCallback(async () => {
    if (isGuest) {
      // Guest mode has no previous stack history; exit guest mode and return to login
      await logout();
      router.replace("/(auth)/login");
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }, [isGuest, logout, router]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => subscription.remove();
  }, [handleBack]);

  const resumeScanning = () => {
    setScannedTool(null);
    setValidityResult(null);
    setLookupError(null);
    setManualInput("");
    setLoading(false);
    // 300ms buffer prevents re-trigger loop if barcode is still in camera frame
    setTimeout(() => {
      scanLock.current = false;
      setScanned(false);
    }, 300);
  };

  const handleToolLookup = async (codeOrId: string) => {
    if (loading || scanLock.current) return;
    scanLock.current = true;
    setLoading(true);
    setLookupError(null);

    try {
      let cleanedId = (codeOrId || "").trim();

      // Check if scanned value contains query parameters (e.g., ?toolId=... or ?id=...)
      if (cleanedId.includes("?")) {
        try {
          const queryString = cleanedId.split("?")[1] || "";
          const searchParams = new URLSearchParams(queryString);
          const candidate =
            searchParams.get("toolId") ||
            searchParams.get("id") ||
            searchParams.get("toolCode") ||
            searchParams.get("code");
          if (candidate) {
            cleanedId = candidate;
          }
        } catch {
          // fallback
        }
      }

      // If scanned content is a full URL or path, extract the last non-empty segment
      if (cleanedId.includes("/")) {
        const parts = cleanedId.split("/").filter(Boolean);
        if (parts.length > 0) {
          cleanedId = parts[parts.length - 1];
        }
      }

      // Strip any query strings or hashes remaining in segment
      cleanedId = cleanedId.split("?")[0].split("#")[0].trim();

      // 1. If Guest user, call lookupToolValidity directly (only authorized endpoint)
      if (isGuest) {
        try {
          const res = await toolService.lookupToolValidity(cleanedId || codeOrId);
          if (res && res.success && res.data) {
            setValidityResult(res.data);
            setLookupError(null);
          } else {
            setLookupError(res?.message || `No equipment matching "${cleanedId || codeOrId}" was found.`);
          }
        } catch (err: any) {
          setLookupError(err?.response?.data?.message || `Invalid QR code or Tool Not Found.`);
        } finally {
          setLoading(false);
        }
        return;
      }

      // 2. Authenticated non-guest user flow
      let foundTool: ToolRecord | null = null;
      if (cleanedId) {
        try {
          foundTool = await toolService.getToolById(cleanedId);
        } catch (e) {
          // Fallback
        }
      }

      // If not found by cleanedId, also try matching the full QR code link directly
      if (!foundTool && codeOrId && codeOrId.trim() !== cleanedId) {
        try {
          foundTool = await toolService.getToolById(codeOrId.trim());
        } catch (e) {
          // Fallback
        }
      }

      // 3. Fallback: query validity endpoint
      if (!foundTool) {
        try {
          const vRes = await toolService.lookupToolValidity(cleanedId || codeOrId);
          if (vRes && vRes.success && vRes.data) {
            setValidityResult(vRes.data);
            return;
          }
        } catch (vErr) {
          // Continue to list search fallback
        }
      }

      // 4. Fallback search tools list by code/serial/name
      if (!foundTool && cleanedId) {
        try {
          const results = await toolService.getAllTools({ search: cleanedId });
          if (results && results.length > 0) {
            foundTool = results[0];
          }
        } catch (searchErr) {
          // Safely catch any search endpoint errors
        }
      }

      if (foundTool) {
        setScannedTool(foundTool);
      } else {
        Alert.alert(
          "Tool Not Found",
          `No equipment record matching "${cleanedId || codeOrId}" was found in the database.`,
          [{ text: "Scan Again", onPress: () => resumeScanning() }],
          { cancelable: true, onDismiss: () => resumeScanning() }
        );
      }
    } catch (err: any) {
      Alert.alert(
        "Lookup Error",
        err?.response?.data?.message || err?.message || "Failed to query tool database.",
        [{ text: "OK", onPress: () => resumeScanning() }],
        { cancelable: true, onDismiss: () => resumeScanning() }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || scanLock.current) return;
    setScanned(true);
    handleToolLookup(result.data);
  };

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center p-6">
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center p-6">
        <View className="w-16 h-16 rounded-3xl bg-indigo-950/80 items-center justify-center mb-4">
          <Camera size={32} color="#818CF8" />
        </View>
        <Text className="text-xl font-bold text-white text-center mb-2">
          Camera Permission Needed
        </Text>
        <Text className="text-sm text-slate-400 text-center mb-6 max-w-[280px]">
          We need access to your device camera to scan tool QR codes and barcodes for physical site auditing.
        </Text>
        <Button title="Grant Camera Access" onPress={requestPermission} />
        <TouchableOpacity onPress={handleBack} className="mt-4 p-2">
          <Text className="text-xs text-slate-500 font-semibold">
            {isGuest ? "Exit Guest Mode" : "Go Back"}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Camera Live View */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128", "code39", "ean13", "ean8", "upc_a"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Top Floating Controls */}
      <SafeAreaView edges={["top"]} className="absolute top-0 left-0 right-0 z-20">
        <View className="flex-row items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-md">
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleBack}
              className="w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/10"
              accessibilityLabel={isGuest ? "Exit guest mode and logout" : "Go back"}
            >
              <ArrowLeft size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openSidebar}
              className="w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/10"
              accessibilityLabel="Open sidebar drawer"
            >
              <Menu size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text className="text-base font-bold text-white tracking-wide">
            QR / Barcode Scanner
          </Text>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setTorch((t) => !t)}
              className={`w-10 h-10 rounded-full items-center justify-center border ${
                torch
                  ? "bg-amber-500/30 border-amber-400"
                  : "bg-black/60 border-white/10"
              }`}
            >
              {torch ? <Zap size={18} color="#FBBF24" /> : <ZapOff size={18} color="#FFFFFF" />}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowManualInput((s) => !s)}
              className="w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/10"
            >
              <Search size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Manual ID Input Overlay Bar */}
        {showManualInput && (
          <View className="mx-4 mt-2 p-2 bg-slate-900/90 rounded-2xl border border-white/15 flex-row items-center gap-2">
            <TextInput
              placeholder="Enter Tool ID or Serial No..."
              placeholderTextColor="#94A3B8"
              value={manualInput}
              onChangeText={setManualInput}
              autoCapitalize="characters"
              className="flex-1 text-white text-xs font-mono px-3 py-2"
            />
            <TouchableOpacity
              onPress={() => {
                if (manualInput.trim()) {
                  setScanned(true);
                  handleToolLookup(manualInput);
                }
              }}
              className="bg-indigo-600 px-3 py-2 rounded-xl"
            >
              <Text className="text-xs font-bold text-white">Find</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Target Scanning Overlay Frame */}
      {!scannedTool && !validityResult && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-64 h-64 border-2 border-indigo-500/80 rounded-3xl bg-black/15 items-center justify-center relative overflow-hidden">
            {/* Corner Markers */}
            <View className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
            <View className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
            <View className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
            <View className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />

            {loading ? (
              <View className="items-center bg-black/70 p-4 rounded-2xl">
                <ActivityIndicator size="small" color="#818CF8" />
                <Text className="text-xs font-semibold text-white mt-2">
                  Querying tool...
                </Text>
              </View>
            ) : (
              <View className="items-center opacity-75">
                <QrCode size={36} color="#FFFFFF" />
              </View>
            )}
          </View>

          <Text className="text-xs text-white/80 text-center font-medium mt-6 bg-black/60 px-4 py-2 rounded-full border border-white/10">
            Align QR Code or Barcode within frame
          </Text>
        </View>
      )}

      {/* Tool Validity Result Modal (Matching Web lntqr.com/qr-scanner UI) */}
      {(validityResult || lookupError) && (
        <View className="absolute inset-0 z-50 bg-black/75 items-center justify-center p-4">
          <View className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            {/* Top Header Bar with Logout Button for Guest */}
            {isGuest && (
              <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <View className="flex-row items-center gap-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <Text className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Guest Scanner
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBack}
                  className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 active:bg-rose-500/25"
                  accessibilityLabel="Logout from guest session"
                >
                  <LogOut size={13} color="#F87171" />
                  <Text className="text-xs font-bold text-rose-400">
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {lookupError ? (
              <View className="items-center py-2">
                <View className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 items-center justify-center mb-3">
                  <XCircle size={32} color="#F87171" />
                </View>
                <Text className="text-lg font-black text-rose-400 mb-1">
                  Tool Not Found
                </Text>
                <Text className="text-xs text-slate-300 font-medium text-center mb-5 px-2">
                  {lookupError}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={resumeScanning}
                  className="w-full bg-slate-800 active:bg-slate-700 py-3 rounded-xl items-center justify-center"
                >
                  <Text className="text-white font-bold text-xs">
                    Scan Another QR Code
                  </Text>
                </TouchableOpacity>
              </View>
            ) : validityResult ? (
              <View className="gap-3.5">
                {/* 1. Validity Status Indicator Banner */}
                {validityResult.validityStatus === "VALID" ? (
                  <View className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-3.5 flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-emerald-500/20 items-center justify-center">
                      <CheckCircle2 size={24} color="#34D399" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-black tracking-wide text-emerald-400 uppercase">
                          VALID
                        </Text>
                        <View className="px-2 py-0.5 rounded-md bg-emerald-500/20">
                          <Text className="text-[10px] font-bold text-emerald-300">
                            Tool Approved
                          </Text>
                        </View>
                      </View>
                      <Text className="text-[11px] text-emerald-200/90 font-medium mt-0.5">
                        Tool is within valid operational inspection period.
                      </Text>
                    </View>
                  </View>
                ) : validityResult.validityStatus === "EXPIRED" ? (
                  <View className="bg-rose-950/80 border border-rose-500/40 rounded-2xl p-3.5 flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-rose-500/20 items-center justify-center">
                      <XCircle size={24} color="#F87171" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-black tracking-wide text-rose-400 uppercase">
                          EXPIRED
                        </Text>
                        <View className="px-2 py-0.5 rounded-md bg-rose-500/20">
                          <Text className="text-[10px] font-bold text-rose-300">
                            Action Required
                          </Text>
                        </View>
                      </View>
                      <Text className="text-[11px] text-rose-200/90 font-medium mt-0.5">
                        Tool expiry date has passed. Re-inspection required.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View className="bg-amber-950/80 border border-amber-500/40 rounded-2xl p-3.5 flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-amber-500/20 items-center justify-center">
                      <AlertTriangle size={24} color="#FBBF24" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-black tracking-wide text-amber-400 uppercase">
                          NO EXPIRY DATE
                        </Text>
                        <View className="px-2 py-0.5 rounded-md bg-amber-500/20">
                          <Text className="text-[10px] font-bold text-amber-300">
                            Unspecified
                          </Text>
                        </View>
                      </View>
                      <Text className="text-[11px] text-amber-200/90 font-medium mt-0.5">
                        Expiry date is missing or not configured for this tool.
                      </Text>
                    </View>
                  </View>
                )}

                {/* 2. Header & Tool Description */}
                <View>
                  <Text className="text-base font-black text-slate-100 leading-snug">
                    {validityResult.description || "Equipment"}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1.5">
                    <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                      <Tag size={12} color="#34D399" />
                      <Text className="text-slate-200 font-mono text-[11px] font-bold">
                        {validityResult.toolId}
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-400 font-semibold">
                      Status: <Text className="text-slate-100 font-bold">{validityResult.status || "Available"}</Text>
                    </Text>
                  </View>
                </View>

                {/* 3. Detailed Fields Grid */}
                <View className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 gap-2.5">
                  <View className="flex-row items-center justify-between border-b border-slate-800/80 pb-2">
                    <View className="flex-row items-center gap-2">
                      <Building2 size={15} color="#34D399" />
                      <Text className="font-semibold text-[11px] text-slate-400">Project</Text>
                    </View>
                    <Text className="font-bold text-xs text-slate-100">
                      {validityResult.project || "N/A"}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between border-b border-slate-800/80 pb-2">
                    <View className="flex-row items-center gap-2">
                      <Store size={15} color="#34D399" />
                      <Text className="font-semibold text-[11px] text-slate-400">Store</Text>
                    </View>
                    <Text className="font-bold text-xs text-slate-100">
                      {validityResult.store || "N/A"}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Calendar size={15} color="#34D399" />
                      <Text className="font-semibold text-[11px] text-slate-400">Expiry Date</Text>
                    </View>
                    <Text
                      className={`font-bold font-mono text-xs ${
                        validityResult.validityStatus === "VALID"
                          ? "text-emerald-400"
                          : validityResult.validityStatus === "EXPIRED"
                          ? "text-rose-400"
                          : "text-amber-400"
                      }`}
                    >
                      {validityResult.expiryDate || "N/A"}
                    </Text>
                  </View>
                </View>

                {/* 4. Action Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={resumeScanning}
                  className="w-full bg-emerald-600 active:bg-emerald-500 py-3 rounded-xl items-center justify-center mt-1"
                >
                  <Text className="text-white font-bold text-xs">
                    Scan Another QR Code
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {/* Scanned Tool Result Bottom Sheet */}
      {scannedTool && !validityResult && (
        <SafeAreaView edges={["bottom"]} className="absolute bottom-0 left-0 right-0 z-30">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-5 border-t border-slate-200 dark:border-slate-800 shadow-2xl">
            {/* Success Pill */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={14} color="#10B981" />
                <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Tool Identified
                </Text>
              </View>

              <StatusBadge status={scannedTool.status || "Available"} size="sm" />
            </View>

            {/* Tool Information */}
            <View className="flex-row items-start gap-3 mb-4">
              <View className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 items-center justify-center">
                <Wrench size={24} color="#4F46E5" />
              </View>

              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                  {scannedTool.name || scannedTool.description || "Industrial Tool"}
                </Text>
                <Text className="text-xs font-mono text-slate-400 mt-0.5">
                  ID: {scannedTool.toolId || scannedTool.toolCode || scannedTool._id}
                </Text>
                {scannedTool.category && (
                  <Text className="text-[11px] text-slate-500 mt-0.5">
                    Category: {scannedTool.category}
                  </Text>
                )}
              </View>
            </View>

            {/* Specs Row */}
            <View className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl flex-row items-center justify-between mb-4 border border-slate-100 dark:border-slate-800">
              <View>
                <Text className="text-[10px] text-slate-400 uppercase font-semibold">Capacity</Text>
                <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {scannedTool.capacity || "N/A"}
                </Text>
              </View>

              <View>
                <Text className="text-[10px] text-slate-400 uppercase font-semibold">Safe Working Load</Text>
                <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {scannedTool.safeWorkingLoad || "N/A"}
                </Text>
              </View>

              <View>
                <Text className="text-[10px] text-slate-400 uppercase font-semibold">Make Year</Text>
                <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {scannedTool.makeYear || "N/A"}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  title="Scan Next"
                  variant="outline"
                  icon={<RefreshCw size={14} color="#4F46E5" />}
                  onPress={resumeScanning}
                />
              </View>

              <View className="flex-1">
                <Button
                  title="Full Details"
                  onPress={() => router.push(`/tools/${scannedTool._id}` as any)}
                  icon={<ChevronRight size={14} color="#FFFFFF" />}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}
