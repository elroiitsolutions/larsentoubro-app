import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
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
  ClipboardCheck,
  FolderGit2,
  Store,
  UserCheck,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/features/auth/store/authStore';
import { userService } from '@/features/users/services/userService';
import { UserRecord } from '@/features/users/types';
import { SearchBar } from '@/components/common/SearchBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { UserFormModal } from '@/features/users/components/UserFormModal';
import { SubuserFormModal } from '@/features/users/components/SubuserFormModal';

type UserTab = 'users' | 'subusers';

export default function UsersScreen() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const { user: currentUser } = useAuthStore();

  const isAdmin = currentUser?.role === 'Admin';
  const canManageSubusers = Boolean(
    isAdmin || (currentUser as any)?.canCreateUser
  );

  const [activeTab, setActiveTab] = useState<UserTab>(isAdmin ? 'users' : 'subusers');
  const [userList, setUserList] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Primary User Modal State
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Subuser Modal State
  const [subuserModalVisible, setSubuserModalVisible] = useState(false);
  const [selectedSubuser, setSelectedSubuser] = useState<UserRecord | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setActiveTab('subusers');
    }
  }, [isAdmin]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (isAdmin && activeTab === 'users') {
        const data = await userService.getUsers();
        setUserList(data || []);
      } else {
        const data = await userService.getSubusers();
        setUserList(data || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load user list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleOpenAdd = () => {
    if (isAdmin && activeTab === 'users') {
      setSelectedUser(null);
      setUserModalVisible(true);
    } else {
      setSelectedSubuser(null);
      setSubuserModalVisible(true);
    }
  };

  const handleEditItem = (item: UserRecord) => {
    if (isAdmin && activeTab === 'users') {
      setSelectedUser(item);
      setUserModalVisible(true);
    } else {
      setSelectedSubuser(item);
      setSubuserModalVisible(true);
    }
  };

  const filteredList = userList.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.user_id && u.user_id.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  return (
    <ScreenWrapper
      title={isAdmin ? "Users & Access Directory" : "Subuser Team Accounts"}
      showBack
      requiredPage="/users"
      headerRight={
        (isAdmin || (activeTab === 'subusers' && canManageSubusers)) ? (
          <TouchableOpacity
            onPress={handleOpenAdd}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 active:bg-indigo-700 shadow-sm"
          >
            <UserPlus size={14} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">
              {isAdmin && activeTab === 'users' ? 'Add User' : 'Add Subuser'}
            </Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      {/* Tabs Switcher (Only visible to Admin who manages BOTH organization users and subusers) */}
      {isAdmin && (
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
            onPress={() => setActiveTab('users')}
            style={[
              styles.tabItem,
              activeTab === 'users' && [
                styles.tabItemActive,
                { backgroundColor: theme.surface },
              ],
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'users' ? theme.primary : theme.textSecondary,
                  fontWeight: activeTab === 'users' ? '700' : '500',
                },
              ]}
            >
              Organization Users
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('subusers')}
            style={[
              styles.tabItem,
              activeTab === 'subusers' && [
                styles.tabItemActive,
                { backgroundColor: theme.surface },
              ],
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'subusers' ? theme.primary : theme.textSecondary,
                  fontWeight: activeTab === 'subusers' ? '700' : '500',
                },
              ]}
            >
              Subuser Team Accounts
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
          placeholder={`Search ${activeTab === 'users' ? 'users' : 'subusers'} by name, ID, email...`}
        />
      </View>

      {/* List */}
      {loading ? (
        <Loader fullScreen message="Loading directory records..." />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={fetchData} />
      ) : (
        <FlatList
          data={filteredList}
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
          renderItem={({ item }) => {
            const isSubuser = Boolean(item.parentUser || activeTab === 'subusers');
            const parentName =
              typeof item.parentUser === 'object'
                ? item.parentUser?.name || item.parentUser?.email
                : item.parentUser;

            return (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleEditItem(item)}
                style={{ marginBottom: 12 }}
              >
                <Card style={{ padding: 14 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: 'bold',
                          color: theme.text,
                        }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: 'monospace',
                          color: theme.textSecondary,
                          marginTop: 2,
                        }}
                      >
                        ID: {item.user_id || item._id.substring(item._id.length - 6).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <StatusBadge status={item.role || 'User'} size="sm" />
                      <Edit2 size={14} color="#94A3B8" />
                    </View>
                  </View>

                  {/* Badges Row */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
                    {item.hasInspectionAccess && (
                      <View style={[styles.microBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                        <ClipboardCheck size={10} color="#059669" />
                        <Text style={[styles.microBadgeText, { color: '#047857' }]}>Inspection Access</Text>
                      </View>
                    )}

                    {item.canCreateUser && (
                      <View style={[styles.microBadge, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                        <UserCheck size={10} color="#4F46E5" />
                        <Text style={[styles.microBadgeText, { color: '#4338CA' }]}>Can Create Subusers</Text>
                      </View>
                    )}

                    {isSubuser && parentName && (
                      <View style={[styles.microBadge, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                        <Text style={[styles.microBadgeText, { color: '#64748B' }]}>
                          Parent: {parentName}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Scopes & Contact Row */}
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderColor: theme.border,
                      marginTop: 4,
                      gap: 6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Mail size={12} color={theme.textSecondary} />
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                        {item.email}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {Array.isArray(item.projects) && item.projects.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <FolderGit2 size={11} color="#4F46E5" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#4F46E5' }}>
                            {item.projects.length} Proj
                          </Text>
                        </View>
                      )}

                      {Array.isArray(item.stores) && item.stores.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Store size={11} color="#D97706" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#D97706' }}>
                            {item.stores.length} Stores
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
              title={`No ${activeTab === 'users' ? 'Users' : 'Subusers'} Found`}
              description={`No ${activeTab === 'users' ? 'organization users' : 'delegated subuser team accounts'} matched your criteria.`}
              actionTitle={canManageSubusers ? (isAdmin && activeTab === 'users' ? 'Add User' : 'Add Subuser') : undefined}
              onAction={canManageSubusers ? handleOpenAdd : undefined}
            />
          }
        />
      )}

      {/* Primary User Modal */}
      <UserFormModal
        visible={userModalVisible}
        onClose={() => setUserModalVisible(false)}
        user={selectedUser}
        onSuccess={fetchData}
      />

      {/* Subuser Modal */}
      <SubuserFormModal
        visible={subuserModalVisible}
        onClose={() => setSubuserModalVisible(false)}
        subuser={selectedSubuser}
        onSuccess={fetchData}
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
  microBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  microBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
