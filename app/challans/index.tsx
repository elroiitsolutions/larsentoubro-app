import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Truck, Plus } from "lucide-react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useAppTheme } from "@/context/ThemeContext";
import { challanService } from "@/features/challans/services/challanService";
import { ChallanRecord } from "@/features/challans/types";
import { ChallanCard } from "@/features/challans/components/ChallanCard";
import { SearchBar } from "@/components/common/SearchBar";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAuthStore } from "@/features/auth/store/authStore";

export default function ChallanHistoryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme } = useAppTheme();

  const [challans, setChallans] = useState<ChallanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const canCreate =
    user?.role === "Admin" || user?.role === "Manager" || user?.role === "Engineer";

  const fetchChallans = useCallback(async () => {
    try {
      setError(null);
      const data = await challanService.getChallans();
      setChallans(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load challans log."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChallans();
  }, [fetchChallans]);

  useFocusEffect(
    useCallback(() => {
      fetchChallans();
    }, [fetchChallans])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchChallans();
  };

  const typeOptions = [
    { key: "All", label: "All" },
    { key: "Delivery", label: "Delivery" },
    { key: "Return", label: "Return" },
    { key: "Transfer", label: "Store Transfer" },
    { key: "Scrap", label: "Scrap" },
  ];

  const filteredChallans = useMemo(() => {
    return challans.filter((c) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        c.challanNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.storeName?.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesType = true;
      if (typeFilter === "Delivery") {
        matchesType =
          !c.isScrapDC &&
          (c.challanType?.toLowerCase() === "delivery" ||
            c.type?.toLowerCase() === "delivery" ||
            (!c.challanType && c.challanNumber?.toLowerCase().startsWith("dc")));
      } else if (typeFilter === "Return") {
        matchesType =
          c.challanType?.toLowerCase() === "return" ||
          c.type?.toLowerCase() === "return" ||
          c.challanNumber?.toLowerCase().startsWith("rc");
      } else if (typeFilter === "Transfer") {
        matchesType =
          c.challanType?.toLowerCase() === "transfer" ||
          c.type?.toLowerCase() === "transfer" ||
          c.challanNumber?.toLowerCase().startsWith("stc") ||
          c.challanNumber?.toLowerCase().startsWith("tc");
      } else if (typeFilter === "Scrap") {
        matchesType =
          c.challanType?.toLowerCase() === "scrap" ||
          c.type?.toLowerCase() === "scrap" ||
          c.isScrapDC === true ||
          c.challanNumber?.toLowerCase().startsWith("sdc") ||
          c.challanNumber?.toLowerCase().startsWith("sc");
      }

      return matchesSearch && matchesType;
    });
  }, [challans, searchQuery, typeFilter]);

  return (
    <ScreenWrapper
      title="Challan Register"
      subtitle={`${challans.length} Movement Records`}
      showBackButton={true}
      requiredPage="/challans"
    >
      {/* Search Bar & Filter Chips */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by challan #, vendor, project..."
          style={{ marginBottom: 10 }}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row", gap: 8, paddingRight: 16 }}
        >
          {typeOptions.map((t) => {
            const isSelected = typeFilter === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                activeOpacity={0.7}
                onPress={() => setTypeFilter(t.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: isSelected ? theme.primary : theme.isDark ? "#1E293B" : "#F1F5F9",
                  borderWidth: 1,
                  borderColor: isSelected ? theme.primary : theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: isSelected ? "#FFFFFF" : theme.textSecondary,
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Challans List */}
      {loading ? (
        <Loader fullScreen message="Loading challans registry..." />
      ) : error ? (
        <ErrorState
          title="Failed to Load Challans"
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchChallans();
          }}
        />
      ) : (
        <FlatList
          data={filteredChallans}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
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
            <ChallanCard
              challan={item}
              onPress={() => router.push(`/challans/${item._id}` as any)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Challans Found"
              description={
                searchQuery || typeFilter !== "All"
                  ? "No challan records match your query."
                  : "No delivery or return challans registered yet."
              }
              actionTitle={
                searchQuery || typeFilter !== "All" ? "Clear Filters" : undefined
              }
              onAction={() => {
                setSearchQuery("");
                setTypeFilter("All");
              }}
            />
          }
        />
      )}
    </ScreenWrapper>
  );
}
