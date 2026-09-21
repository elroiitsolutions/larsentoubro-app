import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Shield, Mail, Phone, Building } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useAppTheme } from '@/context/ThemeContext';
import { userService } from '@/features/users/services/userService';
import { UserRecord } from '@/features/users/types';
import { SearchBar } from '@/components/common/SearchBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

export default function UsersScreen() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  return (
    <ScreenWrapper title="Users & Access Directory" showBack>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: theme.border }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search users by name, email, role..."
        />
      </View>

      {loading ? (
        <Loader fullScreen message="Loading user directory..." />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={fetchUsers} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchUsers();
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
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      {item.email}
                    </Text>
                  </View>
                  <StatusBadge status={item.status || 'Active'} size="sm" />
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Shield size={11} color={theme.primary} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>
                      Role: {item.role}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Users Found"
              description="No registered users matched your search criteria."
            />
          }
        />
      )}
    </ScreenWrapper>
  );
}
