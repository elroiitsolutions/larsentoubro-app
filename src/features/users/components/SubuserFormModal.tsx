import React, { useState, useEffect, useMemo } from 'react';
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

const AVAILABLE_PAGES = [
  { label: 'QR Scanner', path: '/scanner' },
  { label: 'Dashboard', path: '/(tabs)' },
  { label: 'Projects', path: '/(tabs)/projects' },
  { label: 'Stores & Inventory', path: '/stores' },
  { label: 'Delivery Challans', path: '/challans' },
  { label: 'Scrap Register', path: '/scrap' },
  { label: 'Profiles Directory', path: '/profiles' },
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
  const [allowedPages, setAllowedPages] = useState<string[]>([
    '/scanner',
    '/(tabs)',
    '/stores',
    '/challans',
  ]);
  const [hasInspectionAccess, setHasInspectionAccess] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allStores, setAllStores] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    if (subuser) {
      setName(subuser.name || '');
      setEmail(subuser.email || '');
      setUserId(subuser.user_id || '');
      setPhone(subuser.phonenumber || subuser.phone || '');
      setPassword('');
      setAllowedPages(subuser.allowedPages || ['/(tabs)', '/stores']);
      setHasInspectionAccess(Boolean(subuser.hasInspectionAccess));
      setSelectedProjects(
        (subuser.projects || []).map((p) => (typeof p === 'object' ? p._id : p))
      );
      setSelectedStores(
        (subuser.stores || []).map((s) => (typeof s === 'object' ? s._id : s))
      );
    } else {
      setName('');
      setEmail('');
      setUserId('');
      setPhone('');
      setPassword('');
      setAllowedPages(['/scanner', '/(tabs)', '/stores', '/challans']);
      setHasInspectionAccess(false);
      setSelectedProjects([]);
      setSelectedStores([]);
    }
  }, [subuser, visible]);

  // Compute allowed projects within parent's scope
  const parentProjects = useMemo(() => {
    if (currentUser?.role === 'Admin') return allProjects;
    const myProjIds = (currentUser?.projects || []).map((p: any) =>
      typeof p === 'object' ? p._id : p
    );
    return allProjects.filter((p) => myProjIds.includes(p._id));
  }, [allProjects, currentUser]);

  // Compute allowed stores within parent's scope
  const parentStores = useMemo(() => {
    if (currentUser?.role === 'Admin') return allStores;
    const myStoreIds = (currentUser?.stores || []).map((s: any) =>
      typeof s === 'object' ? s._id : s
    );
    return allStores.filter((s) => myStoreIds.includes(s._id));
  }, [allStores, currentUser]);

  const canGrantInspection = Boolean(
    currentUser?.role === 'Admin' || (currentUser as any)?.hasInspectionAccess
  );

  const togglePage = (path: string) => {
    setAllowedPages((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
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

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        user_id: userId.trim().toUpperCase(),
        phonenumber: phone.trim() || 'N/A',
        allowedPages,
        hasInspectionAccess,
        projects: selectedProjects,
        stores: selectedStores,
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
            <UserPlus size={22} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>
              {isEdit ? 'Edit Subuser Team Account' : 'New Subuser Team Account'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Delegated account with access strictly limited to your scope.
            </Text>
          </View>
        </View>

        {/* Inputs */}
        <View style={{ gap: 12 }}>
          <Input
            label="Full Name *"
            placeholder="e.g. Ramesh Kumar"
            value={name}
            onChangeText={setName}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="User ID *"
                placeholder="e.g. SUB-001"
                value={userId}
                onChangeText={setUserId}
                autoCapitalize="characters"
                editable={!isEdit}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Phone Number"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <Input
            label="Email Address *"
            placeholder="e.g. ramesh.sub@landt.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label={isEdit ? 'Update Password (leave blank to keep current)' : 'Password *'}
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Quality Inspection Permission Toggle */}
        {canGrantInspection && (
          <View
            style={[
              styles.toggleBox,
              {
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderColor: theme.border,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 }}>
              <View style={[styles.smallIconBox, { backgroundColor: '#ECFDF5' }]}>
                <ClipboardCheck size={18} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>
                  Quality Inspection Access
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                  Allow this subuser to perform tool inspections (Pass/Fail) and update validation periods.
                </Text>
              </View>
            </View>

            <Switch
              value={hasInspectionAccess}
              onValueChange={setHasInspectionAccess}
              trackColor={{ false: '#94A3B8', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}

        {/* Allowed Pages Checkboxes */}
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Permitted Navigation Modules
          </Text>
          <View style={styles.pillsWrap}>
            {AVAILABLE_PAGES.map((page) => {
              const isSelected = allowedPages.includes(page.path);
              return (
                <TouchableOpacity
                  key={page.path}
                  activeOpacity={0.7}
                  onPress={() => togglePage(page.path)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(79, 70, 229, 0.2)'
                          : '#EEF2FF'
                        : theme.surface,
                      borderColor: isSelected ? '#4F46E5' : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color: isSelected ? '#4F46E5' : theme.text,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {page.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Assigned Projects Scope */}
        {parentProjects.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <FolderGit2 size={16} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Project Scopes ({selectedProjects.length} Selected)
              </Text>
            </View>
            <View style={styles.pillsWrap}>
              {parentProjects.map((p) => {
                const isSelected = selectedProjects.includes(p._id);
                return (
                  <TouchableOpacity
                    key={p._id}
                    activeOpacity={0.7}
                    onPress={() => toggleProject(p._id)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(16, 185, 129, 0.2)'
                            : '#ECFDF5'
                          : theme.surface,
                        borderColor: isSelected ? '#10B981' : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color: isSelected ? '#047857' : theme.text,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Assigned Stores Scope */}
        {parentStores.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Store size={16} color="#D97706" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Store / Warehouse Scopes ({selectedStores.length} Selected)
              </Text>
            </View>
            <View style={styles.pillsWrap}>
              {parentStores.map((s) => {
                const isSelected = selectedStores.includes(s._id);
                return (
                  <TouchableOpacity
                    key={s._id}
                    activeOpacity={0.7}
                    onPress={() => toggleStore(s._id)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(217, 119, 6, 0.2)'
                            : '#FFFBEB'
                          : theme.surface,
                        borderColor: isSelected ? '#D97706' : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color: isSelected ? '#B45309' : theme.text,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
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
            title={submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Subuser'}
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
    marginBottom: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  smallIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
