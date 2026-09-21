import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Truck } from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { challanService } from "@/features/challans/services/challanService";

export default function NewChallanScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  const [challanType, setChallanType] = useState<"Delivery" | "Return">("Delivery");
  const [vendorName, setVendorName] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!vendorName.trim()) {
      Alert.alert("Validation Error", "Vendor or Contractor name is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        challanType,
        vendor: {
          name: vendorName.trim(),
          vendorCode: vendorCode.trim() || undefined,
          contactPerson: contactPerson.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          address: siteLocation.trim() || undefined,
        },
        challanDate: new Date().toISOString().split("T")[0],
        notes: notes.trim() || undefined,
        items: [],
      };

      if (challanType === "Delivery") {
        await challanService.createDeliveryChallan(payload);
        Alert.alert("Success", "Delivery Challan (DC) generated successfully!");
      } else {
        await challanService.createReturnChallan(payload);
        Alert.alert("Success", "Return Challan (RC) generated successfully!");
      }

      router.back();
    } catch (err: any) {
      Alert.alert(
        "Creation Notice",
        err?.response?.data?.message || err?.message || "Failed to generate challan."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper
      title={`Create ${challanType} Challan`}
      subtitle="Material Dispatch & Equipment Movement Note"
      showBackButton={true}
      scrollable={true}
    >
      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: theme.cardBorder,
          padding: 18,
          marginBottom: 30,
        }}
      >
        {/* Challan Type Toggle */}
        <View style={{ marginBottom: 18 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: theme.textSecondary,
              marginBottom: 8,
            }}
          >
            Challan Movement Type
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {(["Delivery", "Return"] as const).map((t) => {
              const isSelected = challanType === t;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.7}
                  onPress={() => setChallanType(t)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: isSelected ? theme.primary : theme.isDark ? "#1E293B" : "#F1F5F9",
                    borderWidth: 1,
                    borderColor: isSelected ? theme.primary : theme.border,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: isSelected ? "#FFFFFF" : theme.text,
                    }}
                  >
                    {t === "Delivery" ? "Outward Delivery (DC)" : "Inward Return (RC)"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Input
          label="Vendor / Contractor / Transporter *"
          placeholder="e.g. Apex Civil Infra Pvt Ltd"
          value={vendorName}
          onChangeText={setVendorName}
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
              label="Contact Person"
              placeholder="e.g. Suresh Patel"
              value={contactPerson}
              onChangeText={setContactPerson}
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Contact Phone"
              placeholder="e.g. +91 94000 12345"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Site Location / Project Destination"
              placeholder="e.g. Metro Site Pier 44"
              value={siteLocation}
              onChangeText={setSiteLocation}
            />
          </View>
        </View>

        <Input
          label="Dispatch Remarks / Instructions"
          placeholder="Vehicle registration no, driver name, delivery instructions..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => router.back()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Generate Challan"
              onPress={handleSubmit}
              loading={saving}
            />
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}
