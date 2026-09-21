import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { profileService } from "@/features/profiles/services/profileService";
import { ProfileType } from "@/features/profiles/types";

const PROFILE_TYPES: { label: string; value: ProfileType }[] = [
  { label: "Subcontractor", value: "Subcontractor" },
  { label: "Scrap Dealer", value: "ScrapDealer" },
  { label: "Supplier", value: "Supplier" },
];

export default function ProfileFormScreen() {
  const { id, defaultType } = useLocalSearchParams<{
    id?: string;
    defaultType?: ProfileType;
  }>();
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const isEditing = !!id;
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [profileType, setProfileType] = useState<ProfileType>(
    defaultType || "Subcontractor"
  );
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactDesignation, setContactDesignation] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  useEffect(() => {
    if (!id) return;
    async function loadProfile() {
      try {
        setLoading(true);
        const p = await profileService.getProfileById(id!);
        if (p) {
          setProfileType(p.profileType);
          setName(p.name);
          setCode(p.code);
          setContactPerson(p.contactPerson || "");
          setContactDesignation(p.contactDesignation || "");
          setContactPhone(p.contactPhone || "");
          setAlternatePhone(p.alternatePhone || "");
          setContactEmail(p.contactEmail || "");
          setAddress(p.address || "");
          setGstNumber(p.gstNumber || "");
          setPanNumber(p.panNumber || "");
          setLicenseNumber(p.licenseNumber || "");
          setStatus(p.status || "Active");
        }
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [id]);

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      Alert.alert("Validation Error", "Company name and code are required.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        profileType,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        contactPerson: contactPerson.trim(),
        contactDesignation: contactDesignation.trim(),
        contactPhone: contactPhone.trim(),
        alternatePhone: alternatePhone.trim(),
        contactEmail: contactEmail.trim(),
        address: address.trim(),
        gstNumber: gstNumber.trim().toUpperCase(),
        panNumber: panNumber.trim().toUpperCase(),
        licenseNumber: licenseNumber.trim(),
        status,
      };

      if (isEditing) {
        await profileService.updateProfile(id!, payload);
        Alert.alert("Success", "Profile updated successfully.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        await profileService.createProfile(payload);
        Alert.alert("Success", "Profile created successfully.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert(
        "Save Failed",
        err?.response?.data?.message || err?.message || "Could not save profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper
      title={isEditing ? "Edit Profile" : "Register Profile"}
      showBack
    >
      {loading ? (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 10 }}>
            Loading profile information...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{
            backgroundColor: theme.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.cardBorder,
            padding: 18,
            marginBottom: 30,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Type Selector */}
          <View style={{ marginBottom: 14 }}>
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
              Profile Type
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {PROFILE_TYPES.map((t) => {
                const isSelected = profileType === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    activeOpacity={0.7}
                    onPress={() => setProfileType(t.value)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: "center",
                      borderRadius: 10,
                      backgroundColor: isSelected
                        ? theme.primary
                        : isDark
                        ? "#1E293B"
                        : "#F1F5F9",
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: isSelected ? "#FFFFFF" : theme.text,
                      }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Input
            label="Entity / Company Name *"
            placeholder="e.g. Larsen Rigging Services"
            value={name}
            onChangeText={setName}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Identifier Code *"
                placeholder="e.g. SUB-001"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Contact Person"
                placeholder="e.g. Rajesh Kumar"
                value={contactPerson}
                onChangeText={setContactPerson}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Contact Phone"
                placeholder="+91 9876543210"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Contact Email"
                placeholder="contact@company.com"
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <Input
            label="Office / Facility Address"
            placeholder="Plot No, Industrial Estate, City..."
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={2}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="GSTIN"
                placeholder="27AAAAA0000A1Z5"
                value={gstNumber}
                onChangeText={setGstNumber}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="PAN Number"
                placeholder="AAAAA0000A"
                value={panNumber}
                onChangeText={setPanNumber}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Status */}
          <View style={{ marginBottom: 14 }}>
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
              Status
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["Active", "Inactive"] as const).map((s) => {
                const isSelected = status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    activeOpacity={0.7}
                    onPress={() => setStatus(s)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: "center",
                      borderRadius: 10,
                      backgroundColor: isSelected
                        ? theme.primary
                        : isDark
                        ? "#1E293B"
                        : "#F1F5F9",
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: isSelected ? "#FFFFFF" : theme.text,
                      }}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Buttons */}
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
                title={isEditing ? "Update Profile" : "Create Profile"}
                onPress={handleSubmit}
                loading={saving}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}
