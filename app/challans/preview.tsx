import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Download,
  MapPin,
  Layers,
  ArrowRightLeft,
} from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { toast } from "@/components/ui/Toast";
import { challanService } from "@/features/challans/services/challanService";
import { downloadOrShareChallanPdf, formatDateDDMMYYYY, formatDCNumber } from "@/features/challans/utils/challanPdfGenerator";
import { selectionStore, ChallanPreviewState } from "@/features/tools/utils/selectionStore";
import { LNT_LOGO_BASE64 } from "@/assets/logoBase64";
import { ToolRecord } from "@/features/tools/types";

export default function DeliveryChallanPreviewScreen() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const params = useLocalSearchParams<{
    storeId?: string;
    isScrap?: string;
    isTransfer?: string;
    transferFromDcId?: string;
    transferFromDcNumber?: string;
  }>();

  // Synchronously initialize previewState from selectionStore to avoid empty initial render
  const [previewState, setPreviewState] = useState<ChallanPreviewState | null>(() => {
    return selectionStore.getPendingPreview();
  });

  const initialTools: ToolRecord[] = previewState?.selectedTools || [];
  const initialVendor = previewState?.vendor || { name: "", vendorCode: "" };
  const storeId = previewState?.storeId || params.storeId;
  const isScrapDC = Boolean(
    previewState?.isScrapDC ||
    params.isScrap === "true" ||
    initialVendor?.profileType === "ScrapDealer"
  );
  const isTransfer = Boolean(
    previewState?.isTransfer ||
    params.isTransfer === "true" ||
    params.transferFromDcId
  );
  const transferFromDcNumber = previewState?.transferFromDcNumber || params.transferFromDcNumber || "";

  // Static Document Headers
  const companyName = "LARSEN & TOUBRO LIMITED, CONSTRUCTION";
  const documentTitle = isScrapDC ? "SCRAP DELIVERY CHALLAN" : "DELIVERY CHALLAN";
  const docReferenceCode = "ECC-O&M/STR/906";
  const registeredOfficeAddress = "Registered Office : L & T House, Ballard Estate, Bombay - 400 038.";

  // Dates & Remarks (Only user-entered details)
  const [challanDate, setChallanDate] = useState(
    previewState?.challanDate || new Date().toISOString().split("T")[0]
  );
  const [remarks, setRemarks] = useState(previewState?.remarks || "");

  // Consignee / Subcontractor & Location Details (Only user-entered details, NO auto-generation)
  const vendorCode = initialVendor.vendorCode || initialVendor.code || "";
  const [subcontractorName, setSubcontractorName] = useState(initialVendor.name || "");
  const [consigneeAddress, setConsigneeAddress] = useState(initialVendor.address || "");
  const [siteCode, setSiteCode] = useState(
    previewState?.siteCode && previewState.siteCode !== "-" ? previewState.siteCode : ""
  );
  const [siteCodeError, setSiteCodeError] = useState("");
  const [indentNo, setIndentNo] = useState(
    previewState?.indentNo && previewState.indentNo !== "-" ? previewState.indentNo : ""
  );
  const [consigneeGstNo, setConsigneeGstNo] = useState(initialVendor.gstNumber || "");

  // Accounting & TRN Fields (Default to empty, placeholder is "-")
  const [trnCode, setTrnCode] = useState("");
  const [sendingCentreCode, setSendingCentreCode] = useState("");
  const [mrNo, setMrNo] = useState("");
  const [mrDate, setMrDate] = useState("");
  const [stockType, setStockType] = useState("");
  const [ewayBillNo, setEwayBillNo] = useState("");

  // Gate Pass & Transport Details (Default to empty, placeholder is "-")
  const [gatePassNo, setGatePassNo] = useState("");
  const [gatePassApprovedBy, setGatePassApprovedBy] = useState("");
  const [consignorTaxNo, setConsignorTaxNo] = useState(initialVendor.gstNumber || "");

  const [vehicleNo, setVehicleNo] = useState("");
  const [lrNo, setLrNo] = useState("");
  const [freightStatus, setFreightStatus] = useState("NOT APPLICABLE");

  // Receiver Details
  const [receiverName, setReceiverName] = useState("");
  const [receiverMobile, setReceiverMobile] = useState("");
  const [mrnNo, setMrnNo] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);

  // Items State (Only user-selected tools)
  const [items, setItems] = useState<any[]>(() => {
    return initialTools.map((t: any, idx: number) => ({
      tool: t._id,
      toolId: t.toolId || t.toolCode || t._id,
      materialCode: t.materialCode || t.toolCode || "",
      description: t.description || t.name || "Tool Item",
      toolCode: t.toolCode || "",
      quantity: Number(t.quantity || 1),
      unit: "NOS",
      rate: Number(t.rate || 0),
      remarks: "",
    }));
  });

  // Re-sync whenever previewState is updated (Strictly what user provided)
  useEffect(() => {
    const data = previewState || selectionStore.getPendingPreview();
    if (data) {
      if (data.challanDate) setChallanDate(data.challanDate);
      if (data.remarks) setRemarks(data.remarks);
      setSiteCode(data.siteCode && data.siteCode !== "-" ? data.siteCode : "");
      setIndentNo(data.indentNo && data.indentNo !== "-" ? data.indentNo : "");

      if (data.vendor) {
        setSubcontractorName(data.vendor.name || "");
        setConsigneeAddress(data.vendor.address || "");
        setConsigneeGstNo(data.vendor.gstNumber || "");
        setConsignorTaxNo(data.vendor.gstNumber || "");
      }

      if (data.selectedTools && data.selectedTools.length > 0) {
        setItems(
          data.selectedTools.map((t: any) => ({
            tool: t._id,
            toolId: t.toolId || t.toolCode || t._id,
            materialCode: t.materialCode || t.toolCode || "",
            description: t.description || t.name || "Tool Item",
            toolCode: t.toolCode || "",
            quantity: Number(t.quantity || 1),
            unit: "NOS",
            rate: Number(t.rate || 0),
            remarks: "",
          }))
        );
      }
    }
  }, [previewState]);

  const [creating, setCreating] = useState(false);
  const [isGrouped, setIsGrouped] = useState(false);

  // Group items with the same description
  const groupedItems = useMemo(() => {
    const groups: {
      [key: string]: {
        stableId: string;
        indices: number[];
        materialCode: string;
        description: string;
        qrs: string[];
        quantity: number;
        unit: string;
        rate: number;
      };
    } = {};
    const groupOrder: string[] = [];

    items.forEach((item, idx) => {
      const descKey = (item.description || "Tool Item").trim().toLowerCase();
      const qr = item.toolId || item.toolCode || item.tool || "";

      if (!groups[descKey]) {
        groups[descKey] = {
          stableId: String(item.tool || item.toolId || idx),
          indices: [idx],
          materialCode: item.materialCode || "",
          description: item.description || "Tool Item",
          qrs: qr ? [qr] : [],
          quantity: Number(item.quantity || 1),
          unit: item.unit || "NOS",
          rate: Number(item.rate || 0),
        };
        groupOrder.push(descKey);
      } else {
        groups[descKey].indices.push(idx);
        if (qr) {
          groups[descKey].qrs.push(qr);
        }
        groups[descKey].quantity += Number(item.quantity || 1);
      }
    });

    return groupOrder.map((key) => groups[key]);
  }, [items]);

  const totalQuantity = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.quantity) || 1), 0);
  }, [items]);

  const handleItemChange = (idx: number, field: string, val: any) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    setItems(next);
  };

  const handleGroupedItemChange = (group: (typeof groupedItems)[0], field: string, val: any) => {
    const next = [...items];
    group.indices.forEach((idx) => {
      next[idx] = { ...next[idx], [field]: val };
    });
    setItems(next);
  };

  const getChallanPayload = (forPdf: boolean = false) => {
    let challanItems = items;
    if (forPdf && isGrouped) {
      challanItems = groupedItems.map((g) => ({
        tool: items[g.indices[0]]?.tool,
        toolId: g.qrs.join(", "),
        materialCode: g.materialCode,
        description: g.description,
        toolCode: g.materialCode,
        quantity: g.quantity,
        unit: g.unit,
        rate: g.rate,
        remarks: "",
      }));
    }

    return {
      subcontractorName,
      siteCode: isScrapDC ? "" : (siteCode?.trim() || ""),
      isScrapDC,
      indentNo: indentNo?.trim() || "-",
      vendorCode: vendorCode || "-",
      vendorId: initialVendor._id,
      vendor: {
        ...initialVendor,
        name: subcontractorName,
        address: consigneeAddress,
        vendorCode: vendorCode || "-",
        gstNumber: consigneeGstNo || "-",
      },
      storeId,
      challanDate,
      trnCode: trnCode.trim() || "-",
      sendingCentreCode: sendingCentreCode.trim() || "-",
      mrNo: mrNo.trim() || "-",
      mrDate: mrDate.trim() || "-",
      stockType: stockType.trim() || "-",
      ewayBillNo: ewayBillNo.trim() || "-",
      gatePassNo: gatePassNo.trim() || "-",
      gatePassApprovedBy: gatePassApprovedBy.trim() || "-",
      consignorTaxNo: consignorTaxNo.trim() || "-",
      vehicleNo: vehicleNo.trim() || "-",
      lrNo: lrNo.trim() || "-",
      freightStatus: freightStatus || "NOT APPLICABLE",
      receiverName: receiverName.trim() || "",
      receiverMobile: receiverMobile.trim() || "",
      mrnNo: mrnNo.trim() || "-",
      receiptDate,
      docReferenceCode,
      remarks,
      notes: previewState?.notes || "",
      transferFromDcId: params.transferFromDcId || previewState?.transferFromDcId || null,
      transferFromDcNumber: transferFromDcNumber || "",
      items: challanItems,
    };
  };

  const handleDownloadDraft = async () => {
    try {
      const draftData: any = {
        challanNumber: isScrapDC ? "SDC-26-001" : "DC-26-001",
        ...getChallanPayload(true),
        indentNo: indentNo || "-",
      };
      await downloadOrShareChallanPdf(draftData, { share: true });
      toast.success("Downloaded Delivery Challan PDF Draft");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate draft PDF");
    }
  };

  const handleConfirmCreate = async () => {
    try {
      const cleanSiteCode = typeof siteCode === "string" ? siteCode.trim() : "";
      if (!isScrapDC && !cleanSiteCode) {
        setSiteCodeError("Site Code No. is required");
        toast.error("Site Code is mandatory! Please enter a valid Site Code No. before creating the Delivery Challan.");
        return;
      }

      if (!isTransfer && initialTools.some((t: any) => t.status === "Moving")) {
        toast.error("Cannot create Delivery Challan: One or more tools are already Moving");
        return;
      }
      if (initialTools.some((t: any) => t.status === "Missing")) {
        toast.error("Cannot create Delivery Challan: One or more tools are marked as Missing");
        return;
      }
      if (initialTools.some((t: any) => !t.isPrinted)) {
        toast.error("Cannot create Delivery Challan: One or more tools are not marked as Printed");
        return;
      }

      setCreating(true);
      const payload = getChallanPayload(false);
      let res: any;
      if (isScrapDC) {
        const scrapDealerId = initialVendor?._id || initialVendor?.id || payload.vendorId;
        res = await challanService.createScrapDeliveryChallan({
          ...payload,
          scrapDealerId,
        });
      } else {
        res = await challanService.createDeliveryChallan(payload);
      }

      if (res?.success && res?.data) {
        const successMsg = isTransfer
          ? `Transfer Delivery Challan ${formatDCNumber(res.data.challanNumber)} created! Source DC ${transferFromDcNumber} marked as Transfer.`
          : `Delivery Challan ${formatDCNumber(res.data.challanNumber)} created successfully!`;
        toast.success(`${successMsg} Automatically sharing PDF...`);

        try {
          const pdfPayload = getChallanPayload(true);
          await downloadOrShareChallanPdf(
            {
              ...pdfPayload,
              ...res.data,
              items: pdfPayload.items,
              indentNo: indentNo || res.data?.indentNo || "-",
            },
            { share: true }
          );
        } catch (pdfErr) {
          console.error("PDF generation error:", pdfErr);
        }

        selectionStore.clearPendingChallan();
        selectionStore.clearPendingPreview();

        setTimeout(() => {
          if (storeId) {
            router.replace(`/stores/${storeId}` as any);
          } else {
            router.replace("/challans" as any);
          }
        }, 1500);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Failed to create Delivery Challan");
    } finally {
      setCreating(false);
    }
  };

  if (!previewState || initialTools.length === 0) {
    return (
      <ScreenWrapper title="Delivery Challan Preview" showBack requiredPage="/challans">
        <View style={{ flex: 1, padding: 24, alignItems: "center", justifyContent: "center" }}>
          <AlertCircle size={48} color={theme.textMuted} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginBottom: 8, textAlign: "center" }}>
            No Tools Selected for Delivery Challan
          </Text>
          <Text style={{ fontSize: 14, color: theme.textMuted, marginBottom: 24, textAlign: "center" }}>
            Please go back to the inventory or store tools and select tools before previewing the Delivery Challan.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <ArrowLeft size={16} color={theme.text} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // Universal clean input style: perfectly vertically centered, zero clipped text
  const baseCanvasInputStyle = {
    height: 34,
    paddingVertical: Platform.OS === "android" ? 2 : 4,
    paddingHorizontal: 8,
    textAlignVertical: "center" as const,
    borderWidth: 1,
    borderColor: "#94A3B8",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#000000",
    backgroundColor: "#FFFFFF",
    includeFontPadding: false,
  };

  return (
    <ScreenWrapper
      title={isTransfer ? "Site Transfer Delivery Challan" : "Delivery Challan Preview"}
      subtitle="Official L&T Construction Challan Document Editor"
      showBack
      requiredPage="/challans"
    >
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Action Bar */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <View style={{ flex: 1, minWidth: 200 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <FileText size={20} color={theme.primary} />
              <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>
                {isTransfer ? "Site Transfer Delivery Challan Canvas" : "Official Delivery Challan Document Canvas"}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
              {isTransfer
                ? `Transfer tools to destination site. Original DC ${transferFromDcNumber} will be marked as Transfer.`
                : "Subcontractor details, Location chainage, Material codes, Returnable stamp, and Receiver details editor."}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8, width: "100%", justifyContent: "flex-end" }}>
            <TouchableOpacity
              onPress={handleDownloadDraft}
              disabled={creating}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                height: 40,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                paddingHorizontal: 12,
              }}
            >
              <Download size={16} color={theme.primary} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.primary }}>PDF Draft</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmCreate}
              disabled={creating}
              style={{
                flex: 1.5,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                height: 40,
                borderRadius: 10,
                backgroundColor: theme.primary,
                paddingHorizontal: 12,
              }}
            >
              {creating ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>Creating...</Text>
                </>
              ) : isTransfer ? (
                <>
                  <ArrowRightLeft size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>Confirm & Transfer</Text>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>Confirm & Issue</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Transfer Alert Banner if applicable */}
        {isTransfer && (
          <View
            style={{
              backgroundColor: isDark ? "#1E293B" : "#EFF6FF",
              borderWidth: 1,
              borderColor: "#3B82F6",
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <ArrowRightLeft size={20} color="#3B82F6" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1D4ED8" }}>Site Tool Transfer</Text>
              <Text style={{ fontSize: 11, color: isDark ? "#93C5FD" : "#1E40AF" }}>
                Transferring {initialTools.length} tool(s) from Source DC: {transferFromDcNumber}.
              </Text>
            </View>
          </View>
        )}

        {/* Location, Indent & Receiver Entry Details Card */}
        <View
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              paddingBottom: 8,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MapPin size={16} color={theme.primary} />
              <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text }}>
                Location & Receiver Entry Details
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: theme.textMuted }}>Manual Challan Slip Alignments</Text>
          </View>

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {!isScrapDC && (
                <View style={{ flex: 1.2 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: theme.textMuted, marginBottom: 4 }}>
                    Site Code No. <Text style={{ color: "#EF4444" }}>* (Required)</Text>
                  </Text>
                  <TextInput
                    value={siteCode}
                    onChangeText={(val) => {
                      setSiteCode(val);
                      if (siteCodeError) setSiteCodeError("");
                    }}
                    placeholder="e.g. sc-01, Site#101"
                    placeholderTextColor={theme.textMuted}
                    style={{
                      height: 38,
                      paddingVertical: 0,
                      paddingHorizontal: 10,
                      textAlignVertical: "center",
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: siteCodeError ? "#EF4444" : theme.border,
                      backgroundColor: siteCodeError ? (isDark ? "#450A0A" : "#FEF2F2") : theme.surface,
                      fontSize: 12,
                      fontWeight: "700",
                      color: theme.text,
                    }}
                  />
                  {siteCodeError ? (
                    <Text style={{ fontSize: 10, color: "#EF4444", fontWeight: "600", marginTop: 2 }}>
                      {siteCodeError}
                    </Text>
                  ) : null}
                </View>
              )}

              {/* INDENT NO. INPUT */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.textMuted, marginBottom: 4 }}>
                  Indent No.
                </Text>
                <TextInput
                  value={indentNo}
                  onChangeText={setIndentNo}
                  placeholder="e.g. IND-001"
                  placeholderTextColor={theme.textMuted}
                  style={{
                    height: 38,
                    paddingVertical: 0,
                    paddingHorizontal: 10,
                    textAlignVertical: "center",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    fontSize: 12,
                    fontWeight: "700",
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    color: theme.text,
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.textMuted, marginBottom: 4 }}>
                  Receiver Name
                </Text>
                <TextInput
                  value={receiverName}
                  onChangeText={setReceiverName}
                  placeholder="Full Name"
                  placeholderTextColor={theme.textMuted}
                  style={{
                    height: 38,
                    paddingVertical: 0,
                    paddingHorizontal: 10,
                    textAlignVertical: "center",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    fontSize: 12,
                    fontWeight: "600",
                    color: theme.text,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.textMuted, marginBottom: 4 }}>
                  Receiver Mobile No.
                </Text>
                <TextInput
                  value={receiverMobile}
                  onChangeText={setReceiverMobile}
                  placeholder="Mobile Number"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                  style={{
                    height: 38,
                    paddingVertical: 0,
                    paddingHorizontal: 10,
                    textAlignVertical: "center",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    fontSize: 12,
                    fontWeight: "600",
                    color: theme.text,
                  }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Authentic L&T Delivery Challan Canvas (Fits mobile screen with responsive layout) */}
        <View
          style={{
            width: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            borderWidth: 2,
            borderColor: "#0F172A",
            padding: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
            marginBottom: 20,
          }}
        >
          {/* L&T Top Header */}
          <View style={{ alignItems: "center", paddingBottom: 10 }}>
            <View style={{ alignSelf: "flex-start", marginBottom: 2 }}>
              <Image
                source={{ uri: LNT_LOGO_BASE64 }}
                style={{ width: 44, height: 44 }}
                resizeMode="contain"
              />
            </View>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "900",
                color: "#000000",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                textAlign: "center",
                fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
              }}
            >
              {companyName}
            </Text>
          </View>

          {/* Document Frame with 2px Black Border */}
          <View style={{ borderWidth: 2, borderColor: "#000000" }}>
            
            {/* Row 1A: Delivery Challan Header + DC No, INDENT NO, DATE */}
            <View style={{ borderBottomWidth: 2, borderBottomColor: "#000000" }}>
              <View
                style={{
                  paddingVertical: 6,
                  backgroundColor: "#F8FAFC",
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderBottomColor: "#000000",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "900", color: "#000000", textTransform: "uppercase" }}>
                  {documentTitle}
                </Text>
              </View>

              <View style={{ flexDirection: "row" }}>
                {/* DC NO */}
                <View style={{ flex: 1, padding: 6, borderRightWidth: 1.5, borderRightColor: "#000000" }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#000000" }}>DC NO.</Text>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#334155", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", marginTop: 4 }}>
                    {isScrapDC ? "SDC-26-001" : "DC-26-001"}
                  </Text>
                </View>

                {/* INDENT NO. */}
                <View style={{ flex: 1.2, padding: 6, borderRightWidth: 1.5, borderRightColor: "#000000" }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#000000" }}>INDENT NO.</Text>
                  <TextInput
                    value={indentNo}
                    onChangeText={setIndentNo}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{
                      ...baseCanvasInputStyle,
                      marginTop: 3,
                      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    }}
                  />
                </View>

                {/* DATE */}
                <View style={{ flex: 1.3, padding: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#000000" }}>DATE (DD-MM-YYYY)</Text>
                  <TextInput
                    value={challanDate}
                    onChangeText={setChallanDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    style={{
                      ...baseCanvasInputStyle,
                      marginTop: 3,
                    }}
                  />
                  <Text style={{ fontSize: 9, fontWeight: "700", color: "#64748B", marginTop: 2 }}>
                    {formatDateDDMMYYYY(challanDate)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 1B: Consignee / Subcontractor Box */}
            <View style={{ padding: 8, backgroundColor: "#F8FAFC", borderBottomWidth: 2, borderBottomColor: "#000000" }}>
              <Text style={{ fontSize: 9, fontWeight: "800", color: "#000000", marginBottom: 4 }}>
                CONSIGNEE / SUBCONTRACTOR
              </Text>
              <TextInput
                value={subcontractorName}
                onChangeText={setSubcontractorName}
                placeholder="Subcontractor Name"
                placeholderTextColor="#94A3B8"
                style={{
                  ...baseCanvasInputStyle,
                  marginBottom: 6,
                }}
              />
              <TextInput
                value={consigneeAddress}
                onChangeText={setConsigneeAddress}
                placeholder="Work Location Address"
                placeholderTextColor="#94A3B8"
                style={{
                  ...baseCanvasInputStyle,
                  fontWeight: "600",
                  marginBottom: 6,
                }}
              />
              {!isScrapDC && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "900", color: "#000000" }}>
                    SITE CODE NO. <Text style={{ color: "#DC2626" }}>*</Text>
                  </Text>
                  <TextInput
                    value={siteCode}
                    onChangeText={(val) => {
                      setSiteCode(val);
                      if (siteCodeError) setSiteCodeError("");
                    }}
                    placeholder="Required * (e.g. SC-01)"
                    placeholderTextColor={siteCodeError ? "#DC2626" : "#94A3B8"}
                    style={{
                      ...baseCanvasInputStyle,
                      flex: 1,
                      textAlign: "left",
                      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                      borderColor: siteCodeError ? "#DC2626" : "#94A3B8",
                      backgroundColor: siteCodeError ? "#FEF2F2" : "#FFFFFF",
                    }}
                  />
                </View>
              )}
            </View>

            {/* Row 2: TRN CD & Accounting Details */}
            <View style={{ backgroundColor: "#F8FAFC", borderBottomWidth: 2, borderBottomColor: "#000000" }}>
              {/* Row 2A */}
              <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#CBD5E1" }}>
                <View style={{ flex: 1, padding: 4, borderRightWidth: 1, borderRightColor: "#CBD5E1" }}>
                  <Text style={{ fontSize: 8, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>TRN CD</Text>
                  <TextInput
                    value={trnCode}
                    onChangeText={setTrnCode}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{ ...baseCanvasInputStyle, height: 30, fontSize: 10, textAlign: "center", paddingHorizontal: 2 }}
                  />
                </View>
                <View style={{ flex: 1.6, padding: 4, borderRightWidth: 1, borderRightColor: "#CBD5E1" }}>
                  <Text style={{ fontSize: 7.5, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>SENDING CENTRE</Text>
                  <TextInput
                    value={sendingCentreCode}
                    onChangeText={setSendingCentreCode}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{ ...baseCanvasInputStyle, height: 30, fontSize: 10, textAlign: "center", paddingHorizontal: 2 }}
                  />
                </View>
                <View style={{ flex: 1.2, padding: 4, borderRightWidth: 1, borderRightColor: "#CBD5E1" }}>
                  <Text style={{ fontSize: 8, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>M.R.N. NO.</Text>
                  <TextInput
                    value={mrNo}
                    onChangeText={setMrNo}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{ ...baseCanvasInputStyle, height: 30, fontSize: 10, textAlign: "center", paddingHorizontal: 2 }}
                  />
                </View>
                <View style={{ flex: 1.2, padding: 4 }}>
                  <Text style={{ fontSize: 8, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>M.R.N. DATE</Text>
                  <TextInput
                    value={mrDate}
                    onChangeText={setMrDate}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{ ...baseCanvasInputStyle, height: 30, fontSize: 10, textAlign: "center", paddingHorizontal: 2 }}
                  />
                </View>
              </View>

              {/* Row 2B */}
              <View style={{ flexDirection: "row" }}>
                <View style={{ flex: 1.2, padding: 4, borderRightWidth: 1, borderRightColor: "#CBD5E1" }}>
                  <Text style={{ fontSize: 8, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>STOCK TYPE</Text>
                  <TextInput
                    value={stockType}
                    onChangeText={setStockType}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{ ...baseCanvasInputStyle, height: 30, fontSize: 10, textAlign: "center", paddingHorizontal: 2 }}
                  />
                </View>
                <View style={{ flex: 1.3, padding: 4, borderRightWidth: 1, borderRightColor: "#CBD5E1" }}>
                  <Text style={{ fontSize: 8, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>VENDOR CODE</Text>
                  <TextInput
                    value={vendorCode}
                    editable={false}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{
                      ...baseCanvasInputStyle,
                      height: 30,
                      fontSize: 10,
                      textAlign: "center",
                      backgroundColor: "#F1F5F9",
                      color: "#475569",
                      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                      paddingHorizontal: 2,
                    }}
                  />
                </View>
                <View style={{ flex: 1.5, padding: 4 }}>
                  <Text style={{ fontSize: 8, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>E-WAY BILL NO.</Text>
                  <TextInput
                    value={ewayBillNo}
                    onChangeText={setEwayBillNo}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{ ...baseCanvasInputStyle, height: 30, fontSize: 10, textAlign: "center", paddingHorizontal: 2 }}
                  />
                </View>
              </View>
            </View>

            {/* Returnable Stamp Banner */}
            <View
              style={{
                backgroundColor: "#FEF2F2",
                borderBottomWidth: 1,
                borderBottomColor: "#FECACA",
                paddingVertical: 6,
                paddingHorizontal: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "900", color: "#B91C1C", textTransform: "uppercase", textAlign: "center" }}>
                NOT FOR SALE – MATERIAL ISSUED ON RETURNABLE BASIS
              </Text>
              <Text style={{ fontSize: 9, fontStyle: "italic", color: "#334155", marginTop: 2, textAlign: "center" }}>
                We have despatched the following goods. Kindly return the duplicate copy duly signed acknowledging receipt of goods.
              </Text>
            </View>

            {/* View Mode Toggle Bar */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#F1F5F9",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderBottomWidth: 2,
                borderBottomColor: "#000000",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Layers size={14} color="#1D4ED8" />
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#334155" }}>Tools Listing:</Text>
                <Text style={{ fontSize: 11, color: "#475569" }}>
                  {isGrouped
                    ? `Grouped (${groupedItems.length} groups, ${totalQuantity} qty)`
                    : `Individual (${items.length} listed)`}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    backgroundColor: "#EFF6FF",
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: "#BFDBFE",
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#1D4ED8" }}>
                    Swipe for Qty →
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setIsGrouped((prev) => !prev)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: isGrouped ? "#1D4ED8" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: isGrouped ? "#1D4ED8" : "#94A3B8",
                  }}
                >
                  <Layers size={12} color={isGrouped ? "#FFFFFF" : "#0F172A"} />
                  <Text style={{ fontSize: 10.5, fontWeight: "700", color: isGrouped ? "#FFFFFF" : "#0F172A" }}>
                    {isGrouped ? "Disable Grouping" : "Group by Description"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Row 3: Items Table (Fits SL, Code, Description&QR on phone screen, scroll for Qty/Rates) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={{ minWidth: 526 }}>
                {/* Table Header */}
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: "#F8FAFC",
                    borderBottomWidth: 2,
                    borderBottomColor: "#000000",
                  }}
                >
                  <View style={{ width: 36, padding: 6, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center" }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000" }}>SL.</Text>
                  </View>
                  <View style={{ width: 125, padding: 6, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center" }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000" }}>MATERIAL CODE</Text>
                  </View>
                  <View style={{ width: 185, padding: 6, borderRightWidth: 1.5, borderRightColor: "#000000" }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000" }}>DESCRIPTION & QR</Text>
                  </View>
                  <View style={{ width: 55, padding: 6, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center" }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000" }}>QTY</Text>
                  </View>
                  <View style={{ width: 50, padding: 6, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center" }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000" }}>UNIT</Text>
                  </View>
                  <View style={{ width: 75, padding: 6, alignItems: "center" }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000" }}>RATE RS.</Text>
                  </View>
                </View>

                {/* Table Items */}
                {isGrouped
                  ? groupedItems.map((group, idx) => (
                      <View
                        key={group.stableId}
                        style={{
                          flexDirection: "row",
                          backgroundColor: "#FFFFFF",
                          borderBottomWidth: 1,
                          borderBottomColor: "#000000",
                        }}
                      >
                        <View style={{ width: 36, padding: 6, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 10, fontWeight: "800", color: "#000000" }}>{idx + 1}</Text>
                        </View>
                        <View style={{ width: 125, padding: 4, borderRightWidth: 1.5, borderRightColor: "#000000", justifyContent: "center" }}>
                          <TextInput
                            value={group.materialCode}
                            onChangeText={(val) => handleGroupedItemChange(group, "materialCode", val)}
                            placeholder="-"
                            placeholderTextColor="#94A3B8"
                            style={{
                              ...baseCanvasInputStyle,
                              fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                              textAlign: "center",
                              fontSize: 10,
                              paddingHorizontal: 2,
                            }}
                          />
                        </View>
                        <View style={{ width: 185, padding: 4, borderRightWidth: 1.5, borderRightColor: "#000000", justifyContent: "center" }}>
                          <TextInput
                            value={group.description}
                            onChangeText={(val) => handleGroupedItemChange(group, "description", val)}
                            placeholder="Tool Description"
                            placeholderTextColor="#94A3B8"
                            style={{
                              ...baseCanvasInputStyle,
                              marginBottom: 4,
                            }}
                          />
                          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 3 }}>
                            <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#475569" }}>QR:</Text>
                            {group.qrs.map((qr, qIdx) => (
                              <View
                                key={qIdx}
                                style={{
                                  backgroundColor: "#EFF6FF",
                                  paddingHorizontal: 4,
                                  paddingVertical: 1.5,
                                  borderRadius: 3,
                                  borderWidth: 0.5,
                                  borderColor: "#BFDBFE",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 9,
                                    fontWeight: "800",
                                    color: "#1D4ED8",
                                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                                    includeFontPadding: false,
                                  }}
                                >
                                  {qr}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                        <View style={{ width: 55, padding: 4, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center", justifyContent: "center" }}>
                          <TextInput
                            value={String(group.quantity)}
                            editable={false}
                            style={{
                              ...baseCanvasInputStyle,
                              textAlign: "center",
                              backgroundColor: "#F1F5F9",
                              color: "#0F172A",
                              paddingHorizontal: 2,
                              fontSize: 10,
                            }}
                          />
                        </View>
                        <View style={{ width: 50, padding: 4, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center", justifyContent: "center" }}>
                          <TextInput
                            value={group.unit}
                            onChangeText={(val) => handleGroupedItemChange(group, "unit", val)}
                            style={{
                              ...baseCanvasInputStyle,
                              textAlign: "center",
                              paddingHorizontal: 2,
                              fontSize: 10,
                            }}
                          />
                        </View>
                        <View style={{ width: 75, padding: 4, alignItems: "center", justifyContent: "center" }}>
                          <TextInput
                            value={String(group.rate || 0)}
                            onChangeText={(val) => handleGroupedItemChange(group, "rate", Number(val) || 0)}
                            keyboardType="numeric"
                            style={{
                              ...baseCanvasInputStyle,
                              fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                              textAlign: "center",
                              paddingHorizontal: 2,
                              fontSize: 10,
                            }}
                          />
                        </View>
                      </View>
                    ))
                  : items.map((item, idx) => (
                      <View
                        key={item.tool || idx}
                        style={{
                          flexDirection: "row",
                          backgroundColor: "#FFFFFF",
                          borderBottomWidth: 1,
                          borderBottomColor: "#000000",
                        }}
                      >
                        <View style={{ width: 36, padding: 6, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 10, fontWeight: "800", color: "#000000" }}>{idx + 1}</Text>
                        </View>
                        <View style={{ width: 125, padding: 4, borderRightWidth: 1.5, borderRightColor: "#000000", justifyContent: "center" }}>
                          <TextInput
                            value={item.materialCode}
                            onChangeText={(val) => handleItemChange(idx, "materialCode", val)}
                            placeholder="-"
                            placeholderTextColor="#94A3B8"
                            style={{
                              ...baseCanvasInputStyle,
                              fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                              textAlign: "center",
                              fontSize: 10,
                              paddingHorizontal: 2,
                            }}
                          />
                        </View>
                        <View style={{ width: 185, padding: 4, borderRightWidth: 1.5, borderRightColor: "#000000", justifyContent: "center" }}>
                          <TextInput
                            value={item.description}
                            onChangeText={(val) => handleItemChange(idx, "description", val)}
                            placeholder="Tool Description"
                            placeholderTextColor="#94A3B8"
                            style={{
                              ...baseCanvasInputStyle,
                              marginBottom: 4,
                            }}
                          />
                          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 3 }}>
                            <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#475569" }}>QR:</Text>
                            <View
                              style={{
                                backgroundColor: "#EFF6FF",
                                paddingHorizontal: 4,
                                paddingVertical: 1.5,
                                borderRadius: 3,
                                borderWidth: 0.5,
                                borderColor: "#BFDBFE",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 9,
                                  fontWeight: "800",
                                  color: "#1D4ED8",
                                  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                                  includeFontPadding: false,
                                }}
                              >
                                {item.toolId || item.toolCode || item.tool || "-"}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={{ width: 55, padding: 4, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center", justifyContent: "center" }}>
                          <TextInput
                            value={String(item.quantity)}
                            onChangeText={(val) => handleItemChange(idx, "quantity", Number(val) || 1)}
                            keyboardType="numeric"
                            style={{
                              ...baseCanvasInputStyle,
                              textAlign: "center",
                              paddingHorizontal: 2,
                              fontSize: 10,
                            }}
                          />
                        </View>
                        <View style={{ width: 50, padding: 4, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center", justifyContent: "center" }}>
                          <TextInput
                            value={item.unit}
                            onChangeText={(val) => handleItemChange(idx, "unit", val)}
                            style={{
                              ...baseCanvasInputStyle,
                              textAlign: "center",
                              paddingHorizontal: 2,
                              fontSize: 10,
                            }}
                          />
                        </View>
                        <View style={{ width: 75, padding: 4, alignItems: "center", justifyContent: "center" }}>
                          <TextInput
                            value={String(item.rate || 0)}
                            onChangeText={(val) => handleItemChange(idx, "rate", Number(val) || 0)}
                            keyboardType="numeric"
                            style={{
                              ...baseCanvasInputStyle,
                              fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                              textAlign: "center",
                              paddingHorizontal: 2,
                              fontSize: 10,
                            }}
                          />
                        </View>
                      </View>
                    ))}
              </View>
            </ScrollView>

            {/* Row 4: Gate Pass Approval & Total Qty (Proper non-wrapping layout) */}
            <View
              style={{
                backgroundColor: "#F8FAFC",
                padding: 8,
                borderBottomWidth: 2,
                borderBottomColor: "#000000",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1.2 }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000", marginBottom: 3 }}>
                    GATE PASS NO:
                  </Text>
                  <TextInput
                    value={gatePassNo}
                    onChangeText={setGatePassNo}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{
                      ...baseCanvasInputStyle,
                      height: 32,
                    }}
                  />
                </View>

                <View style={{ flex: 1.5 }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000", marginBottom: 3 }}>
                    APPROVED BY:
                  </Text>
                  <TextInput
                    value={gatePassApprovedBy}
                    onChangeText={setGatePassApprovedBy}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{
                      ...baseCanvasInputStyle,
                      height: 32,
                    }}
                  />
                </View>

                <View style={{ minWidth: 60, alignItems: "flex-end", justifyContent: "center", paddingRight: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "900", color: "#64748B" }}>TOTAL</Text>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#1E3A8A" }}>{totalQuantity}</Text>
                </View>
              </View>
            </View>

            {/* Row 5: Tax Info */}
            <View
              style={{
                borderBottomWidth: 2,
                borderBottomColor: "#000000",
                backgroundColor: "#FFFFFF",
              }}
            >
              <View style={{ padding: 6, borderBottomWidth: 1, borderBottomColor: "#CBD5E1" }}>
                <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#000000" }}>
                  CONSIGNOR SALES / GST TAX NO. & DATE
                </Text>
                <TextInput
                  value={consignorTaxNo}
                  onChangeText={setConsignorTaxNo}
                  placeholder="-"
                  placeholderTextColor="#94A3B8"
                  style={{
                    ...baseCanvasInputStyle,
                    marginTop: 3,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                  }}
                />
              </View>
              <View style={{ padding: 6 }}>
                <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#000000" }}>
                  CONSIGNEE / SUBCONTRACTOR GST NO. & DATE
                </Text>
                <TextInput
                  value={consigneeGstNo}
                  onChangeText={(val) => {
                    setConsigneeGstNo(val);
                    if (consignorTaxNo === consigneeGstNo || !consignorTaxNo) {
                      setConsignorTaxNo(val);
                    }
                  }}
                  placeholder="-"
                  placeholderTextColor="#94A3B8"
                  style={{
                    ...baseCanvasInputStyle,
                    marginTop: 3,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                  }}
                />
              </View>
            </View>

            {/* Row 6: Vehicle, LR, Freight */}
            <View
              style={{
                borderBottomWidth: 2,
                borderBottomColor: "#000000",
                backgroundColor: "#F8FAFC",
              }}
            >
              <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#CBD5E1" }}>
                <View style={{ flex: 1, padding: 6, borderRightWidth: 1, borderRightColor: "#CBD5E1" }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#000000" }}>VEHICLE / DESPATCH THROUGH</Text>
                  <TextInput
                    value={vehicleNo}
                    onChangeText={setVehicleNo}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{
                      ...baseCanvasInputStyle,
                      marginTop: 3,
                    }}
                  />
                </View>
                <View style={{ flex: 1, padding: 6 }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#000000" }}>LR / RR NO. & DATE</Text>
                  <TextInput
                    value={lrNo}
                    onChangeText={setLrNo}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{
                      ...baseCanvasInputStyle,
                      marginTop: 3,
                    }}
                  />
                </View>
              </View>

              <View style={{ padding: 6 }}>
                <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#000000" }}>FREIGHT RS.</Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                  {["PAID", "TO PAY", "NOT APPLICABLE"].map((st) => (
                    <TouchableOpacity
                      key={st}
                      onPress={() => setFreightStatus(st)}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                        backgroundColor: freightStatus === st ? "#0F172A" : "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "#94A3B8",
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: "800", color: freightStatus === st ? "#FFFFFF" : "#0F172A" }}>
                        {st === "NOT APPLICABLE" ? "N/A" : st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Row 7: Receipt Details & Signature (Structured 2x2 grid) */}
            <View
              style={{
                borderBottomWidth: 2,
                borderBottomColor: "#000000",
                backgroundColor: "#FFFFFF",
              }}
            >
              <View style={{ padding: 8, borderBottomWidth: 1, borderBottomColor: "#CBD5E1" }}>
                <Text style={{ fontSize: 9, fontWeight: "900", color: "#000000" }}>RECEIPT DETAILS</Text>
                <Text style={{ fontSize: 8, fontStyle: "italic", color: "#475569", marginTop: 2, marginBottom: 8 }}>
                  We have despatched the following goods. Kindly return the duplicate copy duly signed acknowledging receipt of goods.
                </Text>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 8, fontWeight: "800", color: "#64748B", marginBottom: 2 }}>RECEIVER NAME</Text>
                      <TextInput
                        value={receiverName}
                        onChangeText={setReceiverName}
                        placeholder="Full Name"
                        placeholderTextColor="#94A3B8"
                        style={{ ...baseCanvasInputStyle, height: 32, fontSize: 10 }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 8, fontWeight: "800", color: "#64748B", marginBottom: 2 }}>MOBILE NO.</Text>
                      <TextInput
                        value={receiverMobile}
                        onChangeText={setReceiverMobile}
                        placeholder="Phone"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        style={{ ...baseCanvasInputStyle, height: 32, fontSize: 10 }}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 8, fontWeight: "800", color: "#64748B", marginBottom: 2 }}>MRN NO.</Text>
                      <TextInput
                        value={mrnNo}
                        onChangeText={setMrnNo}
                        placeholder="-"
                        placeholderTextColor="#94A3B8"
                        style={{ ...baseCanvasInputStyle, height: 32, fontSize: 10 }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 8, fontWeight: "800", color: "#64748B", marginBottom: 2 }}>RECEIPT DATE</Text>
                      <TextInput
                        value={receiptDate}
                        onChangeText={setReceiptDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94A3B8"
                        style={{ ...baseCanvasInputStyle, height: 32, fontSize: 10 }}
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={{ padding: 8, alignItems: "flex-end", backgroundColor: "#F8FAFC" }}>
                <Text style={{ fontSize: 9.5, fontWeight: "900", color: "#000000", textAlign: "right" }}>
                  FOR LARSEN & TOUBRO LIMITED CONSTRUCTION DIVISION
                </Text>
                <Text style={{ fontSize: 9, fontWeight: "800", color: "#334155", marginTop: 4 }}>
                  AUTHORIZED SIGNATORY
                </Text>
              </View>
            </View>

            {/* Row 8: Remarks */}
            <View style={{ padding: 8, backgroundColor: "#F8FAFC" }}>
              <Text style={{ fontSize: 9, fontWeight: "900", color: "#000000", marginBottom: 4 }}>REMARKS</Text>
              <TextInput
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Add remarks or dispatch instructions..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
                style={{
                  minHeight: 44,
                  borderWidth: 1,
                  borderColor: "#94A3B8",
                  borderRadius: 4,
                  padding: 6,
                  fontSize: 11,
                  fontWeight: "600",
                  color: "#000000",
                  backgroundColor: "#FFFFFF",
                }}
              />
            </View>

          </View>

          {/* Footer Copy Distribution Line with Checkboxes */}
          <View style={{ marginTop: 10, gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
              <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#475569" }}>{docReferenceCode}</Text>
              <Text style={{ fontSize: 8.5, fontWeight: "700", color: "#475569" }}>{registeredOfficeAddress}</Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopColor: "#CBD5E1",
              }}
            >
              <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000" }}>COPY DISTRIBUTION:</Text>
              {[
                "CONSIGNEE",
                "CONSIGNEE – CONSIGNOR",
                "GATE PASS (SECURITY - ACCOUNTS)",
                "CONSIGNOR'S FILE",
              ].map((copyName) => (
                <View key={copyName} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderWidth: 1.5,
                      borderColor: "#000000",
                      borderRadius: 2,
                    }}
                  />
                  <Text style={{ fontSize: 8, fontWeight: "800", color: "#000000" }}>{copyName}</Text>
                </View>
              ))}
            </View>
          </View>

        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
