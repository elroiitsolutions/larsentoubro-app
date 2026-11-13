import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  Shield,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  FolderGit2,
  Store,
  LayoutDashboard,
  ClipboardCheck,
  UserCheck,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { UserRecord } from '../types';
import { validateEmail, validateIndianMobile } from '@/utils/validation';
import { userService } from '../services/userService';
import { DynamicFieldsSection } from '@/components/common/DynamicFieldsSection';
import { formService, FormFieldDefinition } from '@/services/formService';
import { projectService } from '@/features/projects/services/projectService';
import { storeService } from '@/features/stores/services/storeService';

const ALL_PAGES = [
  { title: 'Dashboard', url: '/dashboard' },
  { title: 'Projects', url: '/projects' },
  { title: 'Stores & HUBs', url: '/stores' },
  { title: 'Tools Inventory', url: '/tools' },
  { title: 'Delivery Challans', url: '/challans' },
  { title: 'Profiles Directory', url: '/profiles' },
  { title: 'Scrap Register', url: '/scrap' },
  { title: 'QR Scanner', url: '/scanner' },
];

interface UserFormModalProps {
  visible: boolean;
  onClose: () => void;
  user: UserRecord | null;
  onSuccess: () => void;
}

const ROLES = ['Admin', 'User'] as const;

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Admin: 'Full system & RBAC access',
  User: 'Standard equipment & inventory',
};

export const UserFormModal: React.FC<UserFormModalProps> = ({
  visible,
  onClose,
  user,
  onSuccess,
}) => {
  const { isDark } = useAppTheme();
  const isEdit = Boolean(user);

  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [phonenumber, setPhonenumber] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [role, setRole] = useState<'Admin' | 'User'>('User');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [hasInspectionAccess, setHasInspectionAccess] = useState(false);
  const [canCreateUser, setCanCreateUser] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allStores, setAllStores] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [allFormFields, setAllFormFields] = useState<FormFieldDefinition[] | null>(null);
  const [dynamicFieldsSchema, setDynamicFieldsSchema] = useState<FormFieldDefinition[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch form definition from Forms Management whenever modal opens
  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    async function loadFormSchema() {
      try {
        const schema = await formService.getFormBySlug('user-admin-form');
        if (isMounted && schema && Array.isArray(schema.fields)) {
          const clean = schema.fields.filter(
            (f) => f.name !== 'password' && f.id !== 'password'
          );
          setAllFormFields(clean);
        }
      } catch (err) {
        // Fallback silently if schema cannot be fetched
      }
    }
    loadFormSchema();
    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Fetch available projects and stores
  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    async function loadScopeData() {
      try {
        setLoadingData(true);
        const [projRes, storeRes] = await Promise.all([
          projectService.getProjects().catch(() => []),
          storeService.getStores().catch(() => []),
        ]);
        if (isMounted) {
          setAllProjects(Array.isArray(projRes) ? projRes : (projRes as any)?.data || []);
          setAllStores(Array.isArray(storeRes) ? storeRes : (storeRes as any)?.data || []);
        }
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }
    loadScopeData();
    return () => {
      isMounted = false;
    };
  }, [visible]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUserId(user.user_id || '');
      setEmail(user.email || '');
      setPhonenumber(user.phonenumber || user.phone || '');
      setStatus((user.status as any) === 'Inactive' ? 'Inactive' : 'Active');
      setRole(user.role === 'Admin' ? 'Admin' : 'User');
      setRoleDropdownOpen(false);

      setAllowedPages(
        Array.isArray(user.allowedPages) && user.allowedPages.length > 0
          ? user.allowedPages
          : ['/dashboard', '/projects', '/stores', '/tools']
      );
      setHasInspectionAccess(Boolean(user.hasInspectionAccess));
      setCanCreateUser(Boolean(user.canCreateUser));
      setSelectedProjects((user.projects || []).map((p: any) => typeof p === 'object' ? p._id : p));
      setSelectedStores((user.stores || []).map((s: any) => typeof s === 'object' ? s._id : s));

      const raw = user as any;
      const initialCustom: Record<string, any> = { ...raw };
      if (raw.customFields && typeof raw.customFields === 'object') {
        Object.assign(initialCustom, raw.customFields);
      }
      setCustomFields(initialCustom);
    } else {
      setName('');
      setUserId('');
      setEmail('');
      setPhonenumber('');
      setStatus('Active');
      setRole('User');
      setRoleDropdownOpen(false);
      setAllowedPages(['/dashboard', '/projects', '/stores', '/tools']);
      setHasInspectionAccess(false);
      setCanCreateUser(false);
      setSelectedProjects([]);
      setSelectedStores([]);
      setCustomFields({});
    }
  }, [user, visible]);

  const togglePage = (url: string) => {
    setAllowedPages((prev) =>
      prev.includes(url) ? prev.filter((p) => p !== url) : [...prev, url]
    );
  };

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleStore = (id: string) => {
    setSelectedStores((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Determine whether fields exist and whether they are required in Forms Management schema
  const hasNameField = allFormFields
    ? allFormFields.some((f) => f.name?.toLowerCase() === 'name')
    : true;
  const nameField = allFormFields?.find((f) => f.name?.toLowerCase() === 'name');
  const isNameRequired = nameField
    ? Boolean(nameField.required || nameField.validations?.some((v: any) => v.type === 'required'))
    : true;

  const hasUserIdField = allFormFields
    ? allFormFields.some((f) => f.name?.toLowerCase() === 'user_id')
    : true;
  const userIdField = allFormFields?.find((f) => f.name?.toLowerCase() === 'user_id');
  const isUserIdRequired = userIdField
    ? Boolean(userIdField.required || userIdField.validations?.some((v: any) => v.type === 'required'))
    : true;

  const hasPhoneField = allFormFields
    ? allFormFields.some((f) => f.name?.toLowerCase() === 'phonenumber' || f.name?.toLowerCase() === 'phone')
    : true;
  const phoneField = allFormFields?.find(
    (f) => f.name?.toLowerCase() === 'phonenumber' || f.name?.toLowerCase() === 'phone'
  );
  const isPhoneRequired = phoneField
    ? Boolean(phoneField.required || phoneField.validations?.some((v: any) => v.type === 'required'))
    : true;

  const hasEmailField = allFormFields
    ? allFormFields.some((f) => f.name?.toLowerCase() === 'email')
    : true;
  const emailField = allFormFields?.find((f) => f.name?.toLowerCase() === 'email');
  const isEmailRequired = emailField
    ? Boolean(emailField.required || emailField.validations?.some((v: any) => v.type === 'required'))
    : true;

  // Account Status: Only shown if present in the Forms Management schema
  const hasStatusField = allFormFields
    ? allFormFields.some((f) => f.name?.toLowerCase() === 'status' || f.id?.toLowerCase() === 'status')
    : false;
  const statusField = allFormFields?.find(
    (f) => f.name?.toLowerCase() === 'status' || f.id?.toLowerCase() === 'status'
  );
  const isStatusRequired = statusField
    ? Boolean(statusField.required || statusField.validations?.some((v: any) => v.type === 'required'))
    : false;

  const hasRoleField = allFormFields
    ? allFormFields.some((f) => f.name?.toLowerCase() === 'role' || f.id?.toLowerCase() === 'role')
    : true;
  const roleField = allFormFields?.find(
    (f) => f.name?.toLowerCase() === 'role' || f.id?.toLowerCase() === 'role'
  );
  const isRoleRequired = roleField
    ? Boolean(roleField.required || roleField.validations?.some((v: any) => v.type === 'required'))
    : true;

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (hasNameField && isNameRequired && !name.trim()) {
      Alert.alert('Required Field', 'Please enter full name.');
      return;
    }

    if (hasUserIdField && isUserIdRequired && !userId.trim()) {
      Alert.alert('Required Field', 'User ID is required for registration.');
      return;
    }

    if (hasEmailField) {
      if (isEmailRequired && !cleanEmail) {
        Alert.alert('Required Field', 'Please enter email address.');
        return;
      }
      if (cleanEmail) {
        const emailCheck = validateEmail(cleanEmail);
        if (!emailCheck.isValid) {
          Alert.alert(
            'Invalid Email',
            emailCheck.error || "Email address must contain '@' and '.'."
          );
          return;
        }
      }
    }

    if (hasPhoneField) {
      if (isPhoneRequired && !phonenumber.trim()) {
        Alert.alert('Required Field', 'Please enter a valid phone number.');
        return;
      }
      if (phonenumber.trim()) {
        const phoneCheck = validateIndianMobile(phonenumber.trim(), 'Phone Number');
        if (!phoneCheck.isValid) {
          Alert.alert('Invalid Phone Number', phoneCheck.error || 'Must be a 10-digit Indian phone number.');
          return;
        }
      }
    }

    // Validate any custom fields configured as required in Forms Management
    for (const field of dynamicFieldsSchema) {
      const isRequired = field.required || field.validations?.some((v: any) => v.type === 'required');
      const val = customFields[field.name];
      if (isRequired && (val === undefined || val === null || (typeof val === 'string' && val.trim() === ''))) {
        Alert.alert('Required Field', `Please enter ${field.label}.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload: any = {
        ...customFields,
        name: name.trim(),
        user_id: userId.trim().toUpperCase(),
        email: cleanEmail,
        phonenumber: phonenumber.trim(),
        role: hasRoleField ? role : 'User',
        status: hasStatusField ? status : 'Active',
      };

      if (role === 'Admin') {
        payload.allowedPages = [
          '/qr-scanner',
          '/dashboard',
          '/projects',
          '/stores',
          '/tools',
          '/users',
          '/settings',
        ];
        payload.projects = [];
        payload.stores = [];
        payload.hasInspectionAccess = true;
        payload.canCreateUser = true;
      } else {
        payload.allowedPages = allowedPages;
        payload.projects = selectedProjects;
        payload.stores = selectedStores;
        payload.hasInspectionAccess = hasInspectionAccess;
        payload.canCreateUser = canCreateUser;
      }

      if (isEdit && user) {
        await userService.updateUser(user._id, payload);
        Alert.alert('Success', 'User profile updated successfully.');
      } else {
        await userService.createUser(payload);
        Alert.alert('Success', 'New user registered successfully.');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Save Failed',
        err?.response?.data?.message || err?.message || 'Could not save user record.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!user) return;
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete user "${user.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await userService.deleteUser(user._id);
              Alert.alert('User Deleted', 'The user account has been removed.');
              onSuccess();
              onClose();
            } catch (err: any) {
              Alert.alert(
                'Delete Failed',
                err?.response?.data?.message || err?.message || 'Could not delete user.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEdit ? (user?.name ? `Edit User / Admin: ${user.name}` : 'Edit User / Admin') : 'Create User / Admin'}
    >
      <ScrollView className="max-h-[75vh]" showsVerticalScrollIndicator={false}>
        {/* Full Name */}
        {hasNameField && (
          <Input
            label={`Full Name ${isNameRequired ? '*' : ''}`}
            placeholder="e.g. Rajesh Kumar"
            value={name}
            onChangeText={setName}
          />
        )}

        {/* User ID & Phone Number */}
        <View className="flex-row gap-3">
          {hasUserIdField && (
            <View className="flex-1">
              <Input
                label={`User ID ${isUserIdRequired ? '*' : ''}`}
                placeholder="e.g. EMP-1049"
                value={userId}
                onChangeText={setUserId}
                autoCapitalize="characters"
                editable={!isEdit}
              />
            </View>
          )}
          {hasPhoneField && (
            <View className="flex-1">
              <Input
                label={`Phone Number ${isPhoneRequired ? '*' : ''}`}
                placeholder="e.g. 9876543210"
                value={phonenumber}
                onChangeText={(text) => setPhonenumber(text.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
                keyboardType="phone-pad"
              />
            </View>
          )}
        </View>

        {/* Email Address */}
        {hasEmailField && (
          <Input
            label={`Email Address ${isEmailRequired ? '*' : ''}`}
            placeholder="name@larsentoubro.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}

        {/* Account Status Selector (only displayed if configured in Forms Management) */}
        {hasStatusField && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '700',
                textTransform: 'uppercase',
                color: isDark ? '#CBD5E1' : '#334155',
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              Account Status {isStatusRequired ? '*' : ''}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Active option */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setStatus('Active')}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor:
                    status === 'Active'
                      ? '#10B981'
                      : isDark
                      ? '#2E2E33'
                      : '#E2E8F0',
                  backgroundColor:
                    status === 'Active'
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.15)'
                        : '#ECFDF5'
                      : isDark
                      ? '#1E1E1E'
                      : '#FFFFFF',
                }}
              >
                <CheckCircle2
                  size={16}
                  color={status === 'Active' ? '#10B981' : '#94A3B8'}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: status === 'Active' ? '700' : '500',
                    color:
                      status === 'Active'
                        ? isDark
                          ? '#A7F3D0'
                          : '#065F46'
                        : isDark
                        ? '#94A3B8'
                        : '#64748B',
                  }}
                >
                  Active
                </Text>
              </TouchableOpacity>

              {/* Inactive option */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setStatus('Inactive')}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor:
                    status === 'Inactive'
                      ? '#F43F5E'
                      : isDark
                      ? '#2E2E33'
                      : '#E2E8F0',
                  backgroundColor:
                    status === 'Inactive'
                      ? isDark
                        ? 'rgba(244, 63, 94, 0.15)'
                        : '#FFF1F2'
                      : isDark
                      ? '#1E1E1E'
                      : '#FFFFFF',
                }}
              >
                <XCircle
                  size={16}
                  color={status === 'Inactive' ? '#F43F5E' : '#94A3B8'}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: status === 'Inactive' ? '700' : '500',
                    color:
                      status === 'Inactive'
                        ? isDark
                          ? '#FDA4AF'
                          : '#9F1239'
                        : isDark
                        ? '#94A3B8'
                        : '#64748B',
                  }}
                >
                  Inactive
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* System Role Dropdown */}
        {hasRoleField && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '700',
                textTransform: 'uppercase',
                color: isDark ? '#CBD5E1' : '#334155',
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              System Role (RBAC) {isRoleRequired ? '*' : ''}
            </Text>

            {/* Dropdown Trigger */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setRoleDropdownOpen((prev) => !prev)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                paddingVertical: 11,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: roleDropdownOpen
                  ? '#4F46E5'
                  : isDark
                  ? '#2E2E33'
                  : '#E2E8F0',
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: isDark
                      ? 'rgba(79, 70, 229, 0.2)'
                      : '#EEF2FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield size={16} color="#4F46E5" />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: isDark ? '#FFFFFF' : '#0F172A',
                    }}
                  >
                    {role}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    {ROLE_DESCRIPTIONS[role]}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: isDark ? '#2E2E33' : '#F1F5F9',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: isDark ? '#94A3B8' : '#64748B',
                    }}
                  >
                    Select
                  </Text>
                </View>
                {roleDropdownOpen ? (
                  <ChevronUp size={16} color="#64748B" />
                ) : (
                  <ChevronDown size={16} color="#64748B" />
                )}
              </View>
            </TouchableOpacity>

            {/* Dropdown Menu Options */}
            {roleDropdownOpen && (
              <View
                style={{
                  marginTop: 6,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isDark ? '#2E2E33' : '#CBD5E1',
                  backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                  overflow: 'hidden',
                  elevation: 6,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                }}
              >
                {ROLES.map((r, index) => {
                  const isSelected = role === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      activeOpacity={0.7}
                      onPress={() => {
                        setRole(r);
                        setRoleDropdownOpen(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderBottomWidth: index === ROLES.length - 1 ? 0 : 1,
                        borderBottomColor: isDark ? '#2E2E33' : '#F1F5F9',
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(79, 70, 229, 0.15)'
                            : '#EEF2FF'
                          : 'transparent',
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <View>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: isSelected ? '700' : '500',
                              color: isSelected
                                ? '#4F46E5'
                                : isDark
                                ? '#FFFFFF'
                                : '#0F172A',
                            }}
                          >
                            {r}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#64748B' }}>
                            {ROLE_DESCRIPTIONS[r]}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: '#4F46E5',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Role Description Note */}
            <View
              style={{
                marginTop: 8,
                padding: 10,
                borderRadius: 10,
                backgroundColor: isDark ? '#1E1E1E' : '#F8FAFC',
                borderWidth: 1,
                borderColor: isDark ? '#2E2E33' : '#E2E8F0',
              }}
            >
              {role === 'Admin' ? (
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '500',
                    color: isDark ? '#60A5FA' : '#2563EB',
                  }}
                >
                  <Text style={{ fontWeight: '700' }}>Admin: </Text>
                  Unrestricted access across all Projects, Stores, Tools, Reports, and System Settings.
                </Text>
              ) : (
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '500',
                    color: isDark ? '#94A3B8' : '#64748B',
                  }}
                >
                  <Text style={{ fontWeight: '700' }}>User: </Text>
                  Standard access scope governed by assigned Projects, Stores, and Page Permissions.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* User Permission & Scope Configuration */}
        {role === 'User' && (
          <View style={{ gap: 12, marginBottom: 16 }}>
            {/* 1. Page Permissions */}
            <View
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: isDark ? '#1E1E1E' : '#F8FAFC',
                borderWidth: 1,
                borderColor: isDark ? '#2E2E33' : '#E2E8F0',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <LayoutDashboard size={15} color="#4F46E5" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#E2E8F0' : '#1E293B' }}>
                    Allowed Pages ({allowedPages.length} of {ALL_PAGES.length} Granted)
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (allowedPages.length === ALL_PAGES.length) {
                      setAllowedPages([]);
                    } else {
                      setAllowedPages(ALL_PAGES.map((p) => p.url));
                    }
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#4F46E5' }}>
                    {allowedPages.length === ALL_PAGES.length ? 'Revoke All' : 'Grant All'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {ALL_PAGES.map((page) => {
                  const isChecked = allowedPages.includes(page.url);
                  return (
                    <TouchableOpacity
                      key={page.url}
                      activeOpacity={0.7}
                      onPress={() => togglePage(page.url)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        borderRadius: 8,
                        borderWidth: 1,
                        backgroundColor: isChecked
                          ? (isDark ? '#312E81' : '#EEF2FF')
                          : (isDark ? '#262626' : '#FFFFFF'),
                        borderColor: isChecked ? '#4F46E5' : (isDark ? '#3E3E42' : '#CBD5E1'),
                      }}
                    >
                      {isChecked ? (
                        <CheckCircle2 size={12} color="#4F46E5" />
                      ) : (
                        <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: '#94A3B8' }} />
                      )}
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: isChecked ? '700' : '500',
                          color: isChecked ? (isDark ? '#C7D2FE' : '#3730A3') : (isDark ? '#94A3B8' : '#475569'),
                        }}
                      >
                        {page.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Tool Inspection & Subuser Privileges */}
            <View
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: isDark ? '#1E1E1E' : '#F8FAFC',
                borderWidth: 1,
                borderColor: isDark ? '#2E2E33' : '#E2E8F0',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 10,
                  borderBottomWidth: 1,
                  borderColor: isDark ? '#2E2E33' : '#E2E8F0',
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ClipboardCheck size={14} color="#059669" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#E2E8F0' : '#1E293B' }}>
                      Tool Inspection Access
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                    Allows user to conduct tool inspections & record Pass/Fail status.
                  </Text>
                </View>
                <Switch
                  value={hasInspectionAccess}
                  onValueChange={setHasInspectionAccess}
                  trackColor={{ false: '#CBD5E1', true: '#059669' }}
                />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 10,
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <UserCheck size={14} color="#4F46E5" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#E2E8F0' : '#1E293B' }}>
                      Can Create Subusers
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                    Allows user to manage their own subuser team accounts.
                  </Text>
                </View>
                <Switch
                  value={canCreateUser}
                  onValueChange={setCanCreateUser}
                  trackColor={{ false: '#CBD5E1', true: '#4F46E5' }}
                />
              </View>
            </View>

            {/* 3. Assigned Projects & Stores Scope */}
            <View
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: isDark ? '#1E1E1E' : '#F8FAFC',
                borderWidth: 1,
                borderColor: isDark ? '#2E2E33' : '#E2E8F0',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FolderGit2 size={15} color="#4F46E5" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#E2E8F0' : '#1E293B' }}>
                    Inventory Scope (Projects & Stores)
                  </Text>
                </View>
                {loadingData && <ActivityIndicator size="small" color="#4F46E5" />}
              </View>

              {/* Projects */}
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6 }}>
                  Assigned Projects ({selectedProjects.length} Selected)
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {allProjects.map((p) => {
                    const isSel = selectedProjects.includes(p._id);
                    return (
                      <TouchableOpacity
                        key={p._id}
                        activeOpacity={0.7}
                        onPress={() => toggleProject(p._id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 8,
                          borderWidth: 1,
                          backgroundColor: isSel
                            ? '#4F46E5'
                            : (isDark ? '#262626' : '#FFFFFF'),
                          borderColor: isSel ? '#4F46E5' : (isDark ? '#3E3E42' : '#CBD5E1'),
                        }}
                      >
                        <FolderGit2 size={11} color={isSel ? '#FFFFFF' : '#64748B'} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: isSel ? '700' : '500',
                            color: isSel ? '#FFFFFF' : (isDark ? '#E2E8F0' : '#334155'),
                          }}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {allProjects.length === 0 && (
                    <Text style={{ fontSize: 11, fontStyle: 'italic', color: '#94A3B8' }}>
                      No projects available.
                    </Text>
                  )}
                </View>
              </View>

              {/* Stores */}
              <View style={{ paddingTop: 8, borderTopWidth: 1, borderColor: isDark ? '#2E2E33' : '#E2E8F0' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6 }}>
                  Assigned Stores ({selectedStores.length} Selected)
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {allStores.map((s) => {
                    const isSel = selectedStores.includes(s._id);
                    return (
                      <TouchableOpacity
                        key={s._id}
                        activeOpacity={0.7}
                        onPress={() => toggleStore(s._id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 8,
                          borderWidth: 1,
                          backgroundColor: isSel
                            ? '#059669'
                            : (isDark ? '#262626' : '#FFFFFF'),
                          borderColor: isSel ? '#059669' : (isDark ? '#3E3E42' : '#CBD5E1'),
                        }}
                      >
                        <Store size={11} color={isSel ? '#FFFFFF' : '#64748B'} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: isSel ? '700' : '500',
                            color: isSel ? '#FFFFFF' : (isDark ? '#E2E8F0' : '#334155'),
                          }}
                        >
                          {s.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {allStores.length === 0 && (
                    <Text style={{ fontSize: 11, fontStyle: 'italic', color: '#94A3B8' }}>
                      No stores available.
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Dynamic Custom Fields configured in Forms Management (seamlessly inline, no box, no header) */}
        <DynamicFieldsSection
          slug="user-admin-form"
          values={customFields}
          onChange={(key, val) => setCustomFields((prev) => ({ ...prev, [key]: val }))}
          onFieldsLoaded={setDynamicFieldsSchema}
          excludeFieldNames={['name', 'user_id', 'email', 'phonenumber', 'phone', 'role', 'status', 'password']}
        />

        {/* Delete button if editing */}
        {isEdit && (
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            className="flex-row items-center justify-center gap-2 py-2.5 mb-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900"
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#E11D48" />
            ) : (
              <>
                <Trash2 size={14} color="#E11D48" />
                <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Delete User Account
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Footer Buttons */}
      <View className="flex-row gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
        <View className="flex-1">
          <Button title="Cancel" variant="outline" onPress={onClose} />
        </View>
        <View className="flex-1">
          <Button
            title={isEdit ? 'Update User / Admin' : 'Create User / Admin'}
            onPress={handleSubmit}
            loading={submitting}
          />
        </View>
      </View>
    </Modal>
  );
};

export default UserFormModal;
