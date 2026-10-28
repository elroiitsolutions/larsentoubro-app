import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Truck,
  Building2,
  Package,
  CheckCircle2,
  AlertTriangle,
  User,
  Phone,
  Printer,
  ChevronDown,
  ChevronUp,
  Share2,
  Calendar,
  Check,
  Mail,
  MapPin,
  Hash,
  FileText,
} from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { challanService } from "@/features/challans/services/challanService";
import { storeService } from "@/features/stores/services/storeService";
import { toolService } from "@/features/tools/services/toolService";
import { profileService } from "@/features/profiles/services/profileService";
import { ProfileRecord } from "@/features/profiles/types";
import { ToolRecord } from "@/features/tools/types";
import { selectionStore } from "@/features/tools/utils/selectionStore";
import { downloadOrShareChallanPdf, generateAndShareChallanPdf } from "@/features/challans/utils/challanPdfGenerator";

export default function NewChallanScreen() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const { storeId, toolIds: rawToolIds, isScrap, transferFromDcId } = useLocalSearchParams<{
    storeId?: string;
    toolIds?: string;
    isScrap?: string;
    transferFromDcId?: string;
  }>();

  const isScrapDC = isScrap === "true" || isScrap === "1";
  const [challanType, setChallanType] = useState<"Delivery" | "Return">("Delivery");
  const [isCreatedSuccess, setIsCreatedSuccess] = useState(false);

  // Scroll View & Validation State
  const scrollViewRef = useRef<ScrollView>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ vendorName?: string; siteCode?: string }>({});

  // Store & Tool Data
  const [loadingStore, setLoadingStore] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [selectedTools, setSelectedTools] = useState<ToolRecord[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [markingPrinted, setMarkingPrinted] = useState(false);

  // Vendor / Contractor Selection
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileRecord | null>(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);

  // Form Fields
  const [vendorName, setVendorName] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [indentNo, setIndentNo] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [gatePassNo, setGatePassNo] = useState("");
  const [gatePassApprovedBy, setGatePassApprovedBy] = useState("");
  const [consignorTaxNo, setConsignorTaxNo] = useState("");
  const [workFrontLocation, setWorkFrontLocation] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverMobile, setReceiverMobile] = useState("");
  const [notes, setNotes] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  // Handle Profile Selection
  const handleSelectProfile = (profile: ProfileRecord) => {
    setSelectedProfile(profile);
    setSelectedProfileId(profile._id);
    setVendorName(profile.name || "");
    setVendorCode(profile.code || "");
    setContactPerson(profile.contactPerson || "");
    setContactPhone(profile.contactPhone || "");
    if (profile.address) setSiteLocation(profile.address);
    if (profile.gstNumber) setConsignorTaxNo(profile.gstNumber);
    setShowProfileSelector(false);
    setFieldErrors((prev) => ({ ...prev, vendorName: undefined }));
    setFormError(null);
  };

  // Load store & registered profiles
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingStore(true);
        const profileType = isScrapDC ? "ScrapDealer" : "Subcontractor";
        const [profileList, storeDoc] = await Promise.all([
          profileService.getProfiles(profileType).catch(() => []),
          storeId ? storeService.getStoreById(storeId).catch(() => null) : null,
        ]);

        const list = profileList || [];
        setProfiles(list);

        // Web parity: auto-select the first available recipient profile
        if (list.length > 0 && !selectedProfileId) {
          handleSelectProfile(list[0]);
        }

        if (storeDoc) {
          setStoreName(storeDoc.name || "");
          const proj = storeDoc.project as any;
          setProjectId(proj?._id || proj);

          if (storeDoc.location && !siteLocation) {
            setSiteLocation(storeDoc.location);
          }
        }
      } catch (err) {
        console.error("Error loading challan prep data:", err);
      } finally {
        setLoadingStore(false);
      }
    };

    loadInitialData();
  }, [storeId, isScrapDC]);

  // Load selected tools if pending in selectionStore or toolIds provided in params
  useEffect(() => {
    // 1. Check in-memory selectionStore first (handles any number of tools with 0 extra network requests)
    const pending = selectionStore.getPendingChallan(isScrapDC ? undefined : storeId);
    if (pending && pending.tools.length > 0) {
      setSelectedTools(pending.tools);
      return;
    }

    if (!rawToolIds) return;
    const ids = rawToolIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) return;

    const loadTools = async () => {
      setLoadingTools(true);
      try {
        const validTools = await toolService.getToolsByIds(ids);
        setSelectedTools(validTools);
      } catch (err) {
        console.error("Failed to load selected tools for challan:", err);
      } finally {
        setLoadingTools(false);
      }
    };



    loadTools();
  }, [rawToolIds, storeId]);

  // Challan Dates & Delivery Validity Presets (Web parity with VendorSelectionModal.tsx)
  const [challanDate, setChallanDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handleDeliveryPresetClick = (type: "1week" | "1month" | "3months" | "6months") => {
    const base = challanDate ? new Date(challanDate + "T00:00:00") : new Date();
    const d = new Date(base);
    if (type === "1week") d.setDate(d.getDate() + 7);
    else if (type === "1month") d.setMonth(d.getMonth() + 1);
    else if (type === "3months") d.setMonth(d.getMonth() + 3);
    else if (type === "6months") d.setMonth(d.getMonth() + 6);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setDeliveryDate(`${year}-${month}-${day}`);
    setSelectedPreset(type);
  };


  // Check unprinted tools
  const unprintedTools = selectedTools.filter((t) => !t.isPrinted);

  const handleMarkAllPrinted = async () => {
    const unprintedIds = unprintedTools.map((t) => t._id);
    if (unprintedIds.length === 0) return;

    setMarkingPrinted(true);
    try {
      await toolService.markToolsAsPrinted(unprintedIds);
      setSelectedTools((prev) =>
        prev.map((t) => (unprintedIds.includes(t._id) ? { ...t, isPrinted: true } : t))
      );
      toast.success(`${unprintedIds.length} tool(s) marked as Printed.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark tools as printed.");
    } finally {
      setMarkingPrinted(false);
    }
  };

  const handleProceedToPreview = async () => {
    setFormError(null);

    if (!selectedProfileId && !vendorName.trim()) {
      const errMsg = isScrapDC
        ? "Please select a destination scrap dealer first."
        : "Please select a destination subcontractor first.";
      setFormError(errMsg);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      toast.error(errMsg);
      return;
    }

    if (selectedTools.length === 0) {
      const errMsg = isScrapDC
        ? "Please select at least one scrap tool from the scrap register to generate a Scrap DC."
        : "Please select at least one tool item to include in this Delivery Challan.";
      setFormError(errMsg);
      toast.error(errMsg);
      return;
    }

    // Web Parity Validation: Tool status checks
    const repairTools = selectedTools.filter(
      (t) => (t.status || "").toLowerCase() === "repair"
    );
    if (repairTools.length > 0) {
      const msg = "Selected tool(s) are currently under Repair and cannot be issued in a Delivery Challan.";
      setFormError(msg);
      toast.error(msg);
      return;
    }

    const movingTools = selectedTools.filter(
      (t) => (t.status || "").toLowerCase() === "moving"
    );
    if (!transferFromDcId && movingTools.length > 0) {
      const toolLabels = movingTools.map((t) => t.toolId || t.toolCode || t.description || "item").join(", ");
      const msg = `Cannot create Delivery Challan: Tool(s) [${toolLabels}] are already dispatched (status: Moving). They must first be returned via a Return Challan (RC) or transferred.`;
      setFormError(msg);
      toast.error(msg);
      return;
    }

    const missingTools = selectedTools.filter(
      (t) => (t.status || "").toLowerCase() === "missing"
    );
    if (missingTools.length > 0) {
      const msg = "Selected tool(s) are marked as Missing and cannot be dispatched.";
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // Unprinted tools: use Alert for the interactive confirm dialog (native UX)
    if (unprintedTools.length > 0) {
      Alert.alert(
        "Unprinted Equipment Warning",
        `${unprintedTools.length} tool(s) are not marked as Printed. All tools must be printed with QR labels before issuing a Delivery Challan.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark Printed & Proceed",
            onPress: async () => {
              await handleMarkAllPrinted();
              navigateToPreview();
            },
          },
        ]
      );
      return;
    }

    navigateToPreview();
  };

  const navigateToPreview = () => {
    let finalVendorId = selectedProfileId;
    if (!finalVendorId) {
      const match = profiles.find(
        (p) => (p.name || "").trim().toLowerCase() === vendorName.trim().toLowerCase()
      );
      if (match) finalVendorId = match._id;
    }

    const mappedVendorObj = {
      _id: finalVendorId || selectedProfile?._id,
      name: vendorName.trim(),
      vendorCode: vendorCode.trim() || "-",
      code: vendorCode.trim() || "-",
      address: siteLocation.trim() || "-",
      gstNumber: consignorTaxNo.trim() || "-",
      contactPerson: contactPerson.trim() || "",
      contactPhone: contactPhone.trim() || "",
      profileType: isScrapDC ? "ScrapDealer" : "Subcontractor",
    };

    const finalSiteCode = siteCode?.trim() || "";

    selectionStore.setPendingPreview({
      selectedTools,
      vendor: mappedVendorObj,
      storeId: storeId || "",
      storeName: storeName || "",
      challanDate: challanDate || new Date().toISOString().split("T")[0],
      deliveryDate: deliveryDate || new Date().toISOString().split("T")[0],
      remarks: remarks.trim() || `Dispatched to ${isScrapDC ? "Scrap Dealer" : "Subcontractor"} ${vendorName.trim()}`,
      notes: notes.trim() || "",
      siteCode: finalSiteCode,
      indentNo: indentNo?.trim() || "",
      isScrapDC,
      isTransfer: Boolean(transferFromDcId),
      transferFromDcId: transferFromDcId || "",
    });



    router.push({
      pathname: "/challans/preview",
      params: {
        storeId: storeId || "",
        isScrap: isScrapDC ? "true" : "false",
        isTransfer: transferFromDcId ? "true" : "false",
        transferFromDcId: transferFromDcId || "",
      },
    });
  };


  return (
    <ScreenWrapper
      title={isScrapDC ? "Generate Scrap DC" : `Create ${challanType} Challan`}
      subtitle={
        storeName
          ? `Facility: ${storeName} • Movement Dispatch Note`
          : "Material Dispatch & Equipment Movement Note"
      }
      showBack
      requiredPage="/challans"
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Prominent Validation & API Error Banner */}
        {formError && (
          <View
            style={{
              backgroundColor: isDark ? "#450A0A" : "#FEF2F2",
              borderWidth: 1,
              borderColor: "#EF4444",
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={18} color="#EF4444" />
            <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "700", flex: 1 }}>
              {formError}
            </Text>
          </View>
        )}
        {/* Selected Tools Preview Card */}
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Package size={18} color={theme.primary} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: theme.text }}>
                Selected Equipment Items ({selectedTools.length})
              </Text>
            </View>
            <Badge variant="primary" label={`Total: ${selectedTools.length} NOS`} />
          </View>

          {loadingTools ? (
            <View style={{ paddingVertical: 14, alignItems: "center" }}>
              <ActivityIndicator color={theme.primary} />
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
                Loading selected equipment details...
              </Text>
            </View>
          ) : selectedTools.length === 0 ? (
            <View
              style={{
                padding: 14,
                backgroundColor: isDark ? "#1E293B" : "#FEF3C7",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isDark ? "#334155" : "#FDE68A",
              }}
            >
              <Text style={{ fontSize: 12, color: isDark ? "#F8FAFC" : "#92400E", fontWeight: "600" }}>
                Notice: No tools selected from store inventory. Please navigate to a store and select equipment units before generating a Delivery Challan.
              </Text>
            </View>
          ) : (
            <View>
              {unprintedTools.length > 0 && (
                <View
                  style={{
                    backgroundColor: isDark ? "#2A1E1E" : "#FFF1F2",
                    borderWidth: 1,
                    borderColor: isDark ? "#5C2626" : "#FECDD3",
                    padding: 10,
                    borderRadius: 10,
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#E11D48" }}>
                      {unprintedTools.length} Unprinted Tool(s)
                    </Text>
                    <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                      All items must be printed with QR labels prior to dispatch.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleMarkAllPrinted}
                    disabled={markingPrinted}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                      backgroundColor: "#E11D48",
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: "#FFFFFF" }}>
                      {markingPrinted ? "Marking..." : "Mark Printed"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ maxHeight: 200 }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {selectedTools.map((tool, idx) => (
                    <View
                      key={tool._id || idx}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                        borderWidth: 1,
                        borderColor: isDark ? "#334155" : "#E2E8F0",
                        marginBottom: 6,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }} numberOfLines={1}>
                          {tool.name || tool.description || "Equipment Unit"}
                        </Text>
                        <Text style={{ fontSize: 10, fontFamily: "monospace", color: theme.textSecondary }}>
                          ID: {tool.toolId || tool.toolCode || tool._id}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Badge
                          variant={tool.isPrinted ? "success" : "neutral"}
                          label={tool.isPrinted ? "Printed" : "Not Printed"}
                          size="sm"
                        />
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </Card>

        {/* Dispatch Dates & Expected Return / Validity Presets */}
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Calendar size={18} color={theme.primary} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: theme.text }}>
              Dispatch & Return Validity
            </Text>
          </View>

          {/* Coordinated Labels Row */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 6, alignItems: "flex-end" }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  color: isDark ? "#CBD5E1" : "#334155",
                  letterSpacing: 0.4,
                }}
                numberOfLines={1}
              >
                Challan Issue Date *
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  color: isDark ? "#CBD5E1" : "#334155",
                  letterSpacing: 0.4,
                }}
                numberOfLines={1}
              >
                Expected Return Date
              </Text>
            </View>
          </View>

          {/* Coordinated Inputs Row */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="YYYY-MM-DD"
                value={challanDate}
                onChangeText={setChallanDate}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="YYYY-MM-DD"
                value={deliveryDate}
                onChangeText={(txt) => {
                  setDeliveryDate(txt);
                  setSelectedPreset(null);
                }}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          </View>

          {/* Quick Validity Preset Pills */}
          <View style={{ marginTop: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: theme.textSecondary, marginBottom: 6 }}>
              Quick Validity Duration Presets:
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {[
                { label: "1 Week", key: "1week" },
                { label: "1 Month", key: "1month" },
                { label: "3 Months", key: "3months" },
                { label: "6 Months", key: "6months" },
              ].map((p) => {
                const isSelected = selectedPreset === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    activeOpacity={0.7}
                    onPress={() => handleDeliveryPresetClick(p.key as any)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: isSelected ? theme.primary : isDark ? "#1E293B" : "#F1F5F9",
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: isSelected ? "700" : "500",
                        color: isSelected ? "#FFFFFF" : theme.text,
                      }}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Vendor & Recipient Card */}
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Building2 size={18} color={theme.primary} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: theme.text }}>
              {isScrapDC ? "Certified Scrap Dealer" : "Consignee / Subcontractor"}
            </Text>
          </View>

          {/* Quick Profile Selection Dropdown List */}
          {showProfileSelector && (
            <View
              style={{
                maxHeight: 180,
                backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                borderRadius: 10,
                padding: 8,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {profiles.map((p) => {
                  const isSelected = selectedProfileId === p._id;
                  return (
                    <TouchableOpacity
                      key={p._id}
                      onPress={() => handleSelectProfile(p)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        borderRadius: 6,
                        backgroundColor: isSelected ? theme.primary : "transparent",
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: isSelected ? "#FFFFFF" : theme.text,
                        }}
                      >
                        {p.name} {p.code ? `(${p.code})` : ""}
                      </Text>
                      {p.contactPerson ? (
                        <Text
                          style={{
                            fontSize: 10,
                            color: isSelected ? "#E0E7FF" : theme.textSecondary,
                            marginTop: 1,
                          }}
                        >
                          Contact: {p.contactPerson} • {p.contactPhone || "-"}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Active Profile Info Card when a profile is selected (Web Parity) */}
          {selectedProfileId ? (
            <View
              style={{
                backgroundColor: isDark ? "#1E293B" : "#F0FDF4",
                borderWidth: 1,
                borderColor: isDark ? "#334155" : "#BBF7D0",
                padding: 14,
                borderRadius: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? "#334155" : "#DCFCE7",
                  paddingBottom: 10,
                  marginBottom: 10,
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: theme.text }}>
                      {vendorName}
                    </Text>
                    {vendorCode ? (
                      <View style={{ backgroundColor: isDark ? "#334155" : "#E0E7FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontFamily: "monospace", fontWeight: "700", color: "#4F46E5" }}>
                          {vendorCode}
                        </Text>
                      </View>
                    ) : null}
                    <View style={{ backgroundColor: isDark ? "#14532D" : "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#16A34A" }}>
                        Active
                      </Text>
                    </View>
                  </View>
                  {consignorTaxNo ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <Hash size={12} color={theme.primary} />
                      <Text style={{ fontSize: 11, fontFamily: "monospace", color: theme.textSecondary }}>
                        GST: <Text style={{ color: theme.text, fontWeight: "700" }}>{consignorTaxNo}</Text>
                      </Text>
                    </View>
                  ) : null}
                </View>

                {profiles.length > 1 && (
                  <TouchableOpacity
                    onPress={() => setShowProfileSelector(!showProfileSelector)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                      backgroundColor: isDark ? "#334155" : "#DCFCE7",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#16A34A" }}>
                      Change
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <User size={13} color={theme.primary} />
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    Contact: <Text style={{ color: theme.text, fontWeight: "700" }}>{contactPerson || "Not Specified"}</Text>
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Phone size={13} color={theme.primary} />
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    Phone: <Text style={{ color: theme.text, fontWeight: "700" }}>{contactPhone || "N/A"}</Text>
                  </Text>
                </View>
                {selectedProfile?.contactEmail ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Mail size={13} color={theme.primary} />
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Email: <Text style={{ color: theme.text, fontWeight: "700" }}>{selectedProfile.contactEmail}</Text>
                    </Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                  <MapPin size={13} color={theme.primary} style={{ marginTop: 2 }} />
                  <Text style={{ fontSize: 11, color: theme.textSecondary, flex: 1 }}>
                    Address: <Text style={{ color: theme.text, fontWeight: "700" }}>{siteLocation || "No address on file"}</Text>
                  </Text>
                </View>
              </View>
            </View>
          ) : !loadingStore ? (
            <TouchableOpacity
              onPress={() => setShowProfileSelector(!showProfileSelector)}
              style={{
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: theme.border,
                borderRadius: 10,
                padding: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                {profiles.length === 0
                  ? "No recipient profiles available."
                  : "Tap to select a recipient profile"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </Card>

        {/* Remarks & Instructions (Web Parity with VendorSelectionModal.tsx) */}
        <Card style={{ padding: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <FileText size={18} color={theme.primary} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: theme.text }}>
              Remarks & Instructions
            </Text>
          </View>

          <Input
            label="Indent No. (Optional)"
            placeholder="e.g. IND-001"
            value={indentNo}
            onChangeText={setIndentNo}
          />

          <Input
            label="Remarks / Dispatch Instructions"
            placeholder="e.g. Dispatch for site work or scrap disposal"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={2}
          />


          <Input
            label="Internal Notes (Optional)"
            placeholder="Additional internal reference notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </Card>

        {/* Error notification right above action buttons if present */}
        {formError && (
          <View
            style={{
              backgroundColor: isDark ? "#450A0A" : "#FEF2F2",
              borderWidth: 1,
              borderColor: "#EF4444",
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={16} color="#EF4444" />
            <Text style={{ color: "#EF4444", fontSize: 11, fontWeight: "700", flex: 1 }}>
              {formError}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => router.back()}
              disabled={saving || isCreatedSuccess}
            />
          </View>
          <View style={{ flex: 2 }}>
            <Button
              title={`Proceed to Preview (${selectedTools.length} Tools) →`}
              onPress={handleProceedToPreview}
              loading={saving}
              disabled={saving || isCreatedSuccess}
            />
          </View>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}
