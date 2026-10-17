import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  Shield,
  Mail,
  Phone,
  Building,
  UserPlus,
  Edit2,
  Lock,
  Layers,
} from 'lucide-react-native';
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
import { UserFormModal } from '@/features/users/components/UserFormModal';

export default function UsersScreen() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // User Form & Access Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

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

  const handleCreateUser = () => {
    setSelectedUser(null);
    setModalVisible(true);
  };

  const handleEditUser = (user: UserRecord) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.user_id && u.user_id.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  return (
    <ScreenWrapper
      title="Users & Access Directory"
      showBack
      headerRight={
        <TouchableOpacity
          onPress={handleCreateUser}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 active:bg-indigo-700 shadow-sm"
        >
          <UserPlus size={14} color="#FFFFFF" />
          <Text className="text-xs font-bold text-white">Add User</Text>
        </TouchableOpacity>
      }
    >
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
          placeholder="Search by name, email, employee ID, role..."
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
          renderItem={({ item }) => {
            const allowedCount = Array.isArray(item.allowedPages) ? item.allowedPages.length : 0;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleEditUser(item)}
              >
                <Card style={{ marginBottom: 12, overflow: 'hidden' }}>
                  <View style={{ padding: 14 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: 'bold',
                              color: theme.text,
                            }}
                          >
                            {item.name}
                          </Text>
                          {item.user_id && (
                            <View
                              style={{
                                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                borderRadius: 4,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '800',
                                  fontFamily: 'monospace',
                                  color: theme.textSecondary,
                                }}
                              >
                                {item.user_id}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                          {item.email}
                        </Text>
                      </View>
                      <StatusBadge status={item.status || 'Active'} size="sm" />
                    </View>

                    {/* Metadata & Permissions Pills */}
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 6,
                        marginVertical: 4,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor:
                            item.role === 'Admin'
                              ? '#EEF2FF'
                              : isDark
                              ? '#1E293B'
                              : '#F1F5F9',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                        }}
                      >
                        <Shield
                          size={11}
                          color={item.role === 'Admin' ? '#4F46E5' : theme.textSecondary}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: item.role === 'Admin' ? '#4F46E5' : theme.text,
                          }}
                        >
                          Role: {item.role}
                        </Text>
                      </View>

                      {allowedCount > 0 && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: isDark ? '#1E293B' : '#ECFDF5',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                          }}
                        >
                          <Layers size={11} color="#059669" />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: '#059669',
                            }}
                          >
                            {allowedCount} Pages Access
                          </Text>
                        </View>
                      )}

                      {(item.phonenumber || item.phone) && (
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
                          <Phone size={10} color={theme.textSecondary} />
                          <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                            {item.phonenumber || item.phone}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="No Users Found"
              description="No registered users matched your search criteria."
            />
          }
        />
      )}

      {/* User Create / Edit & RBAC Modal */}
      <UserFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />
    </ScreenWrapper>
  );
}
