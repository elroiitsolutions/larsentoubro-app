import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Shield, Trash2, Check, Lock, User as UserIcon, Mail, Phone, Hash } from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import { UserRecord } from '../types';
import { userService } from '../services/userService';

interface UserFormModalProps {
  visible: boolean;
  onClose: () => void;
  user: UserRecord | null;
  onSuccess: () => void;
}

const ROLES = ['Admin', 'User', 'Vendor', 'Guest'] as const;

const AVAILABLE_PAGES = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Projects', path: '/projects' },
  { label: 'Stores & HUBs', path: '/stores' },
  { label: 'Tools Inventory', path: '/tools' },
  { label: 'Delivery Challans', path: '/challans' },
  { label: 'Vendors & Profiles', path: '/profiles' },
  { label: 'Scrap Register', path: '/scrap' },
  { label: 'Trash Bin', path: '/trash' },
  { label: 'Users & RBAC', path: '/users' },
  { label: 'Settings', path: '/settings' },
];

export const UserFormModal: React.FC<UserFormModalProps> = ({
  visible,
  onClose,
  user,
  onSuccess,
}) => {
  const { theme, isDark } = useAppTheme();
  const isEdit = Boolean(user);

  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [phonenumber, setPhonenumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'User' | 'Vendor' | 'Guest'>('User');
  const [allowedPages, setAllowedPages] = useState<string[]>([
    '/dashboard',
    '/projects',
    '/stores',
    '/tools',
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUserId(user.user_id || '');
      setEmail(user.email || '');
      setPhonenumber(user.phonenumber || user.phone || '');
      setPassword('');
      setRole((user.role as any) || 'User');
      setAllowedPages(
        Array.isArray(user.allowedPages) && user.allowedPages.length > 0
          ? user.allowedPages
          : ['/dashboard', '/projects', '/stores', '/tools']
      );
    } else {
      setName('');
      setUserId('');
      setEmail('');
      setPhonenumber('');
      setPassword('');
      setRole('User');
      setAllowedPages(['/dashboard', '/projects', '/stores', '/tools']);
    }
  }, [user, visible]);

  const togglePagePermission = (path: string) => {
    setAllowedPages((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleSelectAllPages = () => {
    if (allowedPages.length === AVAILABLE_PAGES.length) {
      setAllowedPages([]);
    } else {
      setAllowedPages(AVAILABLE_PAGES.map((p) => p.path));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Required Fields', 'Please enter user name and email.');
      return;
    }

    if (!isEdit && !userId.trim()) {
      Alert.alert('Required Field', 'User ID is required for registration.');
      return;
    }

    if (!isEdit && (!password || password.length < 6)) {
      Alert.alert('Password Error', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phonenumber: phonenumber.trim() || 'N/A',
        role,
        allowedPages,
      };

      if (userId.trim()) {
        payload.user_id = userId.trim().toUpperCase();
      }

      if (password) {
        payload.password = password;
      }

      if (isEdit && user) {
        await userService.updateUser(user._id, payload);
        Alert.alert('Success', 'User profile and permissions updated.');
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
      title={isEdit ? `Edit User: ${user?.name}` : 'Register New User'}
    >
      <ScrollView className="max-h-[75vh]" showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <Input
          label="Full Name *"
          placeholder="e.g. Suresh Kumar"
          value={name}
          onChangeText={setName}
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label="User ID *"
              placeholder="e.g. EMP-1049"
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="characters"
              editable={!isEdit}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Phone Number"
              placeholder="+91 9876543210"
              value={phonenumber}
              onChangeText={setPhonenumber}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <Input
          label="Email Address *"
          placeholder="name@larsentoubro.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label={isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}
          placeholder="Min 6 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        {/* Role Selector */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
            System Role
          </Text>
          <View className="flex-row gap-2">
            {ROLES.map((r) => {
              const isSelected = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  activeOpacity={0.7}
                  onPress={() => setRole(r)}
                  className={`flex-1 py-2 rounded-xl items-center border ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Page Access Permissions */}
        <View className="mb-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <View className="flex-row items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
            <View className="flex-row items-center gap-1.5">
              <Shield size={14} color="#4F46E5" />
              <Text className="text-xs font-bold text-slate-900 dark:text-white">
                Allowed Pages ({allowedPages.length}/{AVAILABLE_PAGES.length})
              </Text>
            </View>
            <TouchableOpacity onPress={handleSelectAllPages}>
              <Text className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                {allowedPages.length === AVAILABLE_PAGES.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap gap-1.5">
            {AVAILABLE_PAGES.map((pg) => {
              const hasAccess = allowedPages.includes(pg.path);
              return (
                <TouchableOpacity
                  key={pg.path}
                  activeOpacity={0.7}
                  onPress={() => togglePagePermission(pg.path)}
                  className={`flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg border ${
                    hasAccess
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <View
                    className={`w-3.5 h-3.5 rounded items-center justify-center ${
                      hasAccess ? 'bg-emerald-600' : 'border border-slate-400'
                    }`}
                  >
                    {hasAccess && <Check size={10} color="#FFFFFF" />}
                  </View>
                  <Text
                    className={`text-[11px] font-semibold ${
                      hasAccess ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {pg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

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
            title={isEdit ? 'Update User' : 'Create User'}
            onPress={handleSubmit}
            loading={submitting}
          />
        </View>
      </View>
    </Modal>
  );
};
