import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import {
  ArrowLeft,
  Menu,
  Zap,
  ZapOff,
  Camera,
  Search,
  XCircle,
  QrCode,
  Store,
  LogOut,
} from "lucide-react-native";
import { toolService } from "@/features/tools/services/toolService";
import { ToolRecord } from "@/features/tools/types";
import { Button } from "@/components/ui/Button";
import { useSidebarStore } from "@/store/sidebarStore";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ToolPreviewModal } from "@/features/tools/components/ToolPreviewModal";

export default function QRScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ storeId?: string; storeName?: string }>();
  const targetStoreId = params.storeId;
  const targetStoreName = params.storeName;

  const { openSidebar } = useSidebarStore();
  const { user, logout } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedTool, setScannedTool] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const isGuest = user?.role === "Guest";
  const scanLock = useRef(false);

  const handleBack = useCallback(async () => {
    if (isGuest) {
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
    setLookupError(null);
    setManualInput("");
    setLoading(false);
    setTimeout(() => {
      scanLock.current = false;
      setScanned(false);
    }, 400);
  };

  const handleToolLookup = async (codeOrId: string) => {
    if (loading || scanLock.current) return;
    scanLock.current = true;
    setLoading(true);
    setLookupError(null);

    try {
      let cleanedId = (codeOrId || "").trim();

      // 1. Clean if scanned code is a full URL
      if (cleanedId.includes("http://") || cleanedId.includes("https://")) {
        try {
          const urlObj = new URL(cleanedId);
          const pathSegments = urlObj.pathname.split("/").filter(Boolean);
          const vtIndex = pathSegments.indexOf("vt");
          if (vtIndex !== -1 && pathSegments[vtIndex + 1]) {
            cleanedId = decodeURIComponent(pathSegments[vtIndex + 1]);
          } else if (pathSegments.length > 0) {
            cleanedId = decodeURIComponent(pathSegments[pathSegments.length - 1]);
          }
        } catch {
          if (cleanedId.includes("/vt/")) {
            cleanedId = cleanedId.split("/vt/").pop()?.split("?")[0]?.split("#")[0] || cleanedId;
          } else if (cleanedId.includes("/")) {
            const parts = cleanedId.split("/").filter(Boolean);
            cleanedId = parts[parts.length - 1]?.split("?")[0]?.split("#")[0] || cleanedId;
          }
        }
      }

      // 2. Clean query params
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

      // 3. Clean remaining path segments
      if (cleanedId.includes("/")) {
        const parts = cleanedId.split("/").filter(Boolean);
        if (parts.length > 0) {
          cleanedId = parts[parts.length - 1];
        }
      }

      cleanedId = cleanedId.split("?")[0].split("#")[0].trim();

      // Guest flow: lookupToolValidity endpoint
      if (isGuest) {
        try {
          const res = await toolService.lookupToolValidity(cleanedId || codeOrId, {
            storeId: targetStoreId,
          });
          if (res && res.success && res.data) {
            setScannedTool(res.data);
            setLookupError(null);
          } else {
            setLookupError(
              res?.message || `Tool ID "${cleanedId || codeOrId}" not found.`
            );
          }
        } catch (err: any) {
          setLookupError(
            err?.response?.data?.message || `Tool ID "${cleanedId || codeOrId}" not found.`
          );
        } finally {
          setLoading(false);
        }
        return;
      }

      // Authenticated flow
      let foundTool: ToolRecord | null = null;

      // 1. Try finding tool scoped to targetStoreId if present
      if (cleanedId) {
        try {
          foundTool = await toolService.getToolById(cleanedId, targetStoreId);
        } catch (e) {
          // fallback
        }
      }

      // 2. Try raw code
      if (!foundTool && codeOrId && codeOrId.trim() !== cleanedId) {
        try {
          foundTool = await toolService.getToolById(codeOrId.trim(), targetStoreId);
        } catch (e) {
          // fallback
        }
      }

      // 3. Fallback search tool list
      if (!foundTool && cleanedId) {
        try {
          const results = await toolService.getAllTools({
            search: cleanedId,
            storeId: targetStoreId,
          });
          if (results && results.length > 0) {
            foundTool = results[0];
          }
        } catch (searchErr) {
          // fallback
        }
      }

      // 4. If scoped to targetStoreId and not found in this store, check if it exists in another store
      if (!foundTool && targetStoreId && cleanedId) {
        try {
          const globalTool = await toolService.getToolById(cleanedId);
          if (globalTool) {
            const toolStoreName =
              globalTool.currentSite?.name ||
              globalTool.currentSite?.siteName ||
              globalTool.store?.name ||
              globalTool.storeName ||
              "another store";
            setLookupError(
              `Tool "${cleanedId}" was found in ${toolStoreName}, but does not belong to ${targetStoreName || "this store"}.`
            );
            return;
          }
        } catch (e) {
          // continue
        }
      }

      // 5. Fallback: query validity endpoint
      if (!foundTool) {
        try {
          const vRes = await toolService.lookupToolValidity(cleanedId || codeOrId, {
            storeId: targetStoreId,
          });
          if (vRes && vRes.success && vRes.data) {
            setScannedTool(vRes.data);
            return;
          }
        } catch (vErr) {
          // continue
        }
      }

      if (foundTool) {
        setScannedTool(foundTool);
      } else {
        const storeSuffix = targetStoreName ? ` in ${targetStoreName}` : "";
        setLookupError(`Tool ID "${cleanedId || codeOrId}" was not found${storeSuffix}.`);
      }
    } catch (err: any) {
      setLookupError(
        err?.response?.data?.message || err?.message || "Failed to query tool database."
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
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center p-6">
        <View className="w-16 h-16 rounded-3xl bg-blue-950/80 items-center justify-center mb-4">
          <Camera size={32} color="#60A5FA" />
        </View>
        <Text className="text-xl font-bold text-white text-center mb-2">
          Camera Permission Needed
        </Text>
        <Text className="text-sm text-slate-400 text-center mb-6 max-w-[280px]">
          We need access to your device camera to scan tool QR codes and barcodes for store equipment auditing.
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
          barcodeTypes: [
            "qr",
            "code128",
            "code39",
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Top Header Controls Bar */}
      <SafeAreaView edges={["top"]} className="z-20">
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

            {!isGuest && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={openSidebar}
                className="w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/10"
                accessibilityLabel="Open sidebar drawer"
              >
                <Menu size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
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

        {/* Store Scope Banner if scanning within a specific store */}
        {targetStoreName && (
          <View className="self-center mt-2 flex-row items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-600/90 border border-blue-400/50 shadow-md">
            <Store size={13} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">
              Store: {targetStoreName}
            </Text>
          </View>
        )}

        {/* Manual ID Input Overlay Bar */}
        {showManualInput && (
          <View className="mx-4 mt-2 p-2 bg-slate-900/95 rounded-2xl border border-white/15 flex-row items-center gap-2 shadow-xl">
            <TextInput
              placeholder="Enter Tool ID or Code..."
              placeholderTextColor="#94A3B8"
              value={manualInput}
              onChangeText={setManualInput}
              autoCapitalize="characters"
              className="flex-1 text-white text-xs font-mono px-3 py-2"
            />
            <TouchableOpacity
              onPress={() => {
                if (manualInput.trim()) {
                  handleToolLookup(manualInput.trim());
                }
              }}
              className="bg-blue-600 active:bg-blue-700 px-4 py-2 rounded-xl"
            >
              <Text className="text-white text-xs font-bold">Search</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Target Scanning Overlay Frame */}
      {!scannedTool && !lookupError && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-64 h-64 border-2 border-blue-500/80 rounded-3xl bg-black/15 items-center justify-center relative overflow-hidden">
            {/* Corner Markers */}
            <View className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-xl" />
            <View className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-xl" />
            <View className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-xl" />
            <View className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-xl" />

            {loading ? (
              <View className="items-center bg-black/70 p-4 rounded-2xl">
                <ActivityIndicator size="small" color="#60A5FA" />
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

          <Text className="text-xs text-white/90 text-center font-medium mt-6 bg-black/60 px-4 py-2 rounded-full border border-white/10">
            Align QR Code or Barcode within frame
          </Text>
        </View>
      )}

      {/* Tool Not Found Error Modal */}
      {lookupError && (
        <View className="absolute inset-0 z-50 bg-black/75 items-center justify-center p-4">
          <View className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl items-center text-center">
            {/* Top Logout Button for Guest */}
            {isGuest && (
              <View className="w-full flex-row items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <View className="flex-row items-center gap-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Guest Scanner
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBack}
                  className="flex-row items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800"
                >
                  <LogOut size={12} color="#EF4444" />
                  <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 items-center justify-center mb-4">
              <XCircle size={36} color="#EF4444" />
            </View>

            <Text className="text-lg font-black text-slate-900 dark:text-white mb-2 text-center">
              Tool ID Not Found
            </Text>

            <Text className="text-xs text-slate-600 dark:text-slate-300 font-medium text-center mb-6 leading-relaxed">
              {lookupError}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={resumeScanning}
              className="w-full bg-blue-600 active:bg-blue-700 py-3.5 rounded-xl items-center justify-center shadow-sm"
            >
              <Text className="text-white font-bold text-sm">
                Scan Again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tool Preview Popup Modal (Matching exact web modal UI) */}
      <ToolPreviewModal
        visible={!!scannedTool}
        tool={scannedTool}
        toolId={scannedTool?.toolId || scannedTool?.toolCode}
        onClose={resumeScanning}
        onViewFullDetails={() => {
          if (scannedTool?._id) {
            router.push(`/tools/${scannedTool._id}` as any);
          }
        }}
      />
    </View>
  );
}
