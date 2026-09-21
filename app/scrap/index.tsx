import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Recycle, RotateCcw, Trash2, Calendar, DollarSign, Eye, ChevronRight } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toolService } from '@/features/tools/services/toolService';
import { ToolRecord } from '@/features/tools/types';
import { SearchBar } from '@/components/common/SearchBar';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ToolPreviewModal } from '@/features/tools/components/ToolPreviewModal';

export default function ScrapScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, isDark } = useAppTheme();

  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTool, setPreviewTool] = useState<ToolRecord | null>(null);

  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  const fetchScrappedTools = useCallback(async () => {
    try {
      setError(null);
      const res = await toolService.getScrappedTools({ search: searchQuery });
      setTools(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load scrapped tools.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchScrappedTools();
  }, [fetchScrappedTools]);

  const handleRestore = async (id: string) => {
    try {
      await toolService.restoreTool(id);
      Alert.alert('Success', 'Tool restored to active store catalog.');
      fetchScrappedTools();
    } catch (err: any) {
      Alert.alert('Restore Failed', err?.message || 'Could not restore tool.');
    }
  };

  return (
    <ScreenWrapper title="Scrap Register" showBack>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: theme.border }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search scrapped equipment by code, name..."
        />
      </View>

      {loading ? (
        <Loader fullScreen message="Loading scrap register..." />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={fetchScrappedTools} />
      ) : (
        <FlatList
          data={tools}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchScrappedTools();
              }}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 12, overflow: 'hidden' }}>
              <TouchableOpacity activeOpacity={0.75} onPress={() => setPreviewTool(item)} style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.text }}>
                      {item.name || item.description || 'Equipment'}
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: 'monospace', color: theme.textMuted, marginTop: 2 }}>
                      ID: {item.toolCode || item.toolId} • SN: {item.serialNumber || 'N/A'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626' }}>SCRAPPED</Text>
                  </View>
                </View>

                {/* Reason & Dealer Details */}
                <View style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', padding: 10, borderRadius: 10, marginVertical: 6, gap: 4 }}>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    Reason: <Text style={{ fontWeight: '700', color: theme.text }}>{item.scrapReason || 'Life Expired'}</Text>
                  </Text>
                  {item.scrappedAt && (
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Date: <Text style={{ fontWeight: '600', color: theme.text }}>{new Date(item.scrappedAt).toLocaleDateString()}</Text>
                    </Text>
                  )}
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderColor: theme.border, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Eye size={12} color={theme.textMuted} />
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>Quick View</Text>
                  </View>

                  {canManage && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleRestore(item._id)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                    >
                      <RotateCcw size={12} color={theme.primary} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>Restore</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Scrapped Tools"
              description="No tools have been retired to the scrap register."
            />
          }
        />
      )}

      <ToolPreviewModal
        visible={!!previewTool}
        tool={previewTool}
        onClose={() => setPreviewTool(null)}
        onViewFullDetails={() => {
          if (previewTool) router.push(`/tools/${previewTool._id}` as any);
        }}
      />
    </ScreenWrapper>
  );
}
