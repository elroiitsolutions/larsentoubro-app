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
  Layers,
  ArrowRightLeft,
  MapPin,
} from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { toast } from "@/components/ui/Toast";
import { challanService } from "@/features/challans/services/challanService";
import { downloadOrShareChallanPdf, formatDateDDMMYYYY } from "@/features/challans/utils/challanPdfGenerator";
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

  // Dates & Remarks
  const [challanDate, setChallanDate] = useState(
    previewState?.challanDate || new Date().toISOString().split("T")[0]
  );
  const [remarks, setRemarks] = useState(previewState?.remarks || "");

  // Consignee / Subcontractor
  const vendorCode = initialVendor.vendorCode || initialVendor.code || "-";
  const [subcontractorName, setSubcontractorName] = useState(
    initialVendor.name || previewState?.subcontractorName || ""
  );
  const [consigneeAddress, setConsigneeAddress] = useState(
    initialVendor.address || previewState?.consigneeAddress || ""
  );
  const [siteCode, setSiteCode] = useState(
    previewState?.siteCode && previewState.siteCode !== "-" ? previewState.siteCode : ""
  );
  const [siteCodeError, setSiteCodeError] = useState("");
  const [indentNo, setIndentNo] = useState(
    previewState?.indentNo && previewState.indentNo !== "-" ? previewState.indentNo : ""
  );
  const [consigneeGstNo, setConsigneeGstNo] = useState(
    initialVendor.gstNumber || previewState?.consigneeGstNo || ""
  );

  // Accounting & TRN Fields (Matching web details)
  const [trnCode, setTrnCode] = useState(previewState?.trnCode || "-");
  const [sendingCentreCode, setSendingCentreCode] = useState(previewState?.sendingCentreCode || "-");
  const [mrNo, setMrNo] = useState(previewState?.mrNo || "-");
  const [mrDate, setMrDate] = useState(previewState?.mrDate || "-");
  const [stockType, setStockType] = useState(previewState?.stockType || "-");
  const [ewayBillNo, setEwayBillNo] = useState(previewState?.ewayBillNo || "-");

  // Gate Pass & Transport Details (Matching web details)
  const [gatePassNo, setGatePassNo] = useState(previewState?.gatePassNo || "-");
  const [gatePassApprovedBy, setGatePassApprovedBy] = useState(previewState?.gatePassApprovedBy || "-");
  const [consignorTaxNo, setConsignorTaxNo] = useState(
    previewState?.consignorTaxNo || initialVendor.gstNumber || ""
  );
  const [vehicleNo, setVehicleNo] = useState(previewState?.vehicleNo || "-");
  const [lrNo, setLrNo] = useState(previewState?.lrNo || "-");
  const [freightStatus, setFreightStatus] = useState(previewState?.freightStatus || "NOT APPLICABLE");

  // Receiver Details (Matching web details)
  const [receiverName, setReceiverName] = useState(previewState?.receiverName || "");
  const [receiverMobile, setReceiverMobile] = useState(previewState?.receiverMobile || "");
  const [mrnNo, setMrnNo] = useState(previewState?.mrnNo || "-");
  const [receiptDate, setReceiptDate] = useState(
    previewState?.receiptDate || new Date().toISOString().split("T")[0]
  );

  // Items State - exact mapping as web: toolId is QR serial code, materialCode is Material code
  const [items, setItems] = useState<any[]>(() => {
    return initialTools.map((t: any) => {
      const qrCodeVal = t.toolId || t.serialNumber || t._id || "";
      const matCodeVal = t.materialCode || t.toolCode || "";
      return {
        tool: t._id || t.id,
        toolId: qrCodeVal,
        materialCode: matCodeVal,
        description: t.description || t.name || "Tool Item",
        toolCode: t.toolCode || matCodeVal,
        quantity: Number(t.quantity || 1),
        unit: t.unit || "NOS",
        rate: Number(t.rate || 0),
        remarks: t.remarks || "",
      };
    });
  });

  // Re-sync if previewState updates later
  useEffect(() => {
    if (previewState) {
      if (previewState.siteCode && previewState.siteCode !== "-") {
        setSiteCode(previewState.siteCode);
      }
      if (previewState.indentNo && previewState.indentNo !== "-") {
        setIndentNo(previewState.indentNo);
      }
      if (previewState.challanDate) {
        setChallanDate(previewState.challanDate);
      }
      if (previewState.remarks) {
        setRemarks(previewState.remarks);
      }
      if (previewState.receiverName) {
        setReceiverName(previewState.receiverName);
      }
      if (previewState.receiverMobile) {
        setReceiverMobile(previewState.receiverMobile);
      }
      if (previewState.selectedTools && previewState.selectedTools.length > 0) {
        setItems(
          previewState.selectedTools.map((t: any) => {
            const qrCodeVal = t.toolId || t.serialNumber || t._id || "";
            const matCodeVal = t.materialCode || t.toolCode || "";
            return {
              tool: t._id || t.id,
              toolId: qrCodeVal,
              materialCode: matCodeVal,
              description: t.description || t.name || "Tool Item",
              toolCode: t.toolCode || matCodeVal,
              quantity: Number(t.quantity || 1),
              unit: t.unit || "NOS",
              rate: Number(t.rate || 0),
              remarks: t.remarks || "",
            };
          })
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
      vendorId: initialVendor._id || initialVendor.id,
      vendor: {
        ...initialVendor,
        name: subcontractorName,
        vendorCode: vendorCode,
        address: consigneeAddress,
        gstNumber: consigneeGstNo,
        contactPerson: initialVendor.contactPerson || "",
        contactPhone: initialVendor.contactPhone || "",
      },
      storeId,
      challanDate,
      deliveryDate: challanDate,
      trnCode,
      sendingCentreCode,
      mrNo,
      mrDate,
      stockType,
      ewayBillNo,
      gatePassNo,
      gatePassApprovedBy,
      consignorTaxNo,
      vehicleNo,
      lrNo,
      freightStatus,
      receiverName: receiverName || "-",
      receiverMobile: receiverMobile || "-",
      mrnNo,
      receiptDate,
      docReferenceCode,
      remarks,
      transferFromDcId: previewState?.transferFromDcId || params.transferFromDcId || null,
      transferFromDcNumber: previewState?.transferFromDcNumber || params.transferFromDcNumber || "",
      items: challanItems,
    };
  };

  const handleDownloadDraft = async () => {
    try {
      const draftData = {
        challanNumber: isScrapDC ? "SDC-26-001" : "DC-26-001",
        ...getChallanPayload(true),
        indentNo: indentNo?.trim() || "-",
      };
      await downloadOrShareChallanPdf(draftData as any, {
        share: true,
      });
      toast.success("Draft PDF prepared successfully");
    } catch (err: any) {
      console.error("PDF draft error:", err);
      toast.error(err.message || "Failed to generate Draft PDF");
    }
  };

  const handleConfirmCreate = async () => {
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

    try {
      setCreating(true);

      const finalPayload = getChallanPayload(false);
      let res: any;
      if (isScrapDC) {
        const scrapDealerId = initialVendor?._id || initialVendor?.id || finalPayload.vendorId || finalPayload.vendor?._id;
        res = await challanService.createScrapDeliveryChallan({
          ...finalPayload,
          scrapDealerId,
        });
      } else {
        res = await challanService.createDeliveryChallan(finalPayload);
      }

      const newDc = res?.data || res;
      toast.success(
        isTransfer
          ? `Transfer Delivery Challan ${newDc?.dcNumber || newDc?.challanNumber || "Created"} created! Source DC ${transferFromDcNumber} marked as Transfer.`
          : `Delivery Challan ${newDc?.dcNumber || newDc?.challanNumber || "Created"} issued successfully!`
      );

      try {
        const pdfPayload = getChallanPayload(true);
        await downloadOrShareChallanPdf(
          {
            ...pdfPayload,
            ...newDc,
            items: pdfPayload.items,
            indentNo: indentNo || newDc?.indentNo,
          } as any,
          {
            share: true,
          }
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

  // Universal clean input style matching the screenshot: crisp, vertically centered, zero clipped text
  const baseCanvasInputStyle = {
    height: 32,
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
        contentContainerStyle={{ padding: 10, paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Location & Receiver Entry Details Card (Matching Web Exactly) */}
        <View
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            padding: 12,
            marginBottom: 14,
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
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MapPin size={16} color={theme.primary} />
              <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text }}>
                Location & Receiver Entry Details
              </Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {!isScrapDC && (
              <View>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.textMuted, marginBottom: 4 }}>
                  Site Code No. <Text style={{ color: "#EF4444" }}>* (Required)</Text>
                </Text>
                <TextInput
                  value={siteCode}
                  onChangeText={(val) => {
                    setSiteCode(val);
                    if (siteCodeError) setSiteCodeError("");
                  }}
                  placeholder="e.g. sc-01, Site#101, SC/2026-A"
                  placeholderTextColor={theme.textMuted}
                  style={{
                    height: 36,
                    paddingVertical: Platform.OS === "android" ? 2 : 4,
                    paddingHorizontal: 10,
                    textAlignVertical: "center",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: siteCodeError ? "#EF4444" : theme.border,
                    backgroundColor: siteCodeError ? (isDark ? "#450A0A" : "#FEF2F2") : theme.surface,
                    fontSize: 12,
                    fontWeight: "700",
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    color: theme.text,
                    includeFontPadding: false,
                  }}
                />
                {siteCodeError ? (
                  <Text style={{ fontSize: 10, color: "#EF4444", fontWeight: "600", marginTop: 2 }}>
                    {siteCodeError}
                  </Text>
                ) : null}
              </View>
            )}

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
                    height: 36,
                    paddingVertical: Platform.OS === "android" ? 2 : 4,
                    paddingHorizontal: 10,
                    textAlignVertical: "center",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    fontSize: 12,
                    fontWeight: "600",
                    color: theme.text,
                    includeFontPadding: false,
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
                    height: 36,
                    paddingVertical: Platform.OS === "android" ? 2 : 4,
                    paddingHorizontal: 10,
                    textAlignVertical: "center",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    fontSize: 12,
                    fontWeight: "600",
                    color: theme.text,
                    includeFontPadding: false,
                  }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Transfer Alert Banner if applicable */}
        {isTransfer && (
          <View
            style={{
              backgroundColor: isDark ? "#1E293B" : "#EFF6FF",
              borderWidth: 1,
              borderColor: "#3B82F6",
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ArrowRightLeft size={18} color="#3B82F6" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#1D4ED8" }}>Site Tool Transfer</Text>
              <Text style={{ fontSize: 10.5, color: isDark ? "#93C5FD" : "#1E40AF" }}>
                Transferring {initialTools.length} tool(s) from Source DC: {transferFromDcNumber}.
              </Text>
            </View>
          </View>
        )}

        {/* Authentic L&T Delivery Challan Canvas (Exact Old Model from user screenshot with NO Horizontal Scroll) */}
        <View
          style={{
            width: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: 8,
            borderWidth: 2,
            borderColor: "#000000",
            padding: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            marginBottom: 20,
          }}
        >
          {/* L&T Top Header */}
          <View style={{ alignItems: "center", paddingBottom: 8 }}>
            <View style={{ alignSelf: "flex-start", marginBottom: 2 }}>
              <Image
                source={{ uri: LNT_LOGO_BASE64 }}
                style={{ width: 42, height: 42 }}
                resizeMode="contain"
              />
            </View>
            <Text
              style={{
                fontSize: 14,
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
                  paddingVertical: 5,
                  backgroundColor: "#F8FAFC",
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderBottomColor: "#000000",
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: "900", color: "#000000", textTransform: "uppercase" }}>
                  {documentTitle}
                </Text>
              </View>

              <View style={{ flexDirection: "row" }}>
                {/* DC NO */}
                <View style={{ flex: 1, padding: 5, borderRightWidth: 1.5, borderRightColor: "#000000" }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#000000" }}>DC NO.</Text>
                  <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#334155", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", marginTop: 3 }}>
                    {isScrapDC ? "SDC-26-001" : "DC-26-001"}
                  </Text>
                </View>

                {/* INDENT NO. */}
                <View style={{ flex: 1.2, padding: 5, borderRightWidth: 1.5, borderRightColor: "#000000" }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#000000" }}>INDENT NO.</Text>
                  <TextInput
                    value={indentNo}
                    onChangeText={setIndentNo}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{
                      ...baseCanvasInputStyle,
                      marginTop: 3,
                      height: 28,
                      fontSize: 10,
                      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    }}
                  />
                </View>

                {/* DATE */}
                <View style={{ flex: 1.3, padding: 5 }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#000000" }}>DATE (DD-MM-YYYY)</Text>
                  <TextInput
                    value={challanDate}
                    onChangeText={setChallanDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    style={{
                      ...baseCanvasInputStyle,
                      marginTop: 3,
                      height: 28,
                      fontSize: 10,
                    }}
                  />
                  <Text style={{ fontSize: 8.5, fontWeight: "700", color: "#64748B", marginTop: 2 }}>
                    {formatDateDDMMYYYY(challanDate)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 1B: Consignee / Subcontractor Box */}
            <View style={{ padding: 6, backgroundColor: "#F8FAFC", borderBottomWidth: 2, borderBottomColor: "#000000" }}>
              <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#000000", marginBottom: 3 }}>
                CONSIGNEE / SUBCONTRACTOR
              </Text>
              <TextInput
                value={subcontractorName}
                onChangeText={setSubcontractorName}
                placeholder="Subcontractor Name"
                placeholderTextColor="#94A3B8"
                style={{
                  ...baseCanvasInputStyle,
                  marginBottom: 4,
                  height: 30,
                  fontSize: 10.5,
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
                  height: 30,
                  fontSize: 10.5,
                }}
              />

              {/* SITE CODE NO. (Exact row as shown in user screenshot) */}
              {!isScrapDC && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 4,
                    borderTopWidth: 1,
                    borderTopColor: "#E2E8F0",
                  }}
                >
                  <Text style={{ fontSize: 9.5, fontWeight: "900", color: "#000000" }}>
                    SITE CODE NO. <Text style={{ color: "#DC2626" }}>*</Text>
                  </Text>
                  <TextInput
                    value={siteCode}
                    onChangeText={(val) => {
                      setSiteCode(val);
                      if (siteCodeError) setSiteCodeError("");
                    }}
                    placeholder="Required *"
                    placeholderTextColor={siteCodeError ? "#DC2626" : "#94A3B8"}
                    style={{
                      ...baseCanvasInputStyle,
                      width: 180,
                      height: 32,
                      fontSize: 11,
                      textAlign: "center",
                      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                      borderColor: siteCodeError ? "#DC2626" : "#94A3B8",
                      backgroundColor: siteCodeError ? "#FEF2F2" : "#FFFFFF",
                    }}
                  />
                </View>
              )}
              {siteCodeError ? (
                <Text style={{ fontSize: 9, color: "#DC2626", fontWeight: "700", marginTop: 2, textAlign: "right" }}>
                  {siteCodeError}
                </Text>
              ) : null}
            </View>

            {/* Row 2: TRN CD & Accounting Details (Exact 4-column and 3-column rows from screenshot) */}
            <View style={{ backgroundColor: "#F8FAFC", borderBottomWidth: 2, borderBottomColor: "#000000" }}>
              {/* Row 2A (TRN CD, SENDING CENTRE, M.R.N. NO., M.R.N. DATE) */}
              <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#CBD5E1" }}>
                <View style={{ flex: 1, padding: 4, borderRightWidth: 1, borderRightColor: "#CBD5E1" }}>
                  <Text style={{ fontSize: 7.5, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>TRN CD</Text>
                  <TextInput
                    value={trnCode}
                    onChangeText={setTrnCode}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{ ...baseCanvasInputStyle, height: 28, fontSize: 9.5, textAlign: "center", paddingHorizontal: 2 }}
                  />
                </View>
                <View style={{ flex: 1.5, padding: 4, borderRightWidth: 1, borderRightColor: "#CBD5E1" }}>
                  <Text style={{ fontSize: 7, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>SENDING CENTRE</Text>
                  <TextInput
                    value={sendingCentreCode}
                    onChangeText={setSendingCentreCode}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{ ...baseCanvasInputStyle, height: 28, fontSize: 9.5, textAlign: "center", paddingHorizontal: 2 }}
                  />
                </View>
                <View style={{ flex: 1.2, padding: 4, borderRightWidth: 1, borderRightColor: "#CBD5E1" }}>
                  <Text style={{ fontSize: 7.5, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>M.R.N. NO.</Text>
                  <TextInput
                    value={mrNo}
                    onChangeText={setMrNo}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{ ...baseCanvasInputStyle, height: 28, fontSize: 9.5, textAlign: "center", paddingHorizontal: 2 }}
                  />
                </View>
                <View style={{ flex: 1.2, padding: 4 }}>
                  <Text style={{ fontSize: 7.5, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>M.R.N. DATE</Text>
                  <TextInput
                    value={mrDate}
                    onChangeText={setMrDate}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{ ...baseCanvasInputStyle, height: 28, fontSize: 9.5, textAlign: "center", paddingHorizontal: 2 }}
                  />
                </View>
              </View>

              {/* Row 2B (STOCK TYPE, VENDOR CODE, E-WAY BILL NO.) */}
              <View style={{ flexDirection: "row" }}>
                <View style={{ flex: 1.2, padding: 4, borderRightWidth: 1, borderRightColor: "#CBD5E1" }}>
                  <Text style={{ fontSize: 7.5, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>STOCK TYPE</Text>
                  <TextInput
                    value={stockType}
                    onChangeText={setStockType}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{ ...baseCanvasInputStyle, height: 28, fontSize: 9.5, textAlign: "center", paddingHorizontal: 2 }}
                  />
                </View>
                <View style={{ flex: 1.3, padding: 4, borderRightWidth: 1, borderRightColor: "#CBD5E1" }}>
                  <Text style={{ fontSize: 7.5, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>VENDOR CODE</Text>
                  <TextInput
                    value={vendorCode}
                    editable={false}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{
                      ...baseCanvasInputStyle,
                      height: 28,
                      fontSize: 9.5,
                      textAlign: "center",
                      backgroundColor: "#F1F5F9",
                      color: "#475569",
                      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                      paddingHorizontal: 2,
                    }}
                  />
                </View>
                <View style={{ flex: 1.5, padding: 4 }}>
                  <Text style={{ fontSize: 7.5, fontWeight: "800", color: "#000000", textAlign: "center", marginBottom: 2 }}>E-WAY BILL NO.</Text>
                  <TextInput
                    value={ewayBillNo}
                    onChangeText={setEwayBillNo}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{ ...baseCanvasInputStyle, height: 28, fontSize: 9.5, textAlign: "center", paddingHorizontal: 2 }}
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
                paddingVertical: 5,
                paddingHorizontal: 6,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "900", color: "#B91C1C", textTransform: "uppercase", textAlign: "center" }}>
                NOT FOR SALE – MATERIAL ISSUED ON RETURNABLE BASIS
              </Text>
              <Text style={{ fontSize: 8.5, fontStyle: "italic", color: "#334155", marginTop: 2, textAlign: "center" }}>
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
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderBottomWidth: 2,
                borderBottomColor: "#000000",
                gap: 6,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                <Layers size={14} color="#1D4ED8" />
                <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#334155" }}>Tools Listing:</Text>
                <Text style={{ fontSize: 10.5, color: "#475569" }}>
                  {isGrouped
                    ? `Grouped (${groupedItems.length} groups, ${totalQuantity} qty)`
                    : `Individual (${items.length} listed)`}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsGrouped((prev) => !prev)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 8,
                  paddingVertical: 3.5,
                  borderRadius: 5,
                  backgroundColor: isGrouped ? "#1D4ED8" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: isGrouped ? "#1D4ED8" : "#94A3B8",
                }}
              >
                <Layers size={11} color={isGrouped ? "#FFFFFF" : "#0F172A"} />
                <Text style={{ fontSize: 10, fontWeight: "700", color: isGrouped ? "#FFFFFF" : "#0F172A" }}>
                  {isGrouped ? "Disable Grouping" : "Group by Description"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Row 3: Items Table (Exact 3-column table from screenshot, 100% width, ZERO horizontal scroll) */}
            <View style={{ width: "100%" }}>
              {/* Table Header */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#F8FAFC",
                  borderBottomWidth: 2,
                  borderBottomColor: "#000000",
                }}
              >
                <View style={{ width: 44, padding: 5, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000" }}>SL. NO.</Text>
                </View>
                <View style={{ width: 130, padding: 5, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000" }}>MATERIAL CODE</Text>
                </View>
                <View style={{ flex: 1, padding: 5, justifyContent: "center" }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000" }}>DESCRIPTION & QR</Text>
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
                      {/* SL. NO. */}
                      <View style={{ width: 44, padding: 6, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#000000" }}>{idx + 1}</Text>
                      </View>

                      {/* MATERIAL CODE */}
                      <View style={{ width: 130, padding: 4, borderRightWidth: 1.5, borderRightColor: "#000000", justifyContent: "center" }}>
                        <TextInput
                          value={group.materialCode}
                          onChangeText={(val) => handleGroupedItemChange(group, "materialCode", val)}
                          placeholder="-"
                          placeholderTextColor="#94A3B8"
                          style={{
                            ...baseCanvasInputStyle,
                            fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                            textAlign: "center",
                            fontSize: 9.5,
                            paddingHorizontal: 2,
                            height: 32,
                          }}
                        />
                      </View>

                      {/* DESCRIPTION & QR */}
                      <View style={{ flex: 1, padding: 5, justifyContent: "center" }}>
                        <TextInput
                          value={group.description}
                          onChangeText={(val) => handleGroupedItemChange(group, "description", val)}
                          placeholder="Tool Description"
                          placeholderTextColor="#94A3B8"
                          style={{
                            ...baseCanvasInputStyle,
                            marginBottom: 4,
                            height: 30,
                            fontSize: 10.5,
                          }}
                        />
                        {/* QR Code Text in Blue */}
                        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 3 }}>
                          <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#475569" }}>QR :</Text>
                          {group.qrs.map((qr, qIdx) => (
                            <Text
                              key={qIdx}
                              style={{
                                fontSize: 9,
                                fontWeight: "800",
                                color: "#1D4ED8",
                                fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                                includeFontPadding: false,
                              }}
                            >
                              {qr}{qIdx < group.qrs.length - 1 ? ", " : ""}
                            </Text>
                          ))}
                        </View>
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
                      {/* SL. NO. */}
                      <View style={{ width: 44, padding: 6, borderRightWidth: 1.5, borderRightColor: "#000000", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#000000" }}>{idx + 1}</Text>
                      </View>

                      {/* MATERIAL CODE */}
                      <View style={{ width: 130, padding: 4, borderRightWidth: 1.5, borderRightColor: "#000000", justifyContent: "center" }}>
                        <TextInput
                          value={item.materialCode}
                          onChangeText={(val) => handleItemChange(idx, "materialCode", val)}
                          placeholder="-"
                          placeholderTextColor="#94A3B8"
                          style={{
                            ...baseCanvasInputStyle,
                            fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                            textAlign: "center",
                            fontSize: 9.5,
                            paddingHorizontal: 2,
                            height: 32,
                          }}
                        />
                      </View>

                      {/* DESCRIPTION & QR */}
                      <View style={{ flex: 1, padding: 5, justifyContent: "center" }}>
                        <TextInput
                          value={item.description}
                          onChangeText={(val) => handleItemChange(idx, "description", val)}
                          placeholder="Tool Description"
                          placeholderTextColor="#94A3B8"
                          style={{
                            ...baseCanvasInputStyle,
                            marginBottom: 4,
                            height: 30,
                            fontSize: 10.5,
                          }}
                        />
                        {/* QR Code Text in Blue */}
                        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 3 }}>
                          <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#475569" }}>QR :</Text>
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
                  ))}
            </View>

            {/* Row 4: Gate Pass Approval & Total Qty (Exact match with user screenshot) */}
            <View
              style={{
                backgroundColor: "#F8FAFC",
                padding: 6,
                borderBottomWidth: 2,
                borderBottomColor: "#000000",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flex: 1 }}>
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
                      height: 30,
                    }}
                  />
                </View>

                <View style={{ flex: 1.2 }}>
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
                      height: 30,
                    }}
                  />
                </View>
              </View>

              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "900", color: "#000000" }}>
                  TOTAL: <Text style={{ color: "#1D4ED8" }}>{totalQuantity}</Text>
                </Text>
              </View>
            </View>

            {/* Row 5: Consignor & Consignee GST Details (Exact match with user screenshot) */}
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
                    height: 30,
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
                    height: 30,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                  }}
                />
              </View>
            </View>

            {/* Row 6: Vehicle, LR, Freight (Exact match with user screenshot) */}
            <View
              style={{
                borderBottomWidth: 2,
                borderBottomColor: "#000000",
                backgroundColor: "#F8FAFC",
              }}
            >
              <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#CBD5E1" }}>
                <View style={{ flex: 1, padding: 5, borderRightWidth: 1, borderRightColor: "#CBD5E1" }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#000000" }}>VEHICLE / DESPATCH THROUGH</Text>
                  <TextInput
                    value={vehicleNo}
                    onChangeText={setVehicleNo}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{
                      ...baseCanvasInputStyle,
                      marginTop: 3,
                      height: 28,
                    }}
                  />
                </View>
                <View style={{ flex: 1, padding: 5 }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#000000" }}>LR / RR NO. & DATE</Text>
                  <TextInput
                    value={lrNo}
                    onChangeText={setLrNo}
                    placeholder="-"
                    placeholderTextColor="#94A3B8"
                    style={{
                      ...baseCanvasInputStyle,
                      marginTop: 3,
                      height: 28,
                    }}
                  />
                </View>
              </View>

              <View style={{ padding: 5 }}>
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

            {/* Row 7: Receipt Details & Signature (Exact match with user screenshot) */}
            <View
              style={{
                borderBottomWidth: 2,
                borderBottomColor: "#000000",
                backgroundColor: "#FFFFFF",
              }}
            >
              <View style={{ padding: 6, borderBottomWidth: 1, borderBottomColor: "#CBD5E1" }}>
                <Text style={{ fontSize: 9, fontWeight: "900", color: "#000000" }}>RECEIPT DETAILS</Text>
                <Text style={{ fontSize: 8, fontStyle: "italic", color: "#475569", marginTop: 2, marginBottom: 6 }}>
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
                        style={{ ...baseCanvasInputStyle, height: 30, fontSize: 10 }}
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
                        style={{ ...baseCanvasInputStyle, height: 30, fontSize: 10 }}
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
                        style={{ ...baseCanvasInputStyle, height: 30, fontSize: 10 }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 8, fontWeight: "800", color: "#64748B", marginBottom: 2 }}>RECEIPT DATE</Text>
                      <TextInput
                        value={receiptDate}
                        onChangeText={setReceiptDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94A3B8"
                        style={{ ...baseCanvasInputStyle, height: 30, fontSize: 10 }}
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={{ padding: 6, alignItems: "flex-end", backgroundColor: "#F8FAFC" }}>
                <Text style={{ fontSize: 9, fontWeight: "900", color: "#000000", textAlign: "right" }}>
                  FOR LARSEN & TOUBRO LIMITED CONSTRUCTION DIVISION
                </Text>
                <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#334155", marginTop: 3 }}>
                  AUTHORIZED SIGNATORY
                </Text>
              </View>
            </View>

            {/* Row 8: Remarks */}
            <View style={{ padding: 6, backgroundColor: "#F8FAFC" }}>
              <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#000000", marginBottom: 3 }}>REMARKS</Text>
              <TextInput
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Add remarks or dispatch instructions..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
                style={{
                  minHeight: 40,
                  borderWidth: 1,
                  borderColor: "#94A3B8",
                  borderRadius: 4,
                  padding: 6,
                  fontSize: 10.5,
                  fontWeight: "600",
                  color: "#000000",
                  backgroundColor: "#FFFFFF",
                }}
              />
            </View>

          </View>

          {/* Footer Copy Distribution Line with Checkboxes */}
          <View style={{ marginTop: 8, gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
              <Text style={{ fontSize: 8, fontWeight: "800", color: "#475569" }}>{docReferenceCode}</Text>
              <Text style={{ fontSize: 8, fontWeight: "700", color: "#475569" }}>{registeredOfficeAddress}</Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                paddingTop: 5,
                borderTopWidth: 1,
                borderTopColor: "#CBD5E1",
              }}
            >
              <Text style={{ fontSize: 8, fontWeight: "900", color: "#000000" }}>COPY DISTRIBUTION:</Text>
              {[
                "CONSIGNEE",
                "CONSIGNEE – CONSIGNOR",
                "GATE PASS (SECURITY - ACCOUNTS)",
                "CONSIGNOR'S FILE",
              ].map((copyName) => (
                <View key={copyName} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderWidth: 1.5,
                      borderColor: "#000000",
                      borderRadius: 2,
                    }}
                  />
                  <Text style={{ fontSize: 7.5, fontWeight: "800", color: "#000000" }}>{copyName}</Text>
                </View>
              ))}
            </View>
          </View>

        </View>

        {/* Bottom Full Action Buttons */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <TouchableOpacity
            onPress={handleConfirmCreate}
            disabled={creating}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 46,
              borderRadius: 10,
              backgroundColor: theme.primary,
            }}
          >
            {creating ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}>Creating Delivery Challan...</Text>
              </>
            ) : isTransfer ? (
              <>
                <ArrowRightLeft size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}>Confirm & Transfer Equipment</Text>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}>Confirm & Issue Delivery Challan</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDownloadDraft}
            disabled={creating}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 44,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <Download size={16} color={theme.primary} />
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: theme.primary }}>Download PDF Draft Document</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}
