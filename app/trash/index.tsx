import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckSquare,
  Square,
  Check,
  ShieldAlert,
  Clock,
  Layers,
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

export default function TrashScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, isDark } = useAppTheme();

  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = user?.role === 'Admin';

  const cleanToolId = (id?: string) => {
    if (!id) return '';
    return id.replace(/^__TRASHED_[^_]+_/, '').replace(/^__RESTORE_TEMP_[^_]+_/, '');
  };

  const fetchTrash = useCallback(async () => {
    try {
      setError(null);
      const res = await toolService.getDeletedTools({ search: searchQuery.trim(), limit: 100 });
      setTools(res.data || []);
      // Reset selected ids that are no longer in tools
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load trash archives.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  // Selection handlers
  const toggleSelect = (id: string) => {
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

  const isAllSelected = useMemo(() => {
    return tools.length > 0 && selectedIds.size === tools.length;
  }, [tools, selectedIds]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tools.map((t) => t._id)));
    }
  };

  // Single Item Actions
  const handleRestore = async (id: string, name?: string) => {
    try {
      setActionLoading(true);
      await toolService.restoreTool(id);
      Alert.alert('Restored', `"${name || 'Tool'}" has been restored to the active catalog.`);
      fetchTrash();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to restore tool.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = (id: string, name?: string) => {
    Alert.alert(
      'Permanent Deletion',
      `Are you sure you want to permanently delete "${name || 'this equipment'}"? This record and its entire history CANNOT be recovered.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await toolService.permanentDeleteTool(id);
              Alert.alert('Deleted', 'Tool permanently deleted from database.');
              fetchTrash();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || err?.message || 'Permanent deletion failed.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Bulk Actions
  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;

    Alert.alert(
      'Bulk Restore',
      `Restore ${count} selected ${count === 1 ? 'equipment' : 'equipments'} back to the active catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Restore (${count})`,
          onPress: async () => {
            try {
              setActionLoading(true);
              const res = await toolService.bulkRestoreTools(Array.from(selectedIds));
              Alert.alert('Success', res?.message || `${count} tools restored successfully.`);
              setSelectedIds(new Set());
              fetchTrash();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || err?.message || 'Bulk restore failed.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBulkPermanentDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;

    Alert.alert(
      'Permanent Bulk Deletion',
      `CRITICAL WARNING: Are you sure you want to PERMANENTLY delete ${count} selected ${count === 1 ? 'equipment' : 'equipments'
      }? This action is irreversible.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Delete Forever (${count})`,
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const res = await toolService.bulkPermanentDeleteTools(Array.from(selectedIds));
              Alert.alert('Deleted', res?.message || `${count} tools permanently deleted.`);
              setSelectedIds(new Set());
              fetchTrash();
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.message || err?.message || 'Bulk permanent deletion failed.'
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper
      title="Trash & Archive Register"
      subtitle="Soft-deleted equipment awaiting restoration or disposal"
      showBack
      requiredPage="/trash"
    >
      {/* Search Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: theme.border,
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
        }}
      >
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search deleted tools by ID, code, serial..."
        />
      </View>

      {/* Bulk Selection Bar */}
      {tools.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderBottomWidth: 1,
            borderColor: theme.border,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSelectAll}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            {isAllSelected ? (
              <CheckSquare size={18} color={theme.primary} />
            ) : (
              <Square size={18} color={theme.textMuted} />
            )}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>
              {isAllSelected ? 'Deselect All' : 'Select All'} ({tools.length})
            </Text>
          </TouchableOpacity>

          {selectedIds.size > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  backgroundColor: theme.primaryLight,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary }}>
                  {selectedIds.size} Selected
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedIds(new Set())}
                style={{ paddingHorizontal: 6, paddingVertical: 2 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textMuted }}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Main Content */}
      {loading ? (
        <Loader fullScreen message="Retrieving trash archive..." />
      ) : error ? (
        <ErrorState title="Failed to Load Archive" message={error} onRetry={fetchTrash} />
      ) : (
        <FlatList
          data={tools}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: selectedIds.size > 0 ? 110 : 60,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchTrash();
              }}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item._id);
            const displayCode = cleanToolId(item.toolId || item.toolCode) || item._id;

            return (
              <Card
                style={{
                  marginBottom: 12,
                  overflow: 'hidden',
                  borderColor: isSelected ? theme.primary : theme.border,
                  borderWidth: isSelected ? 1.5 : 1,
                  backgroundColor: isSelected
                    ? isDark
                      ? 'rgba(79, 70, 229, 0.08)'
                      : '#EEF2FF'
                    : isDark
                      ? '#1E293B'
                      : '#FFFFFF',
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => toggleSelect(item._id)}
                  style={{ padding: 14 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    {/* Checkbox */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleSelect(item._id)}
                      style={{ marginTop: 2 }}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} color={theme.primary} />
                      ) : (
                        <Square size={20} color={theme.textMuted} />
                      )}
                    </TouchableOpacity>

                    {/* Information */}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: theme.text,
                            flex: 1,
                            marginRight: 8,
                          }}
                          numberOfLines={1}
                        >
                          {item.name || item.description || 'Archived Tool'}
                        </Text>
                        <View
                          style={{
                            backgroundColor: isDark ? '#3E1010' : '#FEE2E2',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '800',
                              color: '#DC2626',
                              letterSpacing: 0.5,
                            }}
                          >
                            TRASHED
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                          color: theme.primary,
                          fontWeight: '700',
                          marginBottom: 4,
                        }}
                      >
                        ID: {displayCode}
                      </Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                          SN: {item.serialNumber || 'N/A'}
                        </Text>
                        {item.category && (
                          <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                            • {item.category}
                          </Text>
                        )}
                        {item.currentSite?.name && (
                          <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                            • Site: {item.currentSite.name}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Individual Action Buttons */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 8,
                      paddingTop: 10,
                      marginTop: 10,
                      borderTopWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={actionLoading}
                      onPress={() => handleRestore(item._id, item.name)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: theme.border,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <RotateCcw size={13} color={theme.primary} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>
                        Restore
                      </Text>
                    </TouchableOpacity>

                    {isAdmin && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        disabled={actionLoading}
                        onPress={() => handlePermanentDelete(item._id, item.name)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: isDark ? '#3E1010' : '#FEE2E2',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                      >
                        <Trash2 size={13} color="#DC2626" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                          Delete Forever
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              </Card>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="Trash Archive is Empty"
              description="No deleted equipment or tools are currently archived."
            />
          }
        />
      )}

      {/* Floating Batch Actions Dock */}
      {selectedIds.size > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderTopWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Button
              title={`Restore (${selectedIds.size})`}
              onPress={handleBulkRestore}
              loading={actionLoading}
              variant="primary"
              size="md"
              icon={<RotateCcw size={16} color="#FFFFFF" />}
            />
          </View>

          {isAdmin && (
            <View style={{ flex: 1 }}>
              <Button
                title={`Delete Forever (${selectedIds.size})`}
                onPress={handleBulkPermanentDelete}
                loading={actionLoading}
                variant="destructive"
                size="md"
                icon={<Trash2 size={16} color="#FFFFFF" />}
              />
            </View>
          )}
        </View>
      )}
    </ScreenWrapper>
  );
}
