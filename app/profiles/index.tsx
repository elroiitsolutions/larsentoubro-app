import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  Users,
  Plus,
  Phone,
  Mail,
  Building2,
  FileText,
  Edit2,
  Trash2,
  MapPin,
  Recycle,
  Truck,
} from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuthStore } from "@/features/auth/store/authStore";
import { profileService } from "@/features/profiles/services/profileService";
import { ProfileRecord, ProfileType } from "@/features/profiles/types";
import { SearchBar } from "@/components/common/SearchBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Card } from "@/components/ui/Card";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const TABS: { label: string; type: ProfileType; icon: any }[] = [
  { label: "Subcontractors", type: "Subcontractor", icon: Building2 },
  { label: "Scrap Dealers", type: "ScrapDealer", icon: Recycle },
  { label: "Suppliers", type: "Supplier", icon: Truck },
];

export default function ProfilesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, isDark } = useAppTheme();

  const [activeTab, setActiveTab] = useState<ProfileType>("Subcontractor");
  const [searchQuery, setSearchQuery] = useState("");
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deletingProfile, setDeletingProfile] = useState<ProfileRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canManage = user?.role === "Admin" || user?.role === "Manager";

  const fetchProfiles = useCallback(async () => {
    try {
      setError(null);
      const data = await profileService.getProfiles(activeTab, searchQuery);
      setProfiles(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load profiles directory."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    setLoading(true);
    fetchProfiles();
  }, [fetchProfiles]);

  useFocusEffect(
    useCallback(() => {
      fetchProfiles();
    }, [fetchProfiles])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfiles();
  };

  const handleDelete = async () => {
    if (!deletingProfile) return;
    try {
      setDeleteLoading(true);
      await profileService.deleteProfile(deletingProfile._id);
      setProfiles((prev) => prev.filter((p) => p._id !== deletingProfile._id));
      setDeletingProfile(null);
      Alert.alert("Success", "Profile deleted successfully.");
    } catch (err: any) {
      Alert.alert(
        "Delete Failed",
        err?.response?.data?.message || err?.message || "Could not delete profile."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <ScreenWrapper
      title="Profiles Directory"
      showBack
      rightAction={
        canManage ? (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() =>
              router.push({
                pathname: "/profiles/form",
                params: { defaultType: activeTab },
              } as any)
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: theme.primary,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 12,
            }}
          >
            <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{ fontSize: 12, fontWeight: "bold", color: "#FFFFFF" }}>
              Add
            </Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      {/* Category Tabs */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: isDark ? "#111827" : "#FFFFFF",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderColor: theme.border,
          gap: 6,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.type;
          const IconComp = tab.icon;
          return (
            <TouchableOpacity
              key={tab.type}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.type)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 9,
                borderRadius: 12,
                backgroundColor: isActive ? theme.primary : isDark ? "#1E293B" : "#F1F5F9",
                borderWidth: 1,
                borderColor: isActive ? theme.primary : theme.border,
                gap: 6,
              }}
            >
              <IconComp
                size={14}
                color={isActive ? "#FFFFFF" : theme.textSecondary}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? "700" : "600",
                  color: isActive ? "#FFFFFF" : theme.text,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: isDark ? "#111827" : "#FFFFFF",
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search ${activeTab}s by name, code, contact...`}
        />
      </View>

      {/* Profile List */}
      {loading ? (
        <Loader fullScreen message="Loading profiles..." />
      ) : error ? (
        <ErrorState
          title="Failed to Load Profiles"
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchProfiles();
          }}
        />
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 12, overflow: "hidden" }}>
              <View style={{ padding: 14 }}>
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={{ fontSize: 16, fontWeight: "bold", color: theme.text }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: theme.textMuted,
                        marginTop: 2,
                      }}
                    >
                      Code: {item.code}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>

                {/* Contact Information */}
                {(item.contactPerson || item.contactPhone || item.contactEmail) && (
                  <View
                    style={{
                      backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                      borderRadius: 10,
                      padding: 10,
                      marginVertical: 6,
                      gap: 4,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    {item.contactPerson && (
                      <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text }}>
                        Contact: {item.contactPerson} {item.contactDesignation ? `(${item.contactDesignation})` : ""}
                      </Text>
                    )}

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 2 }}>
                      {item.contactPhone && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => Linking.openURL(`tel:${item.contactPhone}`)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                        >
                          <Phone size={12} color={theme.primary} />
                          <Text style={{ fontSize: 11, color: theme.primary, fontWeight: "600" }}>
                            {item.contactPhone}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {item.contactEmail && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => Linking.openURL(`mailto:${item.contactEmail}`)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                        >
                          <Mail size={12} color={theme.primary} />
                          <Text style={{ fontSize: 11, color: theme.primary, fontWeight: "600" }}>
                            {item.contactEmail}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Tax & Identifiers */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 4 }}>
                  {item.gstNumber && (
                    <View
                      style={{
                        backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                        GSTIN: {item.gstNumber}
                      </Text>
                    </View>
                  )}

                  {item.panNumber && (
                    <View
                      style={{
                        backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                        PAN: {item.panNumber}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Footer */}
                {canManage && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderColor: theme.border,
                      marginTop: 6,
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() =>
                        router.push({
                          pathname: "/profiles/form",
                          params: { id: item._id },
                        } as any)
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                      }}
                    >
                      <Edit2 size={12} color={theme.textSecondary} />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: theme.text }}>
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setDeletingProfile(item)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: theme.dangerLight,
                      }}
                    >
                      <Trash2 size={12} color={theme.danger} />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: theme.danger }}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              title={`No ${activeTab}s Found`}
              description={
                searchQuery
                  ? "No profiles match your search."
                  : `No ${activeTab} profiles have been registered yet.`
              }
              actionTitle={canManage ? `Register ${activeTab}` : undefined}
              onAction={
                canManage
                  ? () =>
                      router.push({
                        pathname: "/profiles/form",
                        params: { defaultType: activeTab },
                      } as any)
                  : undefined
              }
            />
          }
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        visible={!!deletingProfile}
        title="Delete Profile"
        message={`Are you sure you want to delete profile "${deletingProfile?.name}"?`}
        confirmText="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeletingProfile(null)}
      />
    </ScreenWrapper>
  );
}
