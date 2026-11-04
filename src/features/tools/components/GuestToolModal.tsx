import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal as RNModal,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Store,
  Calendar,
  Tag,
} from 'lucide-react-native';
import { ToolValidityData } from '../types';

export interface GuestToolModalProps {
  visible: boolean;
  tool: ToolValidityData | any | null;
  onClose: () => void;
}

export const GuestToolModal: React.FC<GuestToolModalProps> = ({
  visible,
  tool,
  onClose,
}) => {
  if (!visible || !tool) return null;

  // Extract fields safely whether coming from lookupToolValidity or raw ToolRecord
  const toolId =
    tool.toolId || tool.toolCode || (tool.serialNumber ? String(tool.serialNumber) : '-');
  const description =
    tool.description || tool.name || tool.toolName || 'Industrial Tool';

  const project =
    typeof tool.project === 'object'
      ? tool.project?.name || tool.project?.code || 'N/A'
      : tool.project || tool.projectName || 'N/A';

  const store =
    typeof tool.store === 'object'
      ? tool.store?.name || tool.store?.siteName || 'N/A'
      : typeof tool.currentSite === 'object'
      ? tool.currentSite?.name || tool.currentSite?.siteName || 'N/A'
      : tool.store || tool.currentSite || tool.storeName || 'N/A';

  const expiryDate =
    tool.expiryDate ||
    tool.nextInspectionDueDateFormatted ||
    tool.nextInspectionDate ||
    'N/A';

  const validityStatus: 'VALID' | 'EXPIRED' | 'INVALID_EXPIRY' =
    tool.validityStatus || (tool.isValid ? 'VALID' : 'EXPIRED');

  const status = tool.status || 'Available';

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Dimmed backdrop area (tapping dismisses) */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        {/* Guest Tool Modal Card (Exact Match to Web/Old Guest Scanner Popup) */}
        <View style={styles.card}>
          {/* 1. Validity Status Indicator Banner */}
          {validityStatus === 'VALID' ? (
            <View style={styles.validBanner}>
              <View style={styles.validIconContainer}>
                <CheckCircle2 size={22} color="#34D399" />
              </View>
              <View style={styles.bannerTextCol}>
                <View style={styles.bannerHeaderRow}>
                  <Text style={styles.validTitle}>VALID</Text>
                  <View style={styles.validBadge}>
                    <Text style={styles.validBadgeText}>Tool Approved</Text>
                  </View>
                </View>
                <Text style={styles.validSubtitle}>
                  Tool is within valid operational inspection period.
                </Text>
              </View>
            </View>
          ) : validityStatus === 'EXPIRED' ? (
            <View style={styles.expiredBanner}>
              <View style={styles.expiredIconContainer}>
                <XCircle size={22} color="#F87171" />
              </View>
              <View style={styles.bannerTextCol}>
                <View style={styles.bannerHeaderRow}>
                  <Text style={styles.expiredTitle}>EXPIRED</Text>
                  <View style={styles.expiredBadge}>
                    <Text style={styles.expiredBadgeText}>Action Required</Text>
                  </View>
                </View>
                <Text style={styles.expiredSubtitle}>
                  Tool expiry date has passed. Re-inspection required.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.warningBanner}>
              <View style={styles.warningIconContainer}>
                <AlertTriangle size={22} color="#FBBF24" />
              </View>
              <View style={styles.bannerTextCol}>
                <View style={styles.bannerHeaderRow}>
                  <Text style={styles.warningTitle}>NO EXPIRY DATE</Text>
                  <View style={styles.warningBadge}>
                    <Text style={styles.warningBadgeText}>Unspecified</Text>
                  </View>
                </View>
                <Text style={styles.warningSubtitle}>
                  Expiry date is missing or not configured for this tool.
                </Text>
              </View>
            </View>
          )}

          {/* 2. Tool Title & Header */}
          <View style={styles.titleSection}>
            <Text style={styles.toolTitle} numberOfLines={2}>
              {description}
            </Text>
            <View style={styles.toolMetaRow}>
              <View style={styles.tagChip}>
                <Tag size={12} color="#34D399" />
                <Text style={styles.tagText}>{toolId}</Text>
              </View>
              <Text style={styles.statusLabel}>
                Status: <Text style={styles.statusValue}>{status}</Text>
              </Text>
            </View>
          </View>

          {/* 3. Detailed Fields Grid */}
          <View style={styles.gridCard}>
            {/* Project Row */}
            <View style={styles.gridRow}>
              <View style={styles.gridLabelGroup}>
                <Building2 size={15} color="#34D399" />
                <Text style={styles.gridLabel}>Project</Text>
              </View>
              <Text style={styles.gridValue} numberOfLines={1}>
                {project}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Store Row */}
            <View style={styles.gridRow}>
              <View style={styles.gridLabelGroup}>
                <Store size={15} color="#34D399" />
                <Text style={styles.gridLabel}>Store</Text>
              </View>
              <Text style={styles.gridValue} numberOfLines={1}>
                {store}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Expiry Date Row */}
            <View style={styles.gridRow}>
              <View style={styles.gridLabelGroup}>
                <Calendar size={15} color="#34D399" />
                <Text style={styles.gridLabel}>Expiry Date</Text>
              </View>
              <Text
                style={[
                  styles.expiryValue,
                  validityStatus === 'VALID'
                    ? styles.expiryValid
                    : validityStatus === 'EXPIRED'
                    ? styles.expiryExpired
                    : styles.expiryWarning,
                ]}
              >
                {expiryDate}
              </Text>
            </View>
          </View>

          {/* 4. Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>Scan Another QR Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },

  // Valid Banner
  validBanner: {
    backgroundColor: 'rgba(6, 78, 59, 0.85)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  validIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  validTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#10B981',
  },
  validBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  validBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  validSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#A7F3D0',
    marginTop: 3,
    lineHeight: 15,
  },

  // Expired Banner
  expiredBanner: {
    backgroundColor: 'rgba(76, 5, 25, 0.85)',
    borderColor: 'rgba(244, 63, 94, 0.45)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiredIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expiredTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#F43F5E',
  },
  expiredBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  expiredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FDA4AF',
  },
  expiredSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FECDD3',
    marginTop: 3,
    lineHeight: 15,
  },

  // Warning / No Expiry Banner
  warningBanner: {
    backgroundColor: 'rgba(69, 26, 3, 0.85)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#FBBF24',
  },
  warningBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  warningBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FDE68A',
  },
  warningSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FEF3C7',
    marginTop: 3,
    lineHeight: 15,
  },

  bannerTextCol: {
    flex: 1,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Title Section
  titleSection: {
    marginTop: 16,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  toolMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  statusValue: {
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Grid Card
  gridCard: {
    marginTop: 14,
    backgroundColor: '#070D1E',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  gridLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    maxWidth: '55%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 8,
  },
  expiryValue: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  expiryValid: {
    color: '#34D399',
  },
  expiryExpired: {
    color: '#F87171',
  },
  expiryWarning: {
    color: '#FBBF24',
  },

  // Action Button
  actionButton: {
    marginTop: 16,
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

