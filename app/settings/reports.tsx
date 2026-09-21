import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  BarChart3,
  ShieldCheck,
  Filter,
  Layers,
  Wrench,
  Clock,
  AlertTriangle,
  Building2,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useAppTheme } from '@/context/ThemeContext';
import api from '@/services/api';
import { storeService } from '@/features/stores/services/storeService';
import { StoreRecord } from '@/features/stores/types';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { ErrorState } from '@/components/ui/ErrorState';

export default function ReportsScreen() {
  const { theme, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<any>({
    total: 0,
    available: 0,
    issued: 0,
    underMaintenance: 0,
    inspectionDue: 0,
    scrap: 0,
  });

  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('All');

  const fetchReportData = useCallback(async () => {
    try {
      setError(null);
      const params: Record<string, string> = {};
      if (selectedStoreId !== 'All') {
        params.storeId = selectedStoreId;
      }

      const [statsRes, storesRes] = await Promise.all([
        api.get('/api/reports/tools', { params }).catch(() => null),
        storeService.getStores().catch(() => []),
      ]);

      setStores(storesRes || []);

      if (statsRes?.data?.success && statsRes?.data?.summary) {
        setStats(statsRes.data.summary);
      } else if (statsRes?.data?.data) {
        // Compute from records if summary missing
        const list = statsRes.data.data;
        const total = list.length;
        const available = list.filter((t: any) => t.status === 'Available').length;
        const issued = list.filter((t: any) => t.status === 'Issued').length;
        const underMaintenance = list.filter((t: any) => t.status === 'Under Maintenance').length;
        const inspectionDue = list.filter((t: any) => (t.status || '').includes('Inspection') || (t.status || '').includes('Calibration')).length;
        const scrap = list.filter((t: any) => t.status === 'Scrap').length;

        setStats({
          total,
          available,
          issued,
          underMaintenance,
          inspectionDue,
          scrap,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to aggregate enterprise report data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReportData();
  };

  const {
    total = 0,
    available = 0,
    issued = 0,
    underMaintenance = 0,
    inspectionDue = 0,
    scrap = 0,
  } = stats;

  return (
    <ScreenWrapper title="Enterprise Audit & Reports" showBack>
      {/* Store Filter Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase',
            color: theme.textSecondary,
            marginBottom: 6,
          }}
        >
          Filter By Store / Facility
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              onPress={() => setSelectedStoreId('All')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: selectedStoreId === 'All' ? theme.primary : isDark ? '#1E293B' : '#F1F5F9',
                borderWidth: 1,
                borderColor: selectedStoreId === 'All' ? theme.primary : theme.border,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: selectedStoreId === 'All' ? '#FFFFFF' : theme.text }}>
                All Facilities
              </Text>
            </TouchableOpacity>

            {stores.map((s) => {
              const isSelected = selectedStoreId === s._id;
              return (
                <TouchableOpacity
                  key={s._id}
                  onPress={() => setSelectedStoreId(s._id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: isSelected ? theme.primary : isDark ? '#1E293B' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: isSelected ? theme.primary : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? '#FFFFFF' : theme.text }}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView
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
      >
        {loading ? (
          <Loader message="Aggregating enterprise equipment audit..." />
        ) : error ? (
          <ErrorState title="Report Error" message={error} onRetry={fetchReportData} />
        ) : (
          <View>
            {/* Health Banner */}
            <Card style={{ padding: 16, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: '#EEF2FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BarChart3 size={22} color="#4F46E5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                    Live Inventory Utilization
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    Total Tracked: {total} units in scope
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={{ marginTop: 6 }}>
                <View
                  style={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
                    overflow: 'hidden',
                    flexDirection: 'row',
                  }}
                >
                  <View style={{ flex: Math.max(available, 1), backgroundColor: '#10B981' }} />
                  <View style={{ flex: Math.max(issued, 1), backgroundColor: '#3B82F6' }} />
                  <View style={{ flex: Math.max(underMaintenance, 1), backgroundColor: '#F59E0B' }} />
                  <View style={{ flex: Math.max(inspectionDue, 1), backgroundColor: '#EF4444' }} />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '700' }}>● Available</Text>
                  <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: '700' }}>● Issued</Text>
                  <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '700' }}>● In Maint</Text>
                  <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '700' }}>● Insp Due</Text>
                </View>
              </View>
            </Card>

            {/* Metric Tiles */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <Card style={{ flex: 1, padding: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' }}>
                  Available
                </Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#10B981', marginTop: 4 }}>
                  {available}
                </Text>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>Ready for DC</Text>
              </Card>

              <Card style={{ flex: 1, padding: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' }}>
                  Active On Site
                </Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#3B82F6', marginTop: 4 }}>
                  {issued}
                </Text>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>Issued to projects</Text>
              </Card>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <Card style={{ flex: 1, padding: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' }}>
                  Inspection Due
                </Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#EF4444', marginTop: 4 }}>
                  {inspectionDue}
                </Text>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>Validation expired</Text>
              </Card>

              <Card style={{ flex: 1, padding: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' }}>
                  Retired / Scrap
                </Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#6B7280', marginTop: 4 }}>
                  {scrap}
                </Text>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>Scrapped units</Text>
              </Card>
            </View>

            {/* Quality & Safety Policy Card */}
            <Card style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <ShieldCheck size={20} color="#10B981" />
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text }}>
                  L&T Safety & Validation Policy
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                Tools requiring safety validation must be certified annually or per specification. Equipment flagged as Inspection Due cannot be dispatched on new Delivery Challans.
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
