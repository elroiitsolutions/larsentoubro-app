import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Building2, SlidersHorizontal, CheckCircle2, UserCheck, ShieldCheck } from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { profileService } from "@/features/profiles/services/profileService";
import { ProfileType } from "@/features/profiles/types";
import { formService, FormDefinition, FormFieldDefinition } from "@/services/formService";
import { DynamicFormRenderer } from "@/components/common/DynamicFormRenderer";

const PROFILE_TYPES: { label: string; value: ProfileType }[] = [
  { label: "Subcontractor", value: "Subcontractor" },
  { label: "Scrap Dealer", value: "ScrapDealer" },
  { label: "Supplier", value: "Supplier" },
];

const getSlugForType = (type: ProfileType): string => {
  switch (type) {
    case "Subcontractor":
      return "subcontractor-form";
    case "ScrapDealer":
      return "scrap-dealer-form";
    case "Supplier":
      return "supplier-form";
    default:
      return "subcontractor-form";
  }
};

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

const FALLBACK_SCHEMAS: Record<ProfileType, FormDefinition> = {
  Subcontractor: {
    slug: "subcontractor-form",
    name: "Subcontractor (Vendor) Form",
    fields: [
      { id: "name", name: "name", label: "Subcontractor / Vendor Name", type: "text", placeholder: "e.g. RADHE SWAMI CONSTRUCTION", required: true, validations: [{ type: "required", message: "Name is required" }], order: 0 },
      { id: "code", name: "code", label: "Subcontractor Code", type: "text", placeholder: "e.g. SUB-0001", required: true, validations: [{ type: "required", message: "Code is required" }], order: 1 },
      { id: "contactPerson", name: "contactPerson", label: "Manager / Contact Person", type: "text", placeholder: "e.g. Dinesh G", order: 2 },
      { id: "contactDesignation", name: "contactDesignation", label: "Contact Designation", type: "text", placeholder: "e.g. Site Manager", order: 3 },
      { id: "contactEmail", name: "contactEmail", label: "Contact Email Address", type: "email", placeholder: "e.g. contact@subcontractor.com", order: 4 },
      { id: "contactPhone", name: "contactPhone", label: "Primary Phone Number", type: "text", placeholder: "e.g. 9934110587", required: true, validations: [{ type: "required", message: "Primary phone is required" }], order: 5 },
      { id: "alternatePhone", name: "alternatePhone", label: "Alternate Phone Number", type: "text", placeholder: "e.g. 9876543210", order: 6 },
      { id: "address", name: "address", label: "Registered Office / Site Address", type: "textarea", placeholder: "Enter registered address", order: 7 },
      { id: "gstNumber", name: "gstNumber", label: "GST / Tax Identification Number", type: "text", placeholder: "e.g. 27AAACL0140P1Z0", order: 8 },
      { id: "panNumber", name: "panNumber", label: "PAN Number", type: "text", placeholder: "e.g. ABCDE1234F", order: 9 },
      { id: "status", name: "status", label: "Profile Status", type: "select", options: [{ label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }], order: 10 },
    ],
  },
  ScrapDealer: {
    slug: "scrap-dealer-form",
    name: "Scrap Dealer Form",
    fields: [
      { id: "name", name: "name", label: "Scrap Dealer / Firm Name", type: "text", placeholder: "e.g. SHREE METALS SCRAP DEALERS", required: true, validations: [{ type: "required", message: "Firm name is required" }], order: 0 },
      { id: "code", name: "code", label: "Scrap Dealer Code", type: "text", placeholder: "e.g. SCR-0001", required: true, validations: [{ type: "required", message: "Code is required" }], order: 1 },
      { id: "contactPerson", name: "contactPerson", label: "Proprietor / Contact Person", type: "text", placeholder: "e.g. Ramesh Patel", order: 2 },
      { id: "contactEmail", name: "contactEmail", label: "Contact Email Address", type: "email", placeholder: "e.g. ramesh@shreemetals.com", order: 3 },
      { id: "contactPhone", name: "contactPhone", label: "Primary Phone Number", type: "text", placeholder: "e.g. 9820012345", required: true, validations: [{ type: "required", message: "Phone number is required" }], order: 4 },
      { id: "licenseNumber", name: "licenseNumber", label: "Scrap Trade / Authorization License No.", type: "text", placeholder: "e.g. PCB/SCRAP/2026/0892", order: 5 },
      { id: "gstNumber", name: "gstNumber", label: "GST Number", type: "text", placeholder: "e.g. 27AAACS1234P1Z5", order: 6 },
      { id: "panNumber", name: "panNumber", label: "PAN Number", type: "text", placeholder: "e.g. AAACS1234P", order: 7 },
      { id: "address", name: "address", label: "Yard / Office Address", type: "textarea", placeholder: "Enter scrap yard address", order: 8 },
      { id: "status", name: "status", label: "Dealer Status", type: "select", options: [{ label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }], order: 9 },
    ],
  },
  Supplier: {
    slug: "supplier-form",
    name: "Supplier (Purchaser Name) Form",
    fields: [
      { id: "name", name: "name", label: "Supplier / Company Name", type: "text", placeholder: "e.g. HILTI INDIA PRIVATE LIMITED", required: true, validations: [{ type: "required", message: "Supplier Name is required" }], order: 0 },
      { id: "code", name: "code", label: "Supplier Code", type: "text", placeholder: "e.g. SUP-0001", required: true, validations: [{ type: "required", message: "Code is required" }], order: 1 },
      { id: "contactPerson", name: "contactPerson", label: "Sales / Account Representative", type: "text", placeholder: "e.g. Amit Sharma", order: 2 },
      { id: "contactEmail", name: "contactEmail", label: "Corporate Email Address", type: "email", placeholder: "e.g. sales@hilti.com", order: 3 },
      { id: "contactPhone", name: "contactPhone", label: "Contact Phone Number", type: "text", placeholder: "e.g. 1800 102 4400", required: true, validations: [{ type: "required", message: "Phone number is required" }], order: 4 },
      { id: "licenseNumber", name: "licenseNumber", label: "Trade / Manufacturing License No.", type: "text", placeholder: "e.g. IND-MFG-9842", order: 5 },
      { id: "gstNumber", name: "gstNumber", label: "GST Identification Number", type: "text", placeholder: "e.g. 07AAACH0042P1Z3", order: 6 },
      { id: "panNumber", name: "panNumber", label: "Company PAN", type: "text", placeholder: "e.g. AAACH0042P", order: 7 },
      { id: "address", name: "address", label: "Corporate / Regional Office Address", type: "textarea", placeholder: "Enter corporate address", order: 8 },
      { id: "status", name: "status", label: "Supplier Status", type: "select", options: [{ label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }], order: 9 },
    ],
  },
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
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profileType, setProfileType] = useState<ProfileType>(
    defaultType || "Subcontractor"
  );

  const [formDef, setFormDef] = useState<FormDefinition | null>(null);
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [values, setValues] = useState<Record<string, any>>({ status: "Active" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch Dynamic Form Schema configured in Form Management
  const loadSchema = useCallback(async (typeToLoad: ProfileType) => {
    const slug = getSlugForType(typeToLoad);
    setLoadingSchema(true);
    try {
      const schema = await formService.getFormBySlug(slug);
      if (schema && Array.isArray(schema.fields) && schema.fields.length > 0) {
        setFormDef(schema);
        const sorted = [...schema.fields]
          .filter((f) => !(f as any).disabled)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        setFields(sorted);
      } else {
        const fallback = FALLBACK_SCHEMAS[typeToLoad];
        setFormDef(fallback);
        setFields(fallback.fields);
      }
    } catch (e) {
      const fallback = FALLBACK_SCHEMAS[typeToLoad];
      setFormDef(fallback);
      setFields(fallback.fields);
    } finally {
      setLoadingSchema(false);
    }
  }, []);

  // 2. Load existing profile if editing
  const loadExistingProfile = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const p = await profileService.getProfileById(id);
      if (p) {
        setProfileType(p.profileType);
        await loadSchema(p.profileType);

        const initialVals: Record<string, any> = {
          name: p.name || "",
          code: p.code || "",
          contactPerson: p.contactPerson || "",
          contactDesignation: p.contactDesignation || "",
          contactPhone: p.contactPhone || "",
          alternatePhone: p.alternatePhone || "",
          contactEmail: p.contactEmail || "",
          address: p.address || "",
          gstNumber: p.gstNumber || "",
          panNumber: p.panNumber || "",
          aadhaarNumber: p.aadhaarNumber || "",
          licenseNumber: p.licenseNumber || "",
          status: p.status || "Active",
          ...(p.customFields || {}),
        };

        if (Array.isArray(p.keyPersonnel) && p.keyPersonnel.length > 0) {
          const k0 = p.keyPersonnel[0];
          if (!initialVals.contactPerson && k0.name) initialVals.contactPerson = k0.name;
          if (!initialVals.contactDesignation && k0.designation) initialVals.contactDesignation = k0.designation;
          if (!initialVals.contactPhone && k0.phone) initialVals.contactPhone = k0.phone;
          if (!initialVals.alternatePhone && k0.alternatePhone) initialVals.alternatePhone = k0.alternatePhone;
          if (!initialVals.contactEmail && k0.email) initialVals.contactEmail = k0.email;
        }

        setValues(initialVals);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load profile details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, loadSchema]);

  useEffect(() => {
    if (id) {
      loadExistingProfile();
    } else {
      loadSchema(profileType);
    }
  }, [id, loadExistingProfile, loadSchema, profileType]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (id) {
      await loadExistingProfile();
    } else {
      await loadSchema(profileType);
      setRefreshing(false);
    }
  };

  const handleProfileTypeChange = (newType: ProfileType) => {
    if (profileType === newType) return;
    setProfileType(newType);
    setErrors({});
    loadSchema(newType);
  };

  const handleChange = (fieldName: string, val: any) => {
    let formatted = val;
    if (fieldName === "code" || fieldName === "gstNumber" || fieldName === "panNumber") {
      formatted = typeof val === "string" ? val.toUpperCase() : val;
    } else if (fieldName.toLowerCase().includes("aadhaar")) {
      formatted = typeof val === "string" ? formatAadhaarNumber(val, values[fieldName] || "") : val;
    }

    setValues((prev) => ({ ...prev, [fieldName]: formatted }));

    if (errors[fieldName]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
    }
  };

  const handleSubmit = async () => {
    // 1. Validate required fields configured in the Form Definition
    const newErrors: Record<string, string> = {};
    fields.forEach((f) => {
      const isReq =
        Boolean(f.required) ||
        (Array.isArray(f.validations) &&
          f.validations.some((v: any) => v.type === "required"));

      const val = values[f.name];
      if (
        isReq &&
        (val === undefined || val === null || String(val).trim() === "")
      ) {
        const reqMessage =
          f.validations?.find((v: any) => v.type === "required")?.message ||
          `${f.label || f.name} is required`;
        newErrors[f.name] = reqMessage;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert(
        "Required Fields Missing",
        "Please fill in all mandatory fields configured in Form Management before submitting."
      );
      return;
    }

    try {
      setSaving(true);

      const standardKeys = new Set([
        "name",
        "code",
        "contactPerson",
        "contactDesignation",
        "contactPhone",
        "alternatePhone",
        "contactEmail",
        "address",
        "gstNumber",
        "panNumber",
        "aadhaarNumber",
        "licenseNumber",
        "status",
        "profileType",
      ]);

      // Collect any custom fields added via Form Management into customFields
      const customFields: Record<string, any> = {};
      Object.keys(values).forEach((k) => {
        if (!standardKeys.has(k) && values[k] !== undefined) {
          customFields[k] = values[k];
        }
      });

      const primaryContactName = values.contactPerson || values.name || "";
      const primaryPhone = values.contactPhone || "";
      const primaryEmail = values.contactEmail || "";
      const keyPersonnel = [
        {
          name: primaryContactName,
          designation: values.contactDesignation || "",
          phone: primaryPhone,
          alternatePhone: values.alternatePhone || "",
          email: primaryEmail,
        },
      ];

      const payload = {
        profileType,
        name: String(values.name || "").trim(),
        code: String(values.code || "").trim().toUpperCase(),
        contactPerson: String(values.contactPerson || "").trim(),
        contactDesignation: String(values.contactDesignation || "").trim(),
        contactPhone: String(values.contactPhone || "").trim(),
        alternatePhone: String(values.alternatePhone || "").trim(),
        contactEmail: String(values.contactEmail || "").trim(),
        keyPersonnel,
        address: String(values.address || "").trim(),
        gstNumber: String(values.gstNumber || "").trim().toUpperCase(),
        panNumber: String(values.panNumber || "").trim().toUpperCase(),
        aadhaarNumber: String(values.aadhaarNumber || "").trim(),
        licenseNumber: String(values.licenseNumber || "").trim(),
        status: values.status || "Active",
        customFields,
      };

      if (isEditing && id) {
        await profileService.updateProfile(id, payload);
        Alert.alert("Success", "Profile updated successfully.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        await profileService.createProfile(payload);
        Alert.alert("Success", "Profile registered successfully.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert(
        isEditing ? "Update Failed" : "Registration Failed",
        err?.response?.data?.message || err?.message || "Could not save profile record."
      );
    } finally {
      setSaving(false);
    }
  };

  const activeSlug = getSlugForType(profileType);

  return (
    <ScreenWrapper
      title={isEditing ? "Edit Profile" : "Register Profile"}
      subtitle={
        formDef?.name
          ? `${formDef.name} (${fields.length} Fields)`
          : `${profileType} Profile`
      }
      showBack
      requiredPage="/profiles"
    >
      {loading ? (
        <View style={{ padding: 40, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 12, fontWeight: "600" }}>
            Loading profile schema & details...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        >
          {/* Notice Banner */}
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "#EFF6FF",
              borderWidth: 1,
              borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : "#BFDBFE",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <ShieldCheck size={18} color="#3B82F6" />
            <Text
              style={{
                fontSize: 11,
                lineHeight: 16,
                color: isDark ? "#93C5FD" : "#1D4ED8",
                flex: 1,
              }}
            >
              <Text style={{ fontWeight: "bold" }}>Business Contact Profile:</Text> Fields are dynamically loaded from Form Management ({activeSlug}).
            </Text>
          </View>

          {/* Profile Type Selector (Only on new registration) */}
          <View
            style={{
              marginBottom: 14,
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark ? "#334155" : "#E2E8F0",
              padding: 14,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: isDark ? "#94A3B8" : "#475569",
                marginBottom: 10,
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
                    disabled={isEditing}
                    onPress={() => handleProfileTypeChange(t.value)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: "center",
                      borderRadius: 10,
                      backgroundColor: isSelected
                        ? theme.primary
                        : isDark
                        ? "#0F172A"
                        : "#F1F5F9",
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                      opacity: isEditing && !isSelected ? 0.4 : 1,
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

          {/* Form Management Schema Indicator Banner */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
              borderRadius: 14,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <SlidersHorizontal size={15} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: theme.text,
                  }}
                  numberOfLines={1}
                >
                  {formDef?.name || `${profileType} Form Schema`}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: theme.textSecondary,
                  }}
                  numberOfLines={1}
                >
                  {fields.length} {fields.length === 1 ? "field" : "fields"} configured in Form Management
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: isDark ? "#064E3B" : "#D1FAE5",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <CheckCircle2 size={11} color="#059669" />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: "#059669",
                  fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                }}
              >
                {activeSlug}
              </Text>
            </View>
          </View>

          {/* Loading Schema Indicator */}
          {loadingSchema ? (
            <View style={{ padding: 30, alignItems: "center" }}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>
                Loading {profileType} fields...
              </Text>
            </View>
          ) : (
            /* Dynamic Form Renderer - ONLY renders fields configured in Form Management */
            <DynamicFormRenderer
              fields={fields}
              values={values}
              errors={errors}
              onChange={handleChange}
              cardStyle={true}
            />
          )}

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => router.back()}
                disabled={saving}
              />
            </View>
            <View style={{ flex: 1.4 }}>
              <Button
                title={isEditing ? "Update Profile" : "Create Profile"}
                onPress={handleSubmit}
                loading={saving}
                variant="primary"
                icon={<Building2 size={16} color="#FFFFFF" />}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}
