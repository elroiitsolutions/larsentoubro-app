import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Switch,
} from 'react-native';
import {
  UserPlus,
  User as UserIcon,
  Shield,
  Key,
  FolderGit2,
  Store,
  Check,
  ClipboardCheck,
  Trash2,
  AlertCircle,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/features/auth/store/authStore';
import { projectService } from '@/features/projects/services/projectService';
import { storeService } from '@/features/stores/services/storeService';
import { userService } from '../services/userService';
import { UserRecord } from '../types';

interface SubuserFormModalProps {
  visible: boolean;
  onClose: () => void;
  subuser: UserRecord | null;
  onSuccess: () => void;
}

const ALL_POSSIBLE_PAGES = [
  { title: 'Dashboard', url: '/dashboard', desc: 'Analytics & KPIs' },
  { title: 'Projects', url: '/projects', desc: 'Project directory' },
  { title: 'Stores & HUBs', url: '/stores', desc: 'Store inventory' },
  { title: 'Tools Inventory', url: '/tools', desc: 'Tool tracking' },
  { title: 'Delivery Challans', url: '/challans', desc: 'Equipment dispatch' },
  { title: 'Profiles Directory', url: '/profiles', desc: 'Vendors & suppliers' },
  { title: 'Scrap Register', url: '/scrap', desc: 'Scrap handling' },
  { title: 'QR Scanner', url: '/scanner', desc: 'Scan tool QR codes' },
];

export const SubuserFormModal: React.FC<SubuserFormModalProps> = ({
  visible,
  onClose,
  subuser,
  onSuccess,
}) => {
  const { theme, isDark } = useAppTheme();
  const { user: currentUser } = useAuthStore();
  const isEdit = Boolean(subuser);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [hasInspectionAccess, setHasInspectionAccess] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allStores, setAllStores] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load projects and stores from API
  useEffect(() => {
    if (!visible) return;

    const loadData = async () => {
      setLoadingData(true);
      try {
        const [projRes, storeRes] = await Promise.all([
          projectService.getProjects().catch(() => []),
          storeService.getStores().catch(() => []),
        ]);
        setAllProjects(Array.isArray(projRes) ? projRes : (projRes as any)?.data || []);
        setAllStores(Array.isArray(storeRes) ? storeRes : (storeRes as any)?.data || []);
      } catch (err) {
        console.warn('Failed to load project/store scope options:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [visible]);

  // Check if a page path is authorized by parent user account
  const isPageAuthorizedByParent = useCallback(
    (pageUrl: string) => {
      if (currentUser?.role === 'Admin') return true;
      const userPages = currentUser?.allowedPages || [];
      if (userPages.includes(pageUrl)) return true;
      if (pageUrl === '/challans' && userPages.includes('/challans/history')) return true;
      if (pageUrl === '/scrap' && userPages.includes('/tools/scrap')) return true;
      if (pageUrl === '/scanner' && (userPages.includes('/qr-scanner') || userPages.includes('/scanner'))) return true;
      if (pageUrl === '/dashboard' && (userPages.includes('/(tabs)') || userPages.includes('/dashboard'))) return true;
      if (pageUrl === '/projects' && (userPages.includes('/(tabs)/projects') || userPages.includes('/projects'))) return true;
      return false;
    },
    [currentUser]
  );

  // Compute pages strictly authorized under parent account (matches web)
  const parentAllowedPages = useMemo(() => {
    if (currentUser?.role === 'Admin') {
      return ALL_POSSIBLE_PAGES;
    }
    return ALL_POSSIBLE_PAGES.filter((p) => isPageAuthorizedByParent(p.url));
  }, [currentUser, isPageAuthorizedByParent]);

  // Compute inspection access strictly authorized under parent account
  const parentHasInspection = Boolean(
    currentUser?.role === 'Admin' || (currentUser as any)?.hasInspectionAccess
  );

  // Compute projects strictly authorized under parent account (matches web)
  const parentAllowedProjects = useMemo(() => {
    if (currentUser?.role === 'Admin') return allProjects;
    const myProjIds = (currentUser?.projects || []).map((p: any) =>
      typeof p === 'object' ? p._id : p
    );
    return allProjects.filter((p) => myProjIds.includes(p._id));
  }, [allProjects, currentUser]);

  // Compute stores strictly authorized under parent account and within allowed projects (matches web)
  const parentAllowedStores = useMemo(() => {
    const allowedProjIds = parentAllowedProjects.map((p) => p._id);
    let stores = allStores.filter((s) => {
      const pId = s.projectId || (s.project && typeof s.project === 'object' ? s.project._id : s.project);
      return allowedProjIds.includes(String(pId));
    });
    if (currentUser?.role !== 'Admin') {
      const myStoreIds = (currentUser?.stores || []).map((s: any) =>
        typeof s === 'object' ? s._id : s
      );
      stores = stores.filter((s) => myStoreIds.includes(String(s._id)));
    }
    return stores;
  }, [allStores, parentAllowedProjects, currentUser]);

  // Initialize or reset form state
  useEffect(() => {
    if (!visible) return;

    if (subuser) {
      setName(subuser.name || '');
      setEmail(subuser.email || '');
      setUserId(subuser.user_id || '');
      setPhone(subuser.phonenumber || subuser.phone || '');
      setPassword('');

      const rawPages = Array.isArray(subuser.allowedPages) ? subuser.allowedPages : ['/dashboard'];
      const validPages = rawPages.filter((url) => isPageAuthorizedByParent(url));
      setAllowedPages(validPages.length > 0 ? validPages : parentAllowedPages.slice(0, 2).map((p) => p.url));

      setHasInspectionAccess(Boolean(subuser.hasInspectionAccess && parentHasInspection));

      const rawProjIds = (subuser.projects || []).map((p: any) =>
        typeof p === 'object' ? p._id : p
      );
      const parentProjIds = parentAllowedProjects.map((p) => p._id);
      setSelectedProjects(
        currentUser?.role === 'Admin' ? rawProjIds : rawProjIds.filter((id) => parentProjIds.includes(id))
      );

      const rawStoreIds = (subuser.stores || []).map((s: any) =>
        typeof s === 'object' ? s._id : s
      );
      const parentStoreIds = parentAllowedStores.map((s) => s._id);
      setSelectedStores(
        currentUser?.role === 'Admin' ? rawStoreIds : rawStoreIds.filter((id) => parentStoreIds.includes(id))
      );
    } else {
      setName('');
      setEmail('');
      setUserId('');
      setPhone('');
      setPassword('');
      setAllowedPages(parentAllowedPages.slice(0, 3).map((p) => p.url));
      setHasInspectionAccess(false);
      setSelectedProjects([]);
      setSelectedStores([]);
    }
  }, [subuser, visible, parentAllowedPages, parentHasInspection, parentAllowedProjects, parentAllowedStores, currentUser, isPageAuthorizedByParent]);

  const togglePage = (url: string) => {
    setAllowedPages((prev) =>
      prev.includes(url) ? prev.filter((p) => p !== url) : [...prev, url]
    );
  };

  const toggleSelectAllPages = () => {
    if (allowedPages.length === parentAllowedPages.length) {
      setAllowedPages([]);
    } else {
      setAllowedPages(parentAllowedPages.map((p) => p.url));
    }
  };

  const toggleProject = (projId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projId) ? prev.filter((p) => p !== projId) : [...prev, projId]
    );
  };

  const toggleStore = (storeId: string) => {
    setSelectedStores((prev) =>
      prev.includes(storeId) ? prev.filter((s) => s !== storeId) : [...prev, storeId]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || (!isEdit && !userId.trim())) {
      Alert.alert('Required Fields', 'Please fill in Name, Email, and User ID.');
      return;
    }

    if (!isEdit && (!password || password.length < 6)) {
      Alert.alert('Password Error', 'Password must be at least 6 characters.');
      return;
    }

    // Clamp permissions strictly to parent's authorized boundaries (matches web)
    const clampedPages = allowedPages.filter((url) => isPageAuthorizedByParent(url));
    const parentProjIds = parentAllowedProjects.map((p) => p._id);
    const clampedProjects = currentUser?.role === 'Admin'
      ? selectedProjects
      : selectedProjects.filter((id) => parentProjIds.includes(id));

    const parentStoreIds = parentAllowedStores.map((s) => s._id);
    const clampedStores = currentUser?.role === 'Admin'
      ? selectedStores
      : selectedStores.filter((id) => parentStoreIds.includes(id));

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        user_id: userId.trim().toUpperCase(),
        phonenumber: phone.trim() || 'N/A',
        allowedPages: clampedPages,
        hasInspectionAccess: parentHasInspection ? hasInspectionAccess : false,
        projects: clampedProjects,
        stores: clampedStores,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      if (isEdit && subuser) {
        await userService.updateSubuser(subuser._id, payload);
        Alert.alert('Success', 'Subuser account updated.');
      } else {
        await userService.createSubuser(payload);
        Alert.alert('Success', 'Subuser team account created.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Submission Failed',
        err?.response?.data?.message || err?.message || 'Could not save subuser account.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!subuser) return;

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete subuser ${subuser.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await userService.deleteSubuser(subuser._id);
              Alert.alert('Success', 'Subuser removed.');
              onSuccess();
              onClose();
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.response?.data?.message || err?.message || 'Could not delete subuser.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header (Matches Web format) */}
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
            <UserPlus size={22} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>
              {isEdit ? 'Edit Subuser' : 'Create New Subuser'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Subusers operate strictly within your account scope. All logins require parent approval.
            </Text>
          </View>
        </View>

        {/* Section 1: Subuser Credentials & Profile */}
        <View
          style={[
            styles.cardSection,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <UserIcon size={16} color="#4F46E5" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Subuser Credentials & Profile
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            <Input
              label="Full Name *"
              placeholder="e.g. Suresh Patel"
              value={name}
              onChangeText={setName}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Subuser ID / Code *"
                  placeholder="e.g. SUB-1042"
                  value={userId}
                  onChangeText={setUserId}
                  autoCapitalize="characters"
                  editable={!isEdit}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Phone Number *"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <Input
              label="Email Address (Login Username) *"
              placeholder="e.g. suresh.sub@larsentoubro.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label={isEdit ? 'Reset Password (leave blank to keep current)' : 'Subuser Password *'}
              placeholder={isEdit ? 'Leave blank to keep current password' : 'At least 6 characters'}
              value={password}
              onChangeText={setPassword}
              isPassword
            />
          </View>
        </View>

        {/* Section 2: Allowed Pages Hierarchy (Matches Web format) */}
        <View
          style={[
            styles.cardSection,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.sectionHeaderBetween}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LayoutDashboard size={16} color="#4F46E5" />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Allowed Pages ({allowedPages.length} of {parentAllowedPages.length} Granted)
                </Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Only pages authorized for your account are displayed. Select which pages this subuser can access.
              </Text>
            </View>

            {parentAllowedPages.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={toggleSelectAllPages}
                style={[
                  styles.miniActionBtn,
                  {
                    backgroundColor: isDark ? '#334155' : '#F1F5F9',
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.miniActionText, { color: theme.primary }]}>
                  {allowedPages.length === parentAllowedPages.length ? 'Revoke All' : 'Grant All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {parentAllowedPages.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
              <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center' }}>
                No authorized pages found on parent account.
              </Text>
            </View>
          ) : (
            <View style={styles.pagesGrid}>
              {parentAllowedPages.map((page) => {
                const isChecked = allowedPages.includes(page.url);
                return (
                  <TouchableOpacity
                    key={page.url}
                    activeOpacity={0.7}
                    onPress={() => togglePage(page.url)}
                    style={[
                      styles.pageCard,
                      {
                        backgroundColor: isChecked
                          ? isDark
                            ? 'rgba(79, 70, 229, 0.18)'
                            : '#EEF2FF'
                          : isDark
                          ? '#0F172A'
                          : '#FFFFFF',
                        borderColor: isChecked ? '#4F46E5' : theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.checkboxSquare,
                        {
                          backgroundColor: isChecked ? '#4F46E5' : 'transparent',
                          borderColor: isChecked ? '#4F46E5' : '#94A3B8',
                        },
                      ]}
                    >
                      {isChecked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.pageCardTitle,
                          {
                            color: isChecked ? '#4F46E5' : theme.text,
                            fontWeight: isChecked ? '700' : '600',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {page.title}
                      </Text>
                      <Text style={[styles.pageCardDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                        {page.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Section 3: Operational Permissions - Quality Inspection Access (Matches Web format) */}
        <View
          style={[
            styles.cardSection,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <ClipboardCheck size={16} color="#059669" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Inspection Operational Access
            </Text>
          </View>

          <View
            style={[
              styles.inspectionBox,
              {
                backgroundColor: hasInspectionAccess && parentHasInspection
                  ? isDark
                    ? 'rgba(16, 185, 129, 0.12)'
                    : '#ECFDF5'
                  : isDark
                  ? '#0F172A'
                  : '#F8FAFC',
                borderColor: hasInspectionAccess && parentHasInspection
                  ? '#10B981'
                  : theme.border,
                opacity: parentHasInspection ? 1 : 0.6,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, marginRight: 10 }}>
              <View
                style={[
                  styles.smallIconBox,
                  {
                    backgroundColor: hasInspectionAccess && parentHasInspection ? '#D1FAE5' : isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <ClipboardCheck size={16} color={hasInspectionAccess && parentHasInspection ? '#059669' : '#64748B'} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>
                    Grant Tool Inspection Access
                  </Text>
                  {hasInspectionAccess && parentHasInspection && (
                    <View style={styles.enabledBadge}>
                      <Text style={styles.enabledBadgeText}>Enabled</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                  Allows subuser to execute tool inspections (Pass/Fail) and route items to Repair or Scrap.
                </Text>
                {!parentHasInspection && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <AlertCircle size={12} color="#EF4444" />
                    <Text style={{ fontSize: 10.5, color: '#EF4444', fontWeight: '600' }}>
                      You do not have Inspection access, so you cannot grant it to subusers.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Switch
              value={hasInspectionAccess && parentHasInspection}
              disabled={!parentHasInspection}
              onValueChange={setHasInspectionAccess}
              trackColor={{ false: '#94A3B8', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section 4: Inventory Scope - Projects & Stores (Matches Web format) */}
        <View
          style={[
            styles.cardSection,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.sectionHeaderBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FolderGit2 size={16} color="#4F46E5" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Inventory Scope (Projects & Stores)
              </Text>
            </View>
            {loadingData && <ActivityIndicator size="small" color={theme.primary} />}
          </View>

          {/* Assigned Projects Scope */}
          <View style={{ marginTop: 4 }}>
            <Text style={[styles.subScopeTitle, { color: theme.text }]}>
              Assigned Projects ({selectedProjects.length} of {parentAllowedProjects.length} Selected)
            </Text>
            <View style={styles.pillsWrap}>
              {parentAllowedProjects.map((p) => {
                const isSel = selectedProjects.includes(p._id);
                return (
                  <TouchableOpacity
                    key={p._id}
                    activeOpacity={0.7}
                    onPress={() => toggleProject(p._id)}
                    style={[
                      styles.scopePill,
                      {
                        backgroundColor: isSel
                          ? '#4F46E5'
                          : isDark
                          ? '#0F172A'
                          : '#F8FAFC',
                        borderColor: isSel ? '#4F46E5' : theme.border,
                      },
                    ]}
                  >
                    <FolderGit2 size={12} color={isSel ? '#FFFFFF' : '#64748B'} />
                    <Text
                      style={[
                        styles.scopePillText,
                        {
                          color: isSel ? '#FFFFFF' : theme.text,
                          fontWeight: isSel ? '700' : '500',
                        },
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {parentAllowedProjects.length === 0 && (
                <Text style={{ fontSize: 11, fontStyle: 'italic', color: theme.textSecondary }}>
                  No projects available under your account.
                </Text>
              )}
            </View>
          </View>

          {/* Assigned Stores Scope */}
          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: isDark ? '#334155' : '#F1F5F9' }}>
            <Text style={[styles.subScopeTitle, { color: theme.text }]}>
              Assigned Stores ({selectedStores.length} of {parentAllowedStores.length} Selected)
            </Text>
            <View style={styles.pillsWrap}>
              {parentAllowedStores.map((s) => {
                const isSel = selectedStores.includes(s._id);
                return (
                  <TouchableOpacity
                    key={s._id}
                    activeOpacity={0.7}
                    onPress={() => toggleStore(s._id)}
                    style={[
                      styles.scopePill,
                      {
                        backgroundColor: isSel
                          ? '#059669'
                          : isDark
                          ? '#0F172A'
                          : '#F8FAFC',
                        borderColor: isSel ? '#059669' : theme.border,
                      },
                    ]}
                  >
                    <Store size={12} color={isSel ? '#FFFFFF' : '#64748B'} />
                    <Text
                      style={[
                        styles.scopePillText,
                        {
                          color: isSel ? '#FFFFFF' : theme.text,
                          fontWeight: isSel ? '700' : '500',
                        },
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {parentAllowedStores.length === 0 && (
                <Text style={{ fontSize: 11, fontStyle: 'italic', color: theme.textSecondary }}>
                  No stores available under assigned projects.
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Section 5: Subuser Login Approval Notice (Matches Web format) */}
        <View
          style={[
            styles.noticeBox,
            {
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
              borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE',
            },
          ]}
        >
          <ShieldCheck size={16} color="#2563EB" style={{ marginTop: 1 }} />
          <Text style={[styles.noticeText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
            Subuser login requests will be sent directly to your account for review and approval.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          {isEdit && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleDelete}
              disabled={deleting || submitting}
              style={[styles.deleteBtn, { backgroundColor: '#FEE2E2' }]}
            >
              <Trash2 size={16} color="#DC2626" />
            </TouchableOpacity>
          )}

          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            disabled={submitting}
            style={{ flex: 1 }}
          />

          <Button
            title={submitting ? 'Saving...' : isEdit ? 'Update Subuser' : 'Create Subuser'}
            onPress={handleSubmit}
            disabled={submitting}
            style={{ flex: 1.5, backgroundColor: '#4F46E5' }}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16.5,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  cardSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
    lineHeight: 14,
  },
  miniActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniActionText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 12,
    borderRadius: 10,
  },
  pagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pageCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkboxSquare: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageCardTitle: {
    fontSize: 11.5,
  },
  pageCardDesc: {
    fontSize: 9.5,
    marginTop: 1,
  },
  inspectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  smallIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enabledBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  enabledBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
  },
  subScopeTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scopePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scopePillText: {
    fontSize: 11,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    lineHeight: 15,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
