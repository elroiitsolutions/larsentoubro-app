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

          // Intelligent siteCode pre-filling
          if (!siteCode) {
            if (storeDoc.storeCode) {
              setSiteCode(storeDoc.storeCode);
            } else if (proj?.projectCode) {
              setSiteCode(proj.projectCode);
            } else if (storeDoc.name) {
              setSiteCode(`${storeDoc.name.replace(/\s+/g, "-").toUpperCase()}-01`);
            }
          }
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
    const pending = selectionStore.getPendingChallan(storeId);
    if (pending && pending.tools.length > 0) {
      setSelectedTools(pending.tools);
      const first = pending.tools[0] as any;
      if (!siteCode && first) {
        if (first.currentSite?.storeCode) {
          setSiteCode(first.currentSite.storeCode);
        } else if (first.jobCode) {
          setSiteCode(first.jobCode);
        } else if (first.project?.projectCode) {
          setSiteCode(first.project.projectCode);
        }
      }
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

        // Pre-fill siteCode from tool if store did not have it
        if (!siteCode && validTools.length > 0) {
          const first = validTools[0] as any;
          if (first.currentSite?.storeCode) {
            setSiteCode(first.currentSite.storeCode);
          } else if (first.jobCode) {
            setSiteCode(first.jobCode);
          } else if (first.project?.projectCode) {
            setSiteCode(first.project.projectCode);
          }
        }
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

  // Quick Add Subcontractor Profile State
  const [showQuickAddProfile, setShowQuickAddProfile] = useState(false);
  const [newProfile, setNewProfile] = useState({
    name: "",
    code: "",
    contactPerson: "",
    contactPhone: "",
    address: "",
    gstNumber: "",
  });
  const [creatingProfile, setCreatingProfile] = useState(false);

  const handleQuickAddProfile = async () => {
    if (!newProfile.name.trim()) {
      toast.error("Subcontractor / Firm Name is required.");
      return;
    }
    try {
      setCreatingProfile(true);
      const res = await profileService.createProfile({
        ...newProfile,
        profileType: isScrapDC ? "ScrapDealer" : "Subcontractor",
      });
      if (res?.data) {
        const created = res.data;
        setProfiles((prev) => [created, ...prev]);
        handleSelectProfile(created);
        setShowQuickAddProfile(false);
        setNewProfile({
          name: "",
          code: "",
          contactPerson: "",
          contactPhone: "",
          address: "",
          gstNumber: "",
        });
        toast.success(`${isScrapDC ? "Scrap Dealer" : "Subcontractor"} "${created.name}" registered and selected.`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Could not register profile.");
    } finally {
      setCreatingProfile(false);
    }
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

  const handleSubmit = async () => {
    // Prevent duplicate submissions after success
    if (isCreatedSuccess || saving) return;

    setFormError(null);
    const newFieldErrors: { vendorName?: string; siteCode?: string } = {};

    if (!vendorName.trim()) {
      newFieldErrors.vendorName = "Vendor or Contractor name is required.";
    }

    if (!isScrapDC && !siteCode.trim()) {
      newFieldErrors.siteCode = "Site Code is required by L&T standard challan specifications.";
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      const errMsg = newFieldErrors.vendorName || newFieldErrors.siteCode || "Please fill in all mandatory fields.";
      setFormError(errMsg);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      toast.error(errMsg);
      return;
    }

    if (selectedTools.length === 0) {
      const errMsg = "Please select at least one tool item to include in this Delivery Challan.";
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
              executeCreateChallan();
            },
          },
        ]
      );
      return;
    }

    executeCreateChallan();
  };

  const executeCreateChallan = async () => {
    if (isCreatedSuccess) return; // Idempotency guard
    setSaving(true);
    setFormError(null);
    try {
      // 1. Ensure a valid profile vendorId exists in database (required by backend)
      let finalVendorId = selectedProfileId;
      if (!finalVendorId) {
        // Try to match existing profile by name
        const match = profiles.find(
          (p) => (p.name || "").trim().toLowerCase() === vendorName.trim().toLowerCase()
        );
        if (match) {
          finalVendorId = match._id;
          setSelectedProfileId(finalVendorId);
        } else {
          // Auto-register subcontractor / recipient profile to satisfy backend validation
          try {
            const createRes = await profileService.createProfile({
              name: vendorName.trim(),
              code: vendorCode.trim() || undefined,
              contactPerson: contactPerson.trim() || undefined,
              contactPhone: contactPhone.trim() || undefined,
              address: siteLocation.trim() || undefined,
              gstNumber: consignorTaxNo.trim() || undefined,
              profileType: isScrapDC ? "ScrapDealer" : "Subcontractor",
            });
            if (createRes?.data?._id) {
              const newProf = createRes.data as ProfileRecord;
              finalVendorId = newProf._id;
              setProfiles((prev) => [newProf, ...prev]);
              setSelectedProfileId(finalVendorId);
            }
          } catch (createErr) {
            console.error("Auto profile creation failed:", createErr);
          }
        }
      }

      if (!finalVendorId) {
        const errMsg = "A valid subcontractor profile is required. Please select a profile from the saved list or use Quick Add.";
        setFormError(errMsg);
        toast.error(errMsg);
        setSaving(false);
        return;
      }

      const itemsPayload = selectedTools.map((t, idx) => ({
        tool: t._id,
        toolId: t.toolId || t.toolCode || `ITEM-${idx + 1}`,
        description: t.description || t.name || "Equipment Item",
        toolCode: t.toolCode || "",
        category: t.category || t.toolType || "",
        capacity: t.capacity || "",
        safeWorkingLoad: t.safeWorkingLoad || "",
        serialNumber: t.serialNumber !== undefined ? String(t.serialNumber) : "",
        makeYear: t.makeYear ? String(t.makeYear) : "",
        quantity: 1,
        unit: "NOS",
        remarks: "",
      }));

      const payload = {
        challanType: isScrapDC ? "Scrap" : challanType,
        isScrapDC,
        storeId: storeId || undefined,
        project: projectId || undefined,
        vendorId: finalVendorId,
        scrapDealerId: isScrapDC ? finalVendorId : undefined,
        indentNo: indentNo.trim() || undefined,
        siteCode: siteCode.trim(),
        vehicleNo: vehicleNo.trim().toUpperCase() || undefined,
        gatePassNo: gatePassNo.trim() || undefined,
        gatePassApprovedBy: gatePassApprovedBy.trim() || undefined,
        consignorTaxNo: consignorTaxNo.trim() || undefined,
        locationChainage: siteLocation.trim() || undefined,
        workFrontLocation: workFrontLocation.trim() || undefined,
        receiverName: receiverName.trim() || undefined,
        receiverMobile: receiverMobile.trim() || undefined,
        subcontractorName: vendorName.trim(),
        vendorCode: vendorCode.trim() || undefined,
        vendor: {
          _id: finalVendorId,
          name: vendorName.trim(),
          vendorCode: vendorCode.trim() || undefined,
          contactPerson: contactPerson.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          address: siteLocation.trim() || undefined,
          gstNumber: consignorTaxNo.trim() || undefined,
        },
        transferFromDcId: transferFromDcId || undefined,
        challanDate: challanDate || new Date().toISOString().split("T")[0],
        deliveryDate: deliveryDate || new Date().toISOString().split("T")[0],
        notes: notes.trim() || undefined,
        remarks: remarks.trim() || undefined,
        items: itemsPayload,
      };

      let result: any;
      if (isScrapDC) {
        result = await challanService.createScrapDeliveryChallan(payload);
      } else if (challanType === "Delivery") {
        result = await challanService.createDeliveryChallan(payload);
      } else {
        result = await challanService.createReturnChallan(payload);
      }

      const createdChallan = result?.data;
      // Mark as done — prevents duplicate submissions on any re-render
      setIsCreatedSuccess(true);

      const dcLabel = isScrapDC ? "Scrap Delivery Challan" : "Delivery Challan (DC)";
      const challanNum = createdChallan?.challanNumber || "Created";

      // 📥 Automatically download official PDF (Web) / trigger share (Mobile)
      if (createdChallan) {
        try {
          await downloadOrShareChallanPdf(createdChallan, { share: true });
        } catch (pdfErr) {
          console.warn("Auto-download DC PDF error:", pdfErr);
        }
      }

      // ✅ Toast success — fires after download starts and persists through navigation
      toast.success(`${dcLabel} ${challanNum} generated & PDF downloaded automatically.`);

      // Brief breather so browser initiates file download before screen unmounts
      setTimeout(() => {
        router.back();
      }, 350);

    } catch (err: any) {
      // Extract the most meaningful error message from Axios or native Error
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to generate challan. Please try again.";
      setFormError(errMsg);
      // Show inline banner AND persistent error toast
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
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

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Challan Issue Date *"
                placeholder="YYYY-MM-DD"
                value={challanDate}
                onChangeText={setChallanDate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Expected Delivery / Return Date"
                placeholder="YYYY-MM-DD"
                value={deliveryDate}
                onChangeText={(txt) => {
                  setDeliveryDate(txt);
                  setSelectedPreset(null);
                }}
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Building2 size={18} color={theme.primary} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: theme.text }}>
                {isScrapDC ? "Certified Scrap Dealer" : "Consignee / Subcontractor"}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TouchableOpacity
                onPress={() => setShowQuickAddProfile(!showQuickAddProfile)}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  backgroundColor: showQuickAddProfile ? theme.primary : isDark ? "#1E293B" : "#F1F5F9",
                  borderWidth: 1,
                  borderColor: showQuickAddProfile ? theme.primary : theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: showQuickAddProfile ? "#FFFFFF" : theme.primary,
                  }}
                >
                  {showQuickAddProfile ? "Cancel" : "+ Quick Add"}
                </Text>
              </TouchableOpacity>

              {profiles.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowProfileSelector(!showProfileSelector)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: isDark ? "#1E293B" : "#EEF2FF",
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: theme.primary }}>
                    {showProfileSelector ? "Close" : "Pick Saved"}
                  </Text>
                  {showProfileSelector ? <ChevronUp size={12} color={theme.primary} /> : <ChevronDown size={12} color={theme.primary} />}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Add Subcontractor Profile Form */}
          {showQuickAddProfile && (
            <View
              style={{
                padding: 12,
                borderRadius: 10,
                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text, marginBottom: 8 }}>
                Register New {isScrapDC ? "Scrap Dealer" : "Subcontractor Profile"}
              </Text>
              <Input
                label="Firm / Subcontractor Name *"
                placeholder="e.g. Skyline Structural Engineering"
                value={newProfile.name}
                onChangeText={(txt) => setNewProfile((p) => ({ ...p, name: txt }))}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Code"
                    placeholder="e.g. SUB-401"
                    value={newProfile.code}
                    onChangeText={(txt) => setNewProfile((p) => ({ ...p, code: txt }))}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Contact Phone"
                    placeholder="+91 98..."
                    value={newProfile.contactPhone}
                    onChangeText={(txt) => setNewProfile((p) => ({ ...p, contactPhone: txt }))}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
              <Input
                label="Contact Person"
                placeholder="e.g. Vikram Sharma"
                value={newProfile.contactPerson}
                onChangeText={(txt) => setNewProfile((p) => ({ ...p, contactPerson: txt }))}
              />
              <Input
                label="Address / Depot"
                placeholder="e.g. Site Camp 3, Sector 12"
                value={newProfile.address}
                onChangeText={(txt) => setNewProfile((p) => ({ ...p, address: txt }))}
              />
              <Input
                label="GST Number"
                placeholder="e.g. 27AAACL1234F1Z5"
                value={newProfile.gstNumber}
                onChangeText={(txt) => setNewProfile((p) => ({ ...p, gstNumber: txt }))}
                autoCapitalize="characters"
              />
              <Button
                title={creatingProfile ? "Registering..." : "Save & Use Profile"}
                loading={creatingProfile}
                onPress={handleQuickAddProfile}
              />
            </View>
          )}

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

          {/* Active Profile Info Banner when a profile is selected */}
          {selectedProfileId && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: isDark ? "#1E293B" : "#F0FDF4",
                borderWidth: 1,
                borderColor: isDark ? "#334155" : "#BBF7D0",
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <CheckCircle2 size={13} color="#16A34A" />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#16A34A" }}>
                    Selected {isScrapDC ? "Scrap Dealer" : "Subcontractor"}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text, marginTop: 2 }}>
                  {vendorName} {vendorCode ? `(${vendorCode})` : ""}
                </Text>
              </View>
              {profiles.length > 1 && (
                <TouchableOpacity
                  onPress={() => setShowProfileSelector(!showProfileSelector)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
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
          )}

          {/* Quick Profile Selection Chips */}
          {!selectedProfileId && profiles.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: theme.textSecondary, marginBottom: 6 }}>
                Pick from Registered Profiles:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row" }}>
                {profiles.map((p) => (
                  <TouchableOpacity
                    key={p._id}
                    onPress={() => handleSelectProfile(p)}
                    style={{
                      backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      marginRight: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "600", color: theme.text }}>
                      {p.name} {p.code ? `(${p.code})` : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Input
            label={isScrapDC ? "Scrap Dealer Name *" : "Vendor / Contractor / Transporter *"}
            placeholder="e.g. Apex Civil Infra Pvt Ltd"
            value={vendorName}
            onChangeText={(txt) => {
              setVendorName(txt);
              if (fieldErrors.vendorName) {
                setFieldErrors((prev) => ({ ...prev, vendorName: undefined }));
              }
              if (formError) setFormError(null);
            }}
            error={fieldErrors.vendorName}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Vendor Code"
                placeholder="e.g. VND-4092"
                value={vendorCode}
                onChangeText={setVendorCode}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Site Code *"
                placeholder="e.g. SC-102"
                value={siteCode}
                onChangeText={(txt) => {
                  setSiteCode(txt);
                  if (fieldErrors.siteCode) {
                    setFieldErrors((prev) => ({ ...prev, siteCode: undefined }));
                  }
                  if (formError) setFormError(null);
                }}
                error={fieldErrors.siteCode}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Contact Person"
                placeholder="e.g. Suresh Patel"
                value={contactPerson}
                onChangeText={setContactPerson}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Contact Phone"
                placeholder="e.g. +91 94000 12345"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <Input
            label="Site Location / Project Destination"
            placeholder="e.g. Metro Site Pier 44, Chainage 12+400"
            value={siteLocation}
            onChangeText={setSiteLocation}
          />
        </Card>

        {/* L&T Logistics & Transport Specifications */}
        <Card style={{ padding: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Truck size={18} color={theme.primary} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: theme.text }}>
              Logistics & Dispatch Verification
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Indent Number"
                placeholder="e.g. IND-2026-001"
                value={indentNo}
                onChangeText={setIndentNo}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Vehicle Registration No"
                placeholder="e.g. MH-04-AB-1234"
                value={vehicleNo}
                onChangeText={setVehicleNo}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Gate Pass Number"
                placeholder="e.g. GP-9941"
                value={gatePassNo}
                onChangeText={setGatePassNo}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Gate Pass Approved By"
                placeholder="e.g. K. V. Sharma"
                value={gatePassApprovedBy}
                onChangeText={setGatePassApprovedBy}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Consignor Tax / GST No"
                placeholder="e.g. 27AAACL1234F1Z5"
                value={consignorTaxNo}
                onChangeText={setConsignorTaxNo}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Work Front Location"
                placeholder="e.g. Pier 12 West"
                value={workFrontLocation}
                onChangeText={setWorkFrontLocation}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Receiver Name"
                placeholder="e.g. Rajesh Kumar"
                value={receiverName}
                onChangeText={setReceiverName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Receiver Mobile"
                placeholder="e.g. 9876543210"
                value={receiverMobile}
                onChangeText={setReceiverMobile}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <Input
            label="Dispatch Remarks / Instructions"
            placeholder="Handling precautions, packaging details, driver instructions..."
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
          <View style={{ flex: 1.5 }}>
            <Button
              title={isCreatedSuccess ? "Generated ✓" : saving ? "Generating..." : "Generate Challan"}
              onPress={handleSubmit}
              loading={saving}
              disabled={saving || isCreatedSuccess}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
