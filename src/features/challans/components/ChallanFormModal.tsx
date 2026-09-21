import React, { useState } from "react";
import { View, Text, ScrollView, Alert, TouchableOpacity } from "react-native";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { challanService } from "../services/challanService";

interface ChallanFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChallanFormModal: React.FC<ChallanFormModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [challanType, setChallanType] = useState<"Delivery" | "Return">("Delivery");
  const [vendorName, setVendorName] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!vendorName.trim()) {
      Alert.alert("Validation Error", "Vendor or Contractor name is required.");
      return;
    }

    setLoading(true);
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
        Alert.alert("Success", "Delivery Challan (DC) created successfully!");
      } else {
        await challanService.createReturnChallan(payload);
        Alert.alert("Success", "Return Challan (RC) created successfully!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert(
        "Creation Failed",
        err?.response?.data?.message || err?.message || "Failed to generate challan"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Generate New Challan">
      <ScrollView className="max-h-[480px]" showsVerticalScrollIndicator={false}>
        {/* Challan Type Selector */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
            Challan Type
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setChallanType("Delivery")}
              className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                challanType === "Delivery"
                  ? "bg-indigo-600 border-indigo-600"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  challanType === "Delivery" ? "text-white" : "text-slate-700 dark:text-slate-300"
                }`}
              >
                Delivery (DC)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setChallanType("Return")}
              className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                challanType === "Return"
                  ? "bg-emerald-600 border-emerald-600"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  challanType === "Return" ? "text-white" : "text-slate-700 dark:text-slate-300"
                }`}
              >
                Return (RC)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Input
          label="Vendor / Contractor Name *"
          placeholder="e.g. Apex Civil Infra Pvt Ltd"
          value={vendorName}
          onChangeText={setVendorName}
          editable={!loading}
        />

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input
              label="Vendor Code"
              placeholder="e.g. VND-089"
              value={vendorCode}
              onChangeText={setVendorCode}
              editable={!loading}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Contact Person"
              placeholder="e.g. Ramesh K"
              value={contactPerson}
              onChangeText={setContactPerson}
              editable={!loading}
            />
          </View>
        </View>

        <Input
          label="Contact Phone"
          placeholder="e.g. +91 98765 01234"
          keyboardType="phone-pad"
          value={contactPhone}
          onChangeText={setContactPhone}
          editable={!loading}
        />

        <Input
          label="Destination Site / Yard Location"
          placeholder="e.g. Metro Line 3, Station Box 4"
          value={siteLocation}
          onChangeText={setSiteLocation}
          editable={!loading}
        />

        <Input
          label="Notes / Remarks"
          placeholder="Challan purpose, transporter info, or vehicle no"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
          editable={!loading}
        />
      </ScrollView>

      <View className="flex-row gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <View className="flex-1">
          <Button title="Cancel" variant="outline" onPress={onClose} disabled={loading} />
        </View>
        <View className="flex-1">
          <Button
            title={`Generate ${challanType === "Delivery" ? "DC" : "RC"}`}
            onPress={handleSubmit}
            loading={loading}
          />
        </View>
      </View>
    </Modal>
  );
};
