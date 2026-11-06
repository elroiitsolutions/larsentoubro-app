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
  Calendar,
  Clock,
  Trash2,
  Tag,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/features/auth/store/authStore';
import { userService } from '@/features/users/services/userService';
import { guestUserService } from '@/features/users/services/guestUserService';
import { UserRecord, GuestUserRecord } from '@/features/users/types';
import { SearchBar } from '@/components/common/SearchBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { UserFormModal } from '@/features/users/components/UserFormModal';
import { SubuserFormModal } from '@/features/users/components/SubuserFormModal';
import { GuestUserFormModal } from '@/features/users/components/GuestUserFormModal';
import { ExtendGuestModal } from '@/features/users/components/ExtendGuestModal';

type UserTab = 'users' | 'subusers' | 'guests';

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
  const [guestList, setGuestList] = useState<GuestUserRecord[]>([]);
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

  // Guest User Modal State
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestUserRecord | null>(null);

  // Extend Guest Modal State
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [guestToExtend, setGuestToExtend] = useState<GuestUserRecord | null>(null);

  useEffect(() => {
    if (!isAdmin && activeTab === 'users') {
      setActiveTab('subusers');
    }
  }, [isAdmin, activeTab]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (activeTab === 'guests') {
        const data = await guestUserService.getGuestUsers();
        setGuestList(data || []);
      } else if (isAdmin && activeTab === 'users') {
        const data = await userService.getUsers({ type: 'internal' });
        // Organization Users tab: strictly primary organization users (Admin & User)
        const orgUsers = (data || []).filter(
          (u) => u.role !== 'Vendor' && u.role !== 'Subuser'
        );
        setUserList(orgUsers);
      } else {
        const data = await userService.getSubusers();
        // Subuser Team Accounts tab: strictly subuser accounts
        const subusersList = (data || []).filter((u) => u.role === 'Subuser');
        setUserList(subusersList);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load directory list.');
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
    if (activeTab === 'guests') {
      setSelectedGuest(null);
      setGuestModalVisible(true);
    } else if (isAdmin && activeTab === 'users') {
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

  const handleEditGuest = (guest: GuestUserRecord) => {
    setSelectedGuest(guest);
    setGuestModalVisible(true);
  };

  const handleOpenExtendGuest = (guest: GuestUserRecord) => {
    setGuestToExtend(guest);
    setExtendModalVisible(true);
  };

  const handleDeleteGuest = (guest: GuestUserRecord) => {
    Alert.alert(
      'Delete Guest User',
      `Are you sure you want to delete guest account for "${guest.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await guestUserService.deleteGuestUser(guest._id);
              Alert.alert('Deleted', 'Guest account deleted successfully.');
              fetchData();
            } catch (err: any) {
              Alert.alert(
                'Delete Failed',
                err?.response?.data?.message || err?.message || 'Could not delete guest user.'
              );
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const filteredUserList = userList.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.user_id && u.user_id.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const filteredGuestList = guestList.filter((g) => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.phone && g.phone.toLowerCase().includes(q)) ||
      (g.email && g.email.toLowerCase().includes(q)) ||
      (g.organization && g.organization.toLowerCase().includes(q)) ||
      (g.purpose && g.purpose.toLowerCase().includes(q))
    );
  });

  return (
    <ScreenWrapper
      title={isAdmin ? "Users & Access Directory" : "Subuser Team Accounts"}
      showBack
      requiredPage="/users"
      headerRight={
        (isAdmin || (canManageSubusers && (activeTab === 'subusers' || activeTab === 'guests'))) ? (
          <TouchableOpacity
            onPress={handleOpenAdd}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 active:bg-indigo-700 shadow-sm"
          >
            <UserPlus size={14} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">
              {activeTab === 'guests'
                ? 'Add Guest'
                : isAdmin && activeTab === 'users'
                ? 'Add User / Admin'
                : 'Add Subuser'}
            </Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      {/* Tabs Switcher: Org Users | Subusers | Guest Users */}
      {(isAdmin || canManageSubusers) && (
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
              borderColor: theme.border,
            },
          ]}
        >
          {isAdmin && (
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
                numberOfLines={1}
              >
                Org Users
              </Text>
            </TouchableOpacity>
          )}

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
              numberOfLines={1}
            >
              Subuser Accounts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('guests')}
            style={[
              styles.tabItem,
              activeTab === 'guests' && [
                styles.tabItemActive,
                { backgroundColor: theme.surface },
              ],
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'guests' ? theme.primary : theme.textSecondary,
                  fontWeight: activeTab === 'guests' ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              Guest Users
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
          placeholder={
            activeTab === 'guests'
              ? 'Search guest users by name, mobile, org...'
              : `Search ${activeTab === 'users' ? 'users' : 'subusers'} by name, ID, email...`
          }
        />
      </View>

      {/* List */}
      {loading ? (
        <Loader fullScreen message="Loading directory records..." />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={fetchData} />
      ) : activeTab === 'guests' ? (
        <FlatList
          data={filteredGuestList}
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
            const status = item.computedStatus || item.status || 'Active';
            const isExpired = status === 'Expired';
            const isExpiringSoon = status === 'Expiring Soon';

            return (
              <View style={{ marginBottom: 12 }}>
                <Card style={{ padding: 14 }}>
                  {/* Header: Name, Guest Badge, Status */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 6,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: 'bold',
                            color: theme.text,
                          }}
                        >
                          {item.name}
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                            backgroundColor: isDark ? '#312E81' : '#EEF2FF',
                            borderWidth: 1,
                            borderColor: isDark ? '#4338CA' : '#C7D2FE',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9.5,
                              fontWeight: '700',
                              color: isDark ? '#C7D2FE' : '#4338CA',
                              textTransform: 'uppercase',
                            }}
                          >
                            Guest Access
                          </Text>
                        </View>
                      </View>

                      {item.organization ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Building size={11} color={theme.textSecondary} />
                          <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                            {item.organization}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <StatusBadge status={status} size="sm" />
                  </View>

                  {/* Contact info: Phone & Email */}
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 12,
                      marginTop: 4,
                      marginBottom: 6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Phone size={12} color="#059669" />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          fontFamily: 'monospace',
                          color: isDark ? '#CBD5E1' : '#334155',
                        }}
                      >
                        +91 {item.phone}
                      </Text>
                    </View>

                    {item.email ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Mail size={12} color={theme.textSecondary} />
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                          {item.email}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Purpose / visit notes */}
                  {item.purpose ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        marginBottom: 8,
                      }}
                    >
                      <Tag size={10} color={theme.textSecondary} />
                      <Text
                        style={{ fontSize: 11, color: theme.textSecondary, flex: 1 }}
                        numberOfLines={1}
                      >
                        {item.purpose}
                      </Text>
                    </View>
                  ) : null}

                  {/* Dates & Validity row */}
                  <View
                    style={{
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderColor: theme.border,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <View style={{ flexDirection: 'column', gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Calendar size={11} color={theme.textSecondary} />
                        <Text style={{ fontSize: 10.5, color: theme.textSecondary }}>
                          Start: {formatDate(item.startDate || item.createdAt)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '600',
                            color: isExpired
                              ? '#DC2626'
                              : isExpiringSoon
                              ? '#D97706'
                              : theme.textSecondary,
                          }}
                        >
                          Exp: {formatDate(item.expiresAt)}
                        </Text>

                        {/* Edit Date quick button */}
                        <TouchableOpacity
                          onPress={() => handleOpenExtendGuest(item)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                            paddingHorizontal: 5,
                            paddingVertical: 2,
                            borderRadius: 4,
                            backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                            borderWidth: 1,
                            borderColor: isDark ? '#047857' : '#A7F3D0',
                          }}
                        >
                          <Edit2 size={9} color="#059669" />
                          <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#059669' }}>
                            Edit Date
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Action Buttons: Extend, Edit, Delete */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {/* Extend Button */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleOpenExtendGuest(item)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                          borderWidth: 1,
                          borderColor: isDark ? '#047857' : '#A7F3D0',
                        }}
                      >
                        <Clock size={12} color="#059669" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                          Extend
                        </Text>
                      </TouchableOpacity>

                      {/* Edit Full Profile */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleEditGuest(item)}
                        style={{
                          padding: 6,
                          borderRadius: 8,
                          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: theme.border,
                        }}
                      >
                        <Edit2 size={13} color="#64748B" />
                      </TouchableOpacity>

                      {/* Delete Guest */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleDeleteGuest(item)}
                        style={{
                          padding: 6,
                          borderRadius: 8,
                          backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                          borderWidth: 1,
                          borderColor: isDark ? '#7F1D1D' : '#FECACA',
                        }}
                      >
                        <Trash2 size={13} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="No Guest Users Found"
              description="No temporary guest accounts matched your search criteria."
              actionTitle={canManageSubusers ? "Add Guest User" : undefined}
              onAction={canManageSubusers ? handleOpenAdd : undefined}
            />
          }
        />
      ) : (
        <FlatList
          data={filteredUserList}
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

      {/* Guest User Form Modal (Create & Edit) */}
      <GuestUserFormModal
        visible={guestModalVisible}
        onClose={() => setGuestModalVisible(false)}
        guest={selectedGuest}
        onSuccess={fetchData}
      />

      {/* Extend Guest Access Modal */}
      <ExtendGuestModal
        visible={extendModalVisible}
        onClose={() => setExtendModalVisible(false)}
        guest={guestToExtend}
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
    fontSize: 11.5,
    textAlign: 'center',
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
