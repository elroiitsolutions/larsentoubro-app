import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
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
  ChevronRight,
  RefreshCw,
  QrCode,
  Shield,
  Layers,
} from "lucide-react-native";
import { toolService } from "@/features/tools/services/toolService";
import { ToolRecord } from "@/features/tools/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useSidebarStore } from "@/store/sidebarStore";

export default function QRScannerScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebarStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedTool, setScannedTool] = useState<ToolRecord | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const scanLock = useRef(false);

  const handleToolLookup = async (codeOrId: string) => {
    if (loading || scanLock.current) return;
    scanLock.current = true;
    setLoading(true);

    try {
      // 1. If scanned content is a full URL, extract the last path segment (ID)
      let cleanedId = codeOrId.trim();
      if (cleanedId.includes("/")) {
        const parts = cleanedId.split("/").filter(Boolean);
        cleanedId = parts[parts.length - 1];
      }

      // 2. First try fetching directly by ID
      let foundTool: ToolRecord | null = null;
      try {
        foundTool = await toolService.getToolById(cleanedId);
      } catch (e) {
        // Fallback to searching tools
      }

      // 3. If not found, search tools list by code/serial
      if (!foundTool) {
        const results = await toolService.getAllTools({ search: cleanedId });
        if (results && results.length > 0) {
          foundTool = results[0];
        }
      }

      if (foundTool) {
        setScannedTool(foundTool);
      } else {
        Alert.alert(
          "Tool Not Found",
          `No equipment record matching "${codeOrId}" was found in the database.`,
          [{ text: "Scan Again", onPress: () => resumeScanning() }]
        );
      }
    } catch (err: any) {
      Alert.alert(
        "Lookup Error",
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

  const resumeScanning = () => {
    setScanned(false);
    setScannedTool(null);
    setManualInput("");
    scanLock.current = false;
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
        <TouchableOpacity onPress={() => router.back()} className="mt-4 p-2">
          <Text className="text-xs text-slate-500 font-semibold">Go Back</Text>
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
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/10"
              accessibilityLabel="Go back"
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
      {!scannedTool && (
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

      {/* Scanned Tool Result Bottom Sheet */}
      {scannedTool && (
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
                  ID: {scannedTool.toolCode || scannedTool.toolId || scannedTool._id}
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
