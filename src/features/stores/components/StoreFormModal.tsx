import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Alert, TouchableOpacity } from "react-native";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StoreRecord, StoreFormValues } from "../types";
import { storeService } from "../services/storeService";

interface StoreFormModalProps {
  visible: boolean;
  onClose: () => void;
  store?: StoreRecord | null;
  projectId?: string;
  onSuccess: () => void;
}

export const StoreFormModal: React.FC<StoreFormModalProps> = ({
  visible,
  onClose,
  store,
  projectId,
  onSuccess,
}) => {
  const isEditing = !!store;
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [incharge, setIncharge] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [type, setType] = useState("Store");
  const [status, setStatus] = useState("Operational");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (store) {
      setName(store.name || "");
      setLocation(store.location || "");
      setIncharge(store.incharge || "");
      setContactNumber(store.contactNumber || "");
      setType(store.type || "Store");
      setStatus(store.status || "Operational");
    } else {
      setName("");
      setLocation("");
      setIncharge("");
      setContactNumber("");
      setType("Store");
      setStatus("Operational");
    }
  }, [store, visible]);

  const statuses = ["Operational", "Maintenance", "Inactive"];
  const types = ["Store", "HUB"];

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Store name is required.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        storeName: name.trim(),
        location: location.trim() || undefined,
        incharge: incharge.trim() || undefined,
        manager: incharge.trim() || undefined,
        managerName: incharge.trim() || undefined,
        contactNumber: contactNumber.trim() || undefined,
        type,
        status,
        projectId: projectId || store?.projectId || undefined,
      };

      if (isEditing && store?._id) {
        await storeService.updateStore(store._id, payload);
        Alert.alert("Success", "Store updated successfully!");
      } else {
        await storeService.createStore(payload);
        Alert.alert("Success", "Store created successfully!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert(
        isEditing ? "Update Failed" : "Creation Failed",
        err?.response?.data?.message || err?.message || "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEditing ? "Edit Store" : "Create New Store"}
    >
      <ScrollView className="max-h-[460px]" showsVerticalScrollIndicator={false}>
        <Input
          label="Store Name *"
          placeholder="e.g. Central Tool Depot Site 4"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />

        <Input
          label="Location / Yard"
          placeholder="e.g. Block B, Yard 12"
          value={location}
          onChangeText={setLocation}
          editable={!loading}
        />

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input
              label="Store In-Charge"
              placeholder="e.g. Amit Patel"
              value={incharge}
              onChangeText={setIncharge}
              editable={!loading}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Contact Phone"
              placeholder="e.g. +91 98765 43210"
              keyboardType="phone-pad"
              value={contactNumber}
              onChangeText={setContactNumber}
              editable={!loading}
            />
          </View>
        </View>

        {/* Store Type Selection */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
            Facility Type
          </Text>
          <View className="flex-row gap-2">
            {types.map((t) => {
              const isSelected = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.7}
                  onPress={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Status Selection */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
            Operational Status
          </Text>
          <View className="flex-row gap-1.5">
            {statuses.map((st) => {
              const isSelected = status === st;
              return (
                <TouchableOpacity
                  key={st}
                  activeOpacity={0.7}
                  onPress={() => setStatus(st)}
                  className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View className="flex-row gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <View className="flex-1">
          <Button title="Cancel" variant="outline" onPress={onClose} disabled={loading} />
        </View>
        <View className="flex-1">
          <Button
            title={isEditing ? "Save Changes" : "Create Store"}
            onPress={handleSubmit}
            loading={loading}
          />
        </View>
      </View>
    </Modal>
  );
};
