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
import { Plus, Trash2, Users } from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { profileService } from "@/features/profiles/services/profileService";
import { ProfileType, KeyPersonnelContact } from "@/features/profiles/types";

const PROFILE_TYPES: { label: string; value: ProfileType }[] = [
  { label: "Subcontractor", value: "Subcontractor" },
  { label: "Scrap Dealer", value: "ScrapDealer" },
  { label: "Supplier", value: "Supplier" },
];

const formatAadhaarNumber = (val: string, prevVal: string = ""): string => {
  if (prevVal.endsWith("-") && val === prevVal.slice(0, -1)) {
    val = val.slice(0, -1);
  }
  const digits = val.replace(/\D/g, "").slice(0, 12);
  const isDeleting = val.length < prevVal.length;

  if (digits.length <= 4) {
    if (digits.length === 4 && !isDeleting) {
      return `${digits}-`;
    }
    return digits;
  } else if (digits.length <= 8) {
    if (digits.length === 8 && !isDeleting) {
      return `${digits.slice(0, 4)}-${digits.slice(4)}-`;
    }
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  } else {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
};

const emptyContact: KeyPersonnelContact = {
  name: "",
  designation: "",
  phone: "",
  alternatePhone: "",
  email: "",
};

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
  const [keyPersonnel, setKeyPersonnel] = useState<KeyPersonnelContact[]>([{ ...emptyContact }]);
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
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
          setAddress(p.address || "");
          setGstNumber(p.gstNumber || "");
          setPanNumber(p.panNumber || "");
          setAadhaarNumber(p.aadhaarNumber || "");
          setLicenseNumber(p.licenseNumber || "");
          setStatus(p.status || "Active");

          if (Array.isArray(p.keyPersonnel) && p.keyPersonnel.length > 0) {
            setKeyPersonnel(p.keyPersonnel);
          } else if (p.contactPerson || p.contactPhone || p.contactEmail) {
            setKeyPersonnel([
              {
                name: p.contactPerson || "",
                designation: p.contactDesignation || "",
                phone: p.contactPhone || "",
                alternatePhone: p.alternatePhone || "",
                email: p.contactEmail || "",
              },
            ]);
          }
        }
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [id]);

  const handleAddPersonnel = () => {
    setKeyPersonnel((prev) => [...prev, { ...emptyContact }]);
  };

  const handleRemovePersonnel = (index: number) => {
    setKeyPersonnel((prev) => {
      if (prev.length <= 1) return [{ ...emptyContact }];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpdatePersonnel = (
    index: number,
    field: keyof KeyPersonnelContact,
    val: string
  ) => {
    setKeyPersonnel((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      Alert.alert("Validation Error", "Company name and code are required.");
      return;
    }

    try {
      setSaving(true);
      const primaryContact = keyPersonnel[0] || emptyContact;

      const payload = {
        profileType,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        contactPerson: primaryContact.name.trim(),
        contactDesignation: primaryContact.designation.trim(),
        contactPhone: primaryContact.phone.trim(),
        alternatePhone: (primaryContact.alternatePhone || "").trim(),
        contactEmail: primaryContact.email.trim(),
        keyPersonnel: keyPersonnel.filter((k) => k.name.trim() || k.phone.trim()),
        address: address.trim(),
        gstNumber: gstNumber.trim().toUpperCase(),
        panNumber: panNumber.trim().toUpperCase(),
        aadhaarNumber: aadhaarNumber.trim(),
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

          <View style={{ marginBottom: 14 }}>
            <Input
              label="Identifier Code *"
              placeholder="e.g. SUB-001"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
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

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Aadhaar Number"
                placeholder="XXXX-XXXX-XXXX"
                value={aadhaarNumber}
                onChangeText={(val) =>
                  setAadhaarNumber((prev) => formatAadhaarNumber(val, prev))
                }
                keyboardType="numeric"
                maxLength={14}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Trade / Scrap License"
                placeholder="e.g. LIC-2024-998"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
              />
            </View>
          </View>

          {/* Key Personnel Contacts Section */}
          <View
            style={{
              marginTop: 10,
              marginBottom: 16,
              padding: 14,
              borderRadius: 14,
              backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
              borderWidth: 1,
              borderColor: isDark ? "#1E293B" : "#E2E8F0",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Users size={16} color={theme.primary} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: theme.text,
                  }}
                >
                  Key Personnel Contacts ({keyPersonnel.length})
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleAddPersonnel}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: theme.primary + "15",
                }}
              >
                <Plus size={13} color={theme.primary} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: theme.primary,
                  }}
                >
                  Add Person
                </Text>
              </TouchableOpacity>
            </View>

            {keyPersonnel.map((person, idx) => (
              <View
                key={idx}
                style={{
                  padding: 12,
                  marginBottom: idx < keyPersonnel.length - 1 ? 12 : 0,
                  borderRadius: 12,
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: theme.textSecondary,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Contact #{idx + 1} {idx === 0 ? "(Primary)" : ""}
                  </Text>

                  {keyPersonnel.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemovePersonnel(idx)}
                      style={{ padding: 4 }}
                    >
                      <Trash2 size={14} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Full Name *"
                      placeholder="e.g. Rajesh Kumar"
                      value={person.name}
                      onChangeText={(val) =>
                        handleUpdatePersonnel(idx, "name", val)
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Designation"
                      placeholder="e.g. Site Supervisor"
                      value={person.designation}
                      onChangeText={(val) =>
                        handleUpdatePersonnel(idx, "designation", val)
                      }
                    />
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Primary Phone *"
                      placeholder="+91 9876543210"
                      value={person.phone}
                      onChangeText={(val) =>
                        handleUpdatePersonnel(idx, "phone", val)
                      }
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Alternate Phone"
                      placeholder="+91 9123456780"
                      value={person.alternatePhone}
                      onChangeText={(val) =>
                        handleUpdatePersonnel(idx, "alternatePhone", val)
                      }
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <Input
                  label="Email Address"
                  placeholder="contact@example.com"
                  value={person.email}
                  onChangeText={(val) =>
                    handleUpdatePersonnel(idx, "email", val)
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            ))}
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
