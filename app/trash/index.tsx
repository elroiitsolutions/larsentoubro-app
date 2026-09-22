import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react-native';
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

export default function TrashScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, isDark } = useAppTheme();

  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = user?.role === 'Admin';

  const fetchTrash = useCallback(async () => {
    try {
      setError(null);
      const res = await toolService.getDeletedTools({ search: searchQuery });
      setTools(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load trash archives.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (id: string) => {
    try {
      await toolService.restoreTool(id);
      Alert.alert('Success', 'Tool restored to active catalog.');
      fetchTrash();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to restore tool.');
    }
  };

  const handlePermanentDelete = (id: string, name?: string) => {
    Alert.alert(
      'Permanent Deletion',
      `Are you sure you want to permanently delete "${name || 'this tool'}"? This action CANNOT be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await toolService.permanentDeleteTool(id);
              Alert.alert('Success', 'Tool permanently deleted from database.');
              fetchTrash();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Permanent deletion failed.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper title="Trash Archive (Admin)" showBack>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: theme.border }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search deleted tools..."
        />
      </View>

      {loading ? (
        <Loader fullScreen message="Loading trash archives..." />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={fetchTrash} />
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
                fetchTrash();
              }}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 12, overflow: 'hidden' }}>
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.text }}>
                      {item.name || item.description || 'Deleted Tool'}
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: 'monospace', color: theme.textMuted, marginTop: 2 }}>
                      ID: {item.toolId || item.toolCode} • SN: {item.serialNumber || 'N/A'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: isDark ? '#3E1010' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626' }}>SOFT DELETED</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 10, borderTopWidth: 1, borderColor: theme.border, marginTop: 6 }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleRestore(item._id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                  >
                    <RotateCcw size={13} color={theme.primary} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>Restore</Text>
                  </TouchableOpacity>

                  {isAdmin && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handlePermanentDelete(item._id, item.name)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.dangerLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                    >
                      <Trash2 size={13} color={theme.danger} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.danger }}>Delete Forever</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Trash is Empty"
              description="No deleted tools are currently archived."
            />
          }
        />
      )}
    </ScreenWrapper>
  );
}
