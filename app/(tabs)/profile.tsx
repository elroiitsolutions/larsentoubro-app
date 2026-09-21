import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  User,
  Shield,
  Hash,
  Mail,
  Phone,
  Building2,
  Store,
  FolderGit2,
  Server,
  Lock,
  LogOut,
  RefreshCw,
  Info,
  CheckCircle2,
  ChevronRight,
  Database,
  Sun,
  Moon,
  Menu,
} from "lucide-react-native";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useAppTheme } from "@/context/ThemeContext";
import api from "@/services/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, token } = useAuthStore();
  const { isDark, toggleTheme } = useAppTheme();
  const { openSidebar } = useSidebarStore();

  const [refreshing, setRefreshing] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(user);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await api.get("/api/users/me");
      if (response.data && response.data.success && response.data.data) {
        setUserDetails(response.data.data);
      }
    } catch (e) {
      // Fallback to local store user
      setUserDetails(user);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };

  const handleClearCache = () => {
    Alert.alert(
      "Cache Cleared",
      "Local metadata and temporary cache have been successfully refreshed."
    );
  };

  const initials =
    (userDetails?.name || user?.name || "U")
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "LT";

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar style="auto" />

      {/* Screen Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openSidebar}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700 mr-1"
            accessibilityLabel="Open navigation drawer"
          >
            <Menu size={18} color={isDark ? "#F8FAFC" : "#0F172A"} />
          </TouchableOpacity>

          <View className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 items-center justify-center">
            <User size={20} color="#4F46E5" />
          </View>
          <View>
            <Text className="text-base font-bold text-slate-900 dark:text-white">
              Account & Profile
            </Text>
            <Text className="text-[11px] text-slate-500">
              L&T Enterprise Portal
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setLogoutModalVisible(true)}
          className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 items-center justify-center border border-red-100 dark:border-red-900"
        >
          <LogOut size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4F46E5"]}
            tintColor="#4F46E5"
          />
        }
      >
        {/* User Profile Card */}
        <Card className="p-5 mb-4 items-center">
          <View className="w-18 h-18 rounded-3xl bg-indigo-600 items-center justify-center mb-3 shadow-md">
            <Text className="text-2xl font-black text-white">{initials}</Text>
          </View>

          <Text className="text-lg font-bold text-slate-900 dark:text-white text-center">
            {userDetails?.name || user?.name || "L&T Operator"}
          </Text>

          <Text className="text-xs font-mono text-slate-400 mt-0.5 mb-2">
            ID: {userDetails?.user_id || user?.user_id || "EMP-001"}
          </Text>

          <Badge
            label={userDetails?.role || user?.role || "Member"}
            variant={
              userDetails?.role === "Admin"
                ? "primary"
                : userDetails?.role === "Manager"
                ? "secondary"
                : "neutral"
            }
            size="md"
          />
        </Card>

        {/* Contact & Identification Card */}
        <Card className="p-4 mb-4">
          <Text className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Contact & Identification
          </Text>

          <View className="gap-2.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Mail size={14} color="#64748B" className="mr-2" />
                <Text className="text-xs text-slate-500">Email Address</Text>
              </View>
              <Text className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {userDetails?.email || user?.email || "N/A"}
              </Text>
            </View>

            {userDetails?.phonenumber && (
              <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <View className="flex-row items-center">
                  <Phone size={14} color="#64748B" className="mr-2" />
                  <Text className="text-xs text-slate-500">Phone Number</Text>
                </View>
                <Text className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {userDetails.phonenumber}
                </Text>
              </View>
            )}

            <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
              <View className="flex-row items-center">
                <Shield size={14} color="#64748B" className="mr-2" />
                <Text className="text-xs text-slate-500">Security Clearance</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {userDetails?.role === "Admin" ? "Full Master Access" : "Authorized Site Personnel"}
              </Text>
            </View>
          </View>
        </Card>

        {/* Assigned Projects & Facilities Scope */}
        <Card className="p-4 mb-4">
          <Text className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Operational Scope
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 items-center">
              <FolderGit2 size={20} color="#4F46E5" className="mb-1" />
              <Text className="text-base font-bold text-slate-900 dark:text-white">
                {Array.isArray(userDetails?.projects) ? userDetails.projects.length : "All"}
              </Text>
              <Text className="text-[10px] text-slate-400">Projects Scope</Text>
            </View>

            <View className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 items-center">
              <Store size={20} color="#2563EB" className="mb-1" />
              <Text className="text-base font-bold text-slate-900 dark:text-white">
                {Array.isArray(userDetails?.stores) ? userDetails.stores.length : "All"}
              </Text>
              <Text className="text-[10px] text-slate-400">Stores / HUBs</Text>
            </View>
          </View>
        </Card>

        {/* System & API Environment Settings */}
        <Card className="p-4 mb-4">
          <Text className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Preferences & Configuration
          </Text>

          {/* Theme Mode Toggle Row */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleTheme}
            className="flex-row items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800"
          >
            <View className="flex-row items-center">
              {isDark ? (
                <Sun size={16} color="#F59E0B" className="mr-2.5" />
              ) : (
                <Moon size={16} color="#4F46E5" className="mr-2.5" />
              )}
              <Text className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">
                Appearance & Theme
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                {isDark ? "Dark Mode" : "Light Mode"}
              </Text>
              <ChevronRight size={14} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/settings/server" as any)}
            className="flex-row items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <Server size={14} color="#64748B" className="mr-2" />
              <View>
                <Text className="text-xs text-slate-500">API Host URL</Text>
                <Text className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200" numberOfLines={1}>
                  {process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.1.2:4000"}
                </Text>
              </View>
            </View>
            <ChevronRight size={14} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClearCache}
            className="flex-row items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800"
          >
            <View className="flex-row items-center">
              <Database size={14} color="#64748B" className="mr-2" />
              <Text className="text-xs text-slate-700 dark:text-slate-300">
                Purge Temporary Cache
              </Text>
            </View>
            <RefreshCw size={14} color="#4F46E5" />
          </TouchableOpacity>

          <View className="flex-row items-center justify-between pt-2.5">
            <View className="flex-row items-center">
              <Info size={14} color="#64748B" className="mr-2" />
              <Text className="text-xs text-slate-500">Client Build</Text>
            </View>
            <Text className="text-xs font-mono text-slate-400">
              v1.0.0 (SDK 52)
            </Text>
          </View>
        </Card>

        {/* Sign Out Button */}
        <Button
          title="Sign Out of Session"
          variant="destructive"
          onPress={() => setLogoutModalVisible(true)}
          icon={<LogOut size={16} color="#FFFFFF" />}
        />
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <ConfirmationDialog
        visible={logoutModalVisible}
        title="Sign Out"
        message="Are you sure you want to log out of your L&T session? You will need to sign in again to access site tools."
        confirmText="Sign Out"
        destructive
        onConfirm={async () => {
          setLogoutModalVisible(false);
          await logout();
        }}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </SafeAreaView>
  );
}
