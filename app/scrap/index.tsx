import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Recycle,
  RotateCcw,
  Calendar,
  Eye,
  CheckSquare,
  Square,
  Truck,
  X,
  Building2,
  Store as StoreIcon,
  Clock,
  ShieldAlert,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toolService } from '@/features/tools/services/toolService';
import { ToolRecord } from '@/features/tools/types';
import { SearchBar } from '@/components/common/SearchBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ToolPreviewModal } from '@/features/tools/components/ToolPreviewModal';

type DisposalStatusTab = 'pending' | 'disposed' | 'all';

export default function ScrapScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, isDark } = useAppTheme();

  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [disposalStatus, setDisposalStatus] = useState<DisposalStatusTab>('pending');
  const [previewTool, setPreviewTool] = useState<ToolRecord | null>(null);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  const fetchScrappedTools = useCallback(async () => {
    try {
      setError(null);
      const res = await toolService.getScrappedTools({
        search: searchQuery.trim(),
        disposalStatus,
        limit: 100,
      });
      setTools(res.data || []);
      // Clear selections that are no longer visible or selectable
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load scrapped tools.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, disposalStatus]);

  useEffect(() => {
    fetchScrappedTools();
  }, [fetchScrappedTools]);

  useFocusEffect(
    useCallback(() => {
      fetchScrappedTools();
    }, [fetchScrappedTools])
  );

  const toggleSelect = (id: string, isDisposed?: boolean) => {
    if (isDisposed) {
      Alert.alert('Notice', 'This equipment has already been disposed via a Delivery Challan.');
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectableTools = useMemo(
    () => tools.filter((t) => !t.isDisposed),
    [tools]
  );

  const isAllSelected =
    selectableTools.length > 0 && selectableTools.every((t) => selectedIds.has(t._id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableTools.map((t) => t._id)));
    }
  };

  const handleSingleRestore = (tool: ToolRecord) => {
    if (tool.isDisposed) {
      Alert.alert('Restricted', 'Cannot restore a tool that has already been disposed.');
      return;
    }

    Alert.alert(
      'Confirm Restore',
      `Are you sure you want to restore ${tool.toolId || tool.toolCode || 'this tool'} back to active store inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              setActionLoading(true);
              await toolService.restoreTool(tool._id);
              Alert.alert('Success', 'Tool restored to active store catalog.');
              fetchScrappedTools();
            } catch (err: any) {
              Alert.alert('Restore Failed', err?.response?.data?.message || err?.message || 'Could not restore tool.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBulkRestore = () => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      'Confirm Bulk Restore',
      `Are you sure you want to restore ${selectedIds.size} selected tool(s) back to active store catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Restore (${selectedIds.size})`,
          onPress: async () => {
            try {
              setActionLoading(true);
              await toolService.bulkRestoreTools(Array.from(selectedIds));
              Alert.alert('Success', `${selectedIds.size} tool(s) successfully restored.`);
              fetchScrappedTools();
            } catch (err: any) {
              Alert.alert('Restore Failed', err?.response?.data?.message || err?.message || 'Bulk restore failed.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleGenerateScrapDC = (singleToolId?: string) => {
    const idsToDispatch = singleToolId ? [singleToolId] : Array.from(selectedIds);
    if (idsToDispatch.length === 0) return;

    // Find the store ID of the first tool to pre-fill
    const targetTool = tools.find((t) => idsToDispatch.includes(t._id));
    const storeId =
      targetTool?.currentSite?._id ||
      targetTool?.store?._id ||
      targetTool?.storeId ||
      '';

    router.push({
      pathname: '/challans/new',
      params: {
        isScrap: 'true',
        toolIds: idsToDispatch.join(','),
        storeId,
        selectedCount: idsToDispatch.length,
      },
    } as any);
  };

  return (
    <ScreenWrapper title="Scrap Disposal Register" showBack requiredPage="/scrap">
      {/* Disposal Status Segmented Tabs */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
            borderColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setDisposalStatus('pending')}
          style={[
            styles.tabItem,
            disposalStatus === 'pending' && [
              styles.tabItemActive,
              { backgroundColor: theme.surface },
            ],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: disposalStatus === 'pending' ? theme.primary : theme.textSecondary,
                fontWeight: disposalStatus === 'pending' ? '700' : '500',
              },
            ]}
          >
            Pending Disposal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setDisposalStatus('disposed')}
          style={[
            styles.tabItem,
            disposalStatus === 'disposed' && [
              styles.tabItemActive,
              { backgroundColor: theme.surface },
            ],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: disposalStatus === 'disposed' ? theme.primary : theme.textSecondary,
                fontWeight: disposalStatus === 'disposed' ? '700' : '500',
              },
            ]}
          >
            Disposed via DC
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setDisposalStatus('all')}
          style={[
            styles.tabItem,
            disposalStatus === 'all' && [
              styles.tabItemActive,
              { backgroundColor: theme.surface },
            ],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: disposalStatus === 'all' ? theme.primary : theme.textSecondary,
                fontWeight: disposalStatus === 'all' ? '700' : '500',
              },
            ]}
          >
            All Items
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search scrap equipment by ID, description..."
        />
      </View>

      {/* Select All Sub-header for Selectable Items */}
      {disposalStatus !== 'disposed' && selectableTools.length > 0 && (
        <View
          style={[
            styles.selectHeader,
            {
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleToggleSelectAll}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            {isAllSelected ? (
              <CheckSquare size={18} color={theme.primary} />
            ) : (
              <Square size={18} color="#94A3B8" />
            )}
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>
              {isAllSelected ? 'Deselect All' : `Select All (${selectableTools.length})`}
            </Text>
          </TouchableOpacity>

          {selectedIds.size > 0 && (
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>
              {selectedIds.size} Selected
            </Text>
          )}
        </View>
      )}

      {loading ? (
        <Loader fullScreen message="Loading scrap register..." />
      ) : error ? (
        <ErrorState title="Error Loading Scrap" message={error} onRetry={fetchScrappedTools} />
      ) : (
        <FlatList
          data={tools}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: selectedIds.size > 0 ? 120 : 60,
          }}
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
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item._id);
            const isDisposed = Boolean(item.isDisposed);
            const dateStr = item.scrappedAt
              ? new Date(item.scrappedAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '-';

            return (
              <Card style={{ marginBottom: 12, overflow: 'hidden' }}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setPreviewTool(item)}
                  style={{ padding: 14 }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      {/* Checkbox (only for non-disposed tools) */}
                      {!isDisposed ? (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => toggleSelect(item._id, isDisposed)}
                          style={{ marginRight: 10, marginTop: 2 }}
                        >
                          {isSelected ? (
                            <CheckSquare size={20} color={theme.primary} />
                          ) : (
                            <Square size={20} color="#94A3B8" />
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={{ marginRight: 10, marginTop: 2 }}>
                          <ShieldAlert size={18} color="#94A3B8" />
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: 'bold',
                            color: theme.text,
                          }}
                          numberOfLines={1}
                        >
                          {item.name || item.description || 'Industrial Equipment'}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: 'monospace',
                            color: theme.textSecondary,
                            marginTop: 2,
                          }}
                        >
                          ID: {item.toolId || item.toolCode || item._id.substring(item._id.length - 6).toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    {isDisposed ? (
                      <View
                        style={{
                          backgroundColor: isDark ? '#334155' : '#E2E8F0',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: isDark ? '#CBD5E1' : '#475569',
                          }}
                        >
                          DISPOSED
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: 'rgba(239, 68, 68, 0.25)',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: '#DC2626',
                          }}
                        >
                          PENDING DISPOSAL
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Metadata Specs Box */}
                  <View
                    style={{
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      padding: 10,
                      borderRadius: 10,
                      marginVertical: 6,
                      borderWidth: 1,
                      borderColor: theme.border,
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Reason:{' '}
                      <Text style={{ fontWeight: '700', color: theme.text }}>
                        {item.scrapReason || 'Life Expired / Inspection Fail'}
                      </Text>
                    </Text>

                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                        Scrapped Date:{' '}
                        <Text style={{ fontWeight: '600', color: theme.text }}>
                          {dateStr}
                        </Text>
                      </Text>

                      {item.scrapValue ? (
                        <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>
                          Value: ₹{Number(item.scrapValue).toLocaleString()}
                        </Text>
                      ) : null}
                    </View>

                    {item.currentSite && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 2,
                        }}
                      >
                        <StoreIcon size={12} color="#64748B" />
                        <Text
                          style={{ fontSize: 11, color: theme.textSecondary }}
                          numberOfLines={1}
                        >
                          Store: {item.currentSite?.name || 'Assigned Store'}
                        </Text>
                      </View>
                    )}

                    {isDisposed && (item as any).disposalChallanId && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 2,
                          paddingTop: 4,
                          borderTopWidth: 1,
                          borderColor: theme.border,
                        }}
                      >
                        <Truck size={12} color="#4F46E5" />
                        <Text style={{ fontSize: 11, color: '#4F46E5', fontWeight: '700' }}>
                          Disposed DC:{' '}
                          {(item as any).disposalChallanId?.challanNumber ||
                            String((item as any).disposalChallanId)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Card Bottom Actions */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderColor: theme.border,
                      marginTop: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Eye size={12} color="#64748B" />
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                        Tap for Details
                      </Text>
                    </View>

                    {!isDisposed && canManage && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleSingleRestore(item)}
                          style={[
                            styles.smallActionBtn,
                            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                          ]}
                        >
                          <RotateCcw size={12} color={theme.primary} />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: theme.primary,
                            }}
                          >
                            Restore
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleGenerateScrapDC(item._id)}
                          style={[styles.smallActionBtn, { backgroundColor: '#ECFDF5' }]}
                        >
                          <Truck size={12} color="#059669" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#047857' }}>
                            Scrap DC
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </Card>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="No Scrap Records"
              description={
                disposalStatus === 'pending'
                  ? 'No scrapped tools are currently pending disposal.'
                  : disposalStatus === 'disposed'
                  ? 'No scrapped tools have been disposed via Delivery Challans yet.'
                  : 'No tools found in the scrap register.'
              }
            />
          }
        />
      )}

      {/* Floating Multi-Selection Action Bar */}
      {selectedIds.size > 0 && (
        <SafeAreaView
          edges={['bottom']}
          style={[
            styles.floatingBar,
            { backgroundColor: isDark ? '#0F172A' : '#1E293B' },
          ]}
        >
          <View style={styles.floatingBarHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>{selectedIds.size} Selected</Text>
              </View>
              <TouchableOpacity onPress={handleToggleSelectAll}>
                <Text style={{ fontSize: 12, color: '#818CF8', fontWeight: '600' }}>
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setSelectedIds(new Set())} style={{ padding: 4 }}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            {canManage && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleBulkRestore}
                disabled={actionLoading}
                style={[styles.barButton, { backgroundColor: '#334155' }]}
              >
                <RotateCcw size={14} color="#FFFFFF" />
                <Text style={styles.barButtonText}>Bulk Restore</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleGenerateScrapDC()}
              disabled={actionLoading}
              style={[
                styles.barButton,
                { backgroundColor: '#059669', flex: 1.4 },
              ]}
            >
              <Truck size={14} color="#FFFFFF" />
              <Text style={styles.barButtonText}>
                Generate Scrap DC ({selectedIds.size})
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    ...Platform.select({
      web: {
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
  },
  tabText: {
    fontSize: 12,
  },
  selectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  floatingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: '#334155',
    ...Platform.select({
      web: {
        boxShadow: '0 -4px 8px rgba(0,0,0,0.25)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
      },
    }),
  },
  floatingBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  barButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  barButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
