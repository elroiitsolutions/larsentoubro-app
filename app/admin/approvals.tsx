import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, UserCheck, UserX, Clock, Check, X } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useAppTheme } from '@/context/ThemeContext';
import { userService } from '@/features/users/services/userService';
import { PendingLoginRequest } from '@/features/users/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

const ROLES = ['Store Incharge', 'Operator', 'Admin', 'Vendor'];

export default function AdminApprovalsScreen() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const [requests, setRequests] = useState<PendingLoginRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const data = await userService.getPendingApprovals();
      setRequests(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load pending approval requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (item: PendingLoginRequest) => {
    const assignedRole = selectedRoles[item._id] || item.roleRequested || 'Operator';
    try {
      setActionLoading(item._id);
      await userService.approveRequest(item._id, assignedRole);
      Alert.alert('Approved', `User ${item.name} approved as ${assignedRole}.`);
      setRequests((prev) => prev.filter((r) => r._id !== item._id));
    } catch (err: any) {
      Alert.alert('Approval Failed', err?.message || 'Could not approve request.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (item: PendingLoginRequest) => {
    Alert.alert(
      'Reject Request',
      `Reject access for ${item.name} (${item.email})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(item._id);
              await userService.rejectRequest(item._id, 'Rejected by Administrator');
              Alert.alert('Rejected', `Request for ${item.name} was rejected.`);
              setRequests((prev) => prev.filter((r) => r._id !== item._id));
            } catch (err: any) {
              Alert.alert('Reject Failed', err?.message || 'Could not reject request.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper title="User Access Approvals" showBack>
      {loading ? (
        <Loader fullScreen message="Loading pending registrations..." />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={fetchRequests} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchRequests();
              }}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => {
            const currentRole = selectedRoles[item._id] || item.roleRequested || 'Operator';
            const isProcessing = actionLoading === item._id;

            return (
              <Card style={{ marginBottom: 14, overflow: 'hidden' }}>
                <View style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>
                        {item.email}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E' }}>PENDING</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: 6 }}>
                    <Clock size={12} color={theme.textMuted} />
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>
                      Requested: {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>

                  {/* Assign Role selector */}
                  <View style={{ marginVertical: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: theme.textSecondary, marginBottom: 6 }}>
                      Assign Role Upon Approval
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {ROLES.map((r) => {
                        const isSelected = currentRole === r;
                        return (
                          <TouchableOpacity
                            key={r}
                            activeOpacity={0.7}
                            onPress={() =>
                              setSelectedRoles((prev) => ({ ...prev, [item._id]: r }))
                            }
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 8,
                              backgroundColor: isSelected ? theme.primary : isDark ? '#1E293B' : '#F1F5F9',
                              borderWidth: 1,
                              borderColor: isSelected ? theme.primary : theme.border,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: isSelected ? '#FFFFFF' : theme.text,
                              }}
                            >
                              {r}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: theme.border }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Reject"
                        variant="outline"
                        size="sm"
                        disabled={isProcessing}
                        onPress={() => handleReject(item)}
                        icon={<X size={13} color={theme.danger} />}
                      />
                    </View>
                    <View style={{ flex: 1.3 }}>
                      <Button
                        title="Approve"
                        size="sm"
                        loading={isProcessing}
                        onPress={() => handleApprove(item)}
                        icon={<Check size={13} color="#FFFFFF" />}
                      />
                    </View>
                  </View>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="No Pending Requests"
              description="All user registrations and access requests have been reviewed."
            />
          }
        />
      )}
    </ScreenWrapper>
  );
}
