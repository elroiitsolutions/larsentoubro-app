/**
 * Toast.tsx — lightweight, non-blocking toast notification system for React Native.
 * Parity with `sonner` toast used in the web client.
 *
 * Usage:
 *   import { Toast, useToast } from '@/components/ui/Toast';
 *
 *   // In root layout — render once:
 *   <Toast />
 *
 *   // Anywhere in the app:
 *   const { toast } = useToast();
 *   toast.success('Delivery Challan DC-26-013 created successfully!');
 *   toast.error('Failed to create challan.');
 *   toast.info('Loading profiles...');
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { CheckCircle2, XCircle, Info, X, AlertTriangle } from 'lucide-react-native';
import { create } from 'zustand';

/* ─── Types ─────────────────────────────────────────────────── */

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

/* ─── Zustand store ──────────────────────────────────────────── */

interface ToastStore {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, 'id'>) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...toast, id }] }));
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/* ─── Imperative toast API (mirrors sonner's API) ────────────── */

export const toast = {
  success: (message: string, duration = 3500) =>
    useToastStore.getState().add({ message, variant: 'success', duration }),
  error: (message: string, duration = 5000) =>
    useToastStore.getState().add({ message, variant: 'error', duration }),
  info: (message: string, duration = 3500) =>
    useToastStore.getState().add({ message, variant: 'info', duration }),
  warning: (message: string, duration = 4000) =>
    useToastStore.getState().add({ message, variant: 'warning', duration }),
};

/* ─── Hook (matches web `const { toast } = useToast()` pattern) */

export const useToast = () => ({ toast });

/* ─── Single toast item renderer ────────────────────────────── */

const VARIANT_CONFIG = {
  success: { bg: '#052E16', border: '#166534', text: '#DCFCE7', icon: CheckCircle2, iconColor: '#4ADE80' },
  error:   { bg: '#450A0A', border: '#991B1B', text: '#FEE2E2', icon: XCircle,      iconColor: '#F87171' },
  warning: { bg: '#422006', border: '#92400E', text: '#FEF3C7', icon: AlertTriangle, iconColor: '#FBBF24' },
  info:    { bg: '#0C1A2E', border: '#1D4ED8', text: '#DBEAFE', icon: Info,          iconColor: '#60A5FA' },
};

function ToastItemView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const cfg = VARIANT_CONFIG[item.variant];
  const IconComponent = cfg.icon;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
    ]).start();

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 10, duration: 250, useNativeDriver: true }),
      ]).start(onDismiss);
    }, item.duration ?? 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <IconComponent size={16} color={cfg.iconColor} style={{ flexShrink: 0 }} />
      <Text style={[styles.toastText, { color: cfg.text }]} numberOfLines={4}>
        {item.message}
      </Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={14} color={cfg.text} />
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Toast container — render once at root layout ──────────── */

export function Toast() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItemView key={t.id} item={t} onDismiss={() => remove(t.id)} />
      ))}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
    pointerEvents: 'box-none',
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
