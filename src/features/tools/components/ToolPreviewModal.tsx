import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal as RNModal,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Share,
} from 'react-native';
import {
  Tag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Share2,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAppTheme } from '@/context/ThemeContext';
import { toolService } from '../services/toolService';
import { ToolRecord } from '../types';

export interface ToolPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  tool?: any | null;
  toolId?: string | null;
  onViewFullDetails?: () => void;
}

export const ToolPreviewModal: React.FC<ToolPreviewModalProps> = ({
  visible,
  onClose,
  tool,
  toolId,
  onViewFullDetails,
}) => {
  const { isDark } = useAppTheme();
  const [fetchedTool, setFetchedTool] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showShareOption, setShowShareOption] = useState<boolean>(false);
  const [sharingLoading, setSharingLoading] = useState<boolean>(false);

  // Reset share popover when modal closes or opens
  useEffect(() => {
    if (!visible) {
      setShowShareOption(false);
    }
  }, [visible]);

  // Fetch full details if only toolId or partial tool stub is provided
  useEffect(() => {
    let isMounted = true;
    const targetId = toolId || tool?.toolId || tool?.toolCode || tool?._id;

    if (visible && targetId) {
      const hasFullDetails =
        tool &&
        (tool.makeYear ||
          tool.capacity ||
          tool.supplierName ||
          tool.purchaserName ||
          tool.jobCode ||
          tool.toolVariant);

      if (!hasFullDetails) {
        setLoading(true);
        toolService
          .getToolById(targetId)
          .then((res) => {
            if (isMounted && res) {
              setFetchedTool(res);
            }
          })
          .catch((err) => {
            console.warn('ToolPreviewModal: Failed to fetch tool by id:', err);
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });
      } else {
        setFetchedTool(null);
        setLoading(false);
      }
    } else {
      setFetchedTool(null);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [visible, tool, toolId]);

  if (!visible) return null;

  const currentTool = fetchedTool || tool;

  // Helper to extract fields across root and customFields
  const getFieldValue = (key: string, aliases: string[] = []): any => {
    if (!currentTool) return undefined;
    const keysToTry = [key, ...aliases];

    for (const k of keysToTry) {
      if (currentTool[k] !== undefined && currentTool[k] !== null && currentTool[k] !== '') {
        return currentTool[k];
      }
    }

    if (currentTool.customFields) {
      const cf = currentTool.customFields;
      if (typeof cf.get === 'function') {
        for (const k of keysToTry) {
          const val = cf.get(k);
          if (val !== undefined && val !== null && val !== '') return val;
        }
      } else if (typeof cf === 'object') {
        for (const k of keysToTry) {
          if (cf[k] !== undefined && cf[k] !== null && cf[k] !== '') return cf[k];
        }
        const cfKeys = Object.keys(cf);
        for (const k of keysToTry) {
          const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchedKey = cfKeys.find(
            (ck) => ck.toLowerCase().replace(/[^a-z0-9]/g, '') === normK
          );
          if (
            matchedKey &&
            cf[matchedKey] !== undefined &&
            cf[matchedKey] !== null &&
            cf[matchedKey] !== ''
          ) {
            return cf[matchedKey];
          }
        }
      }
    }

    return undefined;
  };

  // Helper to clean up spec values
  const formatSpecValue = (val: any) => {
    if (!val || val === '-') return '-';
    let str = String(val).replace(/^(capacity|swl|safe working load):\s*/i, '').trim();
    if (/^(\d\s+)+\d$/.test(str)) {
      str = str.replace(/\s+/g, '');
    } else {
      str = str.replace(/\s+/g, ' ');
    }
    return str;
  };

  // Date parser helper
  const parseDateHelper = (dateStr: any): Date | null => {
    if (!dateStr || dateStr === '-' || dateStr === 'N/A') return null;
    let str = String(dateStr).trim();

    // Excel serial number
    if (
      !isNaN(Number(str)) &&
      Number(str) > 30000 &&
      Number(str) < 100000 &&
      !str.includes('/') &&
      !str.includes('-')
    ) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const dateObj = new Date(excelEpoch.getTime() + Number(str) * 86400000);
      if (!isNaN(dateObj.getTime())) return dateObj;
    }

    // ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);

        if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
          if (p2 >= 1970 && p2 <= 2100) {
            if (p1 > 12) {
              const d = new Date(p2, p0 - 1, p1);
              if (!isNaN(d.getTime())) return d;
            }
            if (p0 > 12) {
              const d = new Date(p2, p1 - 1, p0);
              if (!isNaN(d.getTime())) return d;
            }
            const d = new Date(p2, p0 - 1, p1);
            if (!isNaN(d.getTime())) return d;
          }
        }
      }
    }

    const fallback = new Date(str);
    if (!isNaN(fallback.getTime())) {
      return fallback;
    }
    return null;
  };

  const formatDateString = (dateVal: any): string => {
    if (!dateVal || dateVal === '-' || dateVal === 'N/A') return '-';
    const d = parseDateHelper(dateVal);
    if (!d || isNaN(d.getTime())) return String(dateVal);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // Title & ID
  const toolName = currentTool?.description || currentTool?.name || 'Tool Information';
  const rawToolId =
    currentTool?.toolId ||
    getFieldValue('toolCode', ['tool_code', 'Tool Code', 'tag', 'Tag']) ||
    toolId ||
    '-';
  const cleanToolId = (rawToolId || '')
    .replace(/^__TRASHED_[^_]+_/, '')
    .replace(/^__RESTORE_TEMP_[^_]+_/, '');

  // Status
  const status = currentTool?.status || 'Usable';
  const isAvailable = status === 'Available' || status === 'Usable';
  const isMoving = status === 'Moving' || status === 'In Use' || status === 'Issued';

  // QR Code Link
  const qrLink =
    currentTool?.qrLink ||
    (cleanToolId !== '-'
      ? `https://lntqr.com/vt/${cleanToolId}`
      : 'https://lntqr.com');

  // Specs
  const makeYearVal =
    getFieldValue('makeYear', ['make_year', 'Make Year', 'year']) ||
    (currentTool?.createdAt ? String(new Date(currentTool.createdAt).getFullYear()) : '-');
  const capacityVal = formatSpecValue(getFieldValue('capacity'));
  const safeWorkingLoadVal = formatSpecValue(
    getFieldValue('safeWorkingLoad', ['swl', 'SWL', 'safe_working_load'])
  );
  const toolVariantVal =
    getFieldValue('toolVariant', ['tool_variant', 'variant', 'Tool Variant']) || '-';
  const toolTypeVal =
    getFieldValue('toolType', ['tool_type', 'toolCategory', 'category', 'Tool Category']) || '-';
  const metalTypeVal =
    getFieldValue('metalType', ['metal_type', 'material', 'Material']) || '-';

  // Supplier & Dates
  const supplierNameVal =
    currentTool?.vendor?.supplierName ||
    getFieldValue('purchaserName', [
      'supplierName',
      'vendorName',
      'purchaser_name',
      'vendor',
      'supplier',
    ]) ||
    '-';
  const dateOfSupplyVal = formatDateString(
    getFieldValue('dateOfSupply', ['date_of_supply', 'receivedDate', 'dateOfReceipt', 'receiptDate'])
  );
  const supplierCodeVal =
    currentTool?.vendor?.supplierCode ||
    getFieldValue('supplierCode', ['vendorCode', 'supplier_code']) ||
    '-';
  const lastInspectionVal = currentTool?.lastInspectionDate
    ? formatDateString(currentTool.lastInspectionDate)
    : getFieldValue('lastInspection') || '-';

  // Job Details
  const jobCodeVal = getFieldValue('jobCode', ['job_code', 'job']) || '-';
  const jobDescriptionVal =
    getFieldValue('jobDescription', ['job_description', 'jobName']) || '-';

  // Validity Logic (Matching web QuickToolViewPage)
  const rawValidity =
    getFieldValue('validityPeriod', ['validation', 'validity', 'validity_period']) ||
    currentTool?.validation ||
    currentTool?.validityPeriod;
  const purchaserStr = String(supplierNameVal || '').trim();
  const isThirdParty = purchaserStr.toLowerCase().includes('third party inspection');

  let resolvedYears = 3;
  if (rawValidity && rawValidity !== 'N/A' && rawValidity !== '-' && String(rawValidity).trim() !== '') {
    const yearsMatch = String(rawValidity).match(/(\d+)/);
    if (yearsMatch) {
      resolvedYears = parseInt(yearsMatch[1], 10);
    } else if (isThirdParty) {
      resolvedYears = 1;
    }
  } else {
    resolvedYears = isThirdParty ? 1 : 3;
  }

  const startDateObj = parseDateHelper(
    currentTool?.validationStartDate ||
      currentTool?.customFields?.validationStartDate ||
      dateOfSupplyVal ||
      currentTool?.createdAt
  );

  let validUntilDate: Date | null = parseDateHelper(
    currentTool?.nextInspectionDueDate ||
      currentTool?.expiryDate ||
      currentTool?.customFields?.nextInspectionDueDate
  );
  if (!validUntilDate && startDateObj) {
    validUntilDate = new Date(startDateObj);
    validUntilDate.setFullYear(validUntilDate.getFullYear() + resolvedYears);
  }

  const validityStatusInfo = (() => {
    if (currentTool?.validityStatus === 'VALID' || currentTool?.isValid === true) {
      return {
        status: 'VALID',
        label: 'VALID',
        badgeText: currentTool?.validityLabel || 'Tool Approved',
        color: 'emerald',
        desc: 'Tool is within valid operational inspection period.',
      };
    }

    if (currentTool?.validityStatus === 'EXPIRED') {
      return {
        status: 'EXPIRED',
        label: 'EXPIRED',
        badgeText: 'Action Required',
        color: 'rose',
        desc: 'Tool expiry date has passed. Re-inspection required.',
      };
    }

    if (!validUntilDate || isNaN(validUntilDate.getTime())) {
      return {
        status: 'INVALID_EXPIRY',
        label: 'NO EXPIRY DATE',
        badgeText: 'Unspecified',
        color: 'amber',
        desc: 'Expiry date is missing or not configured for this tool.',
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(validUntilDate);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate >= today) {
      return {
        status: 'VALID',
        label: 'VALID',
        badgeText: 'Tool Approved',
        color: 'emerald',
        desc: 'Tool is within valid operational inspection period.',
      };
    }

    return {
      status: 'EXPIRED',
      label: 'EXPIRED',
      badgeText: 'Action Required',
      color: 'rose',
      desc: 'Tool expiry date has passed. Re-inspection required.',
    };
  })();

  const handleShareQr = async () => {
    try {
      setShowShareOption(false);
      setSharingLoading(true);

      const cleanName = cleanToolId !== '-' ? cleanToolId : 'Tool';
      const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
        qrLink
      )}`;

      // Generate a pure QR document with ZERO text, ZERO names, and ZERO headers
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${cleanName} QR Code</title>
          <style>
            @page { size: auto; margin: 0; }
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #ffffff;
            }
            .qr-center {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
              padding: 10px;
            }
            img {
              width: 80vmin;
              height: 80vmin;
              max-width: 500px;
              max-height: 500px;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <div class="qr-center">
            <img src="${qrImgSrc}" alt="QR" />
          </div>
        </body>
        </html>
      `;

      if (await Sharing.isAvailableAsync()) {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Share ${cleanName} QR Code`,
        });
        return;
      }

      // System share fallback
      await Share.share({
        title: `${cleanName} QR Code`,
        message: qrLink,
        url: qrLink,
      });
    } catch (err: any) {
      console.warn('Share QR error:', err);
      try {
        await Share.share({
          title: cleanToolId !== '-' ? `${cleanToolId} QR Code` : 'QR Code',
          message: qrLink,
          url: qrLink,
        });
      } catch {
        Alert.alert('Share Link', qrLink);
      }
    } finally {
      setSharingLoading(false);
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Backdrop touch area to dismiss */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (showShareOption) {
              setShowShareOption(false);
            } else {
              onClose();
            }
          }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Modal Dialog Content Card */}
        <View
          style={[
            styles.dialogCard,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#2E2E33' : '#E2E8F0',
            },
          ]}
        >
          {/* Top Close Button (top-right) */}
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.closeBtn}
          >
            <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>

          {loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 10, fontWeight: '600' }}>
                Loading Tool Information...
              </Text>
            </View>
          ) : (
            <View>
              {/* Header: Tool Title, Tag Chip, Status Pill, QR Code */}
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <Text
                    style={[styles.toolTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
                    numberOfLines={2}
                  >
                    {toolName}
                  </Text>

                  <View style={styles.badgesRow}>
                    {/* Tool ID Tag Chip */}
                    {cleanToolId !== '-' && (
                      <View
                        style={[
                          styles.tagBadge,
                          {
                            backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF',
                            borderColor: isDark ? 'rgba(37,99,235,0.3)' : '#BFDBFE',
                          },
                        ]}
                      >
                        <Tag size={11} color="#2563EB" />
                        <Text style={styles.tagBadgeText}>{cleanToolId}</Text>
                      </View>
                    )}

                    {/* Status Pill Badge */}
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isAvailable
                            ? isDark
                              ? 'rgba(16,185,129,0.15)'
                              : '#ECFDF5'
                            : isMoving
                            ? isDark
                              ? 'rgba(245,158,11,0.15)'
                              : '#FFFBEB'
                            : isDark
                            ? 'rgba(239,68,68,0.15)'
                            : '#FEF2F2',
                          borderColor: isAvailable
                            ? isDark
                              ? 'rgba(16,185,129,0.3)'
                              : '#A7F3D0'
                            : isMoving
                            ? isDark
                              ? 'rgba(245,158,11,0.3)'
                              : '#FDE68A'
                            : isDark
                            ? 'rgba(239,68,68,0.3)'
                            : '#FECACA',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: isAvailable
                              ? '#10B981'
                              : isMoving
                              ? '#F59E0B'
                              : '#EF4444',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: isAvailable
                              ? '#059669'
                              : isMoving
                              ? '#D97706'
                              : '#DC2626',
                          },
                        ]}
                      >
                        {status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Top-Right QR Code Graphic Box with Clickable Share Option */}
                <View style={styles.qrContainer}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowShareOption((prev) => !prev)}
                    style={styles.qrInner}
                    accessibilityLabel="Tool QR code. Click to share"
                  >
                    <QRCode
                      value={qrLink}
                      size={54}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                    />
                  </TouchableOpacity>

                  {/* Share Option Menu Popover - Shown ONLY Once User Clicks QR */}
                  {showShareOption && (
                    <View
                      style={[
                        styles.sharePopover,
                        {
                          backgroundColor: isDark ? '#262626' : '#FFFFFF',
                          borderColor: isDark ? '#2E2E33' : '#CBD5E1',
                        },
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleShareQr}
                        disabled={sharingLoading}
                        style={styles.shareOptionBtn}
                      >
                        <View
                          style={[
                            styles.shareOptionIconBox,
                            { backgroundColor: '#EFF6FF' },
                          ]}
                        >
                          {sharingLoading ? (
                            <ActivityIndicator size="small" color="#2563EB" />
                          ) : (
                            <Share2 size={13} color="#2563EB" />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.shareOptionText,
                              { color: isDark ? '#F1F5F9' : '#0F172A' },
                            ]}
                          >
                            Share QR
                          </Text>
                          <Text style={styles.shareOptionSubtext}>
                            Pure QR code image
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Validity Status Banner */}
              <View
                style={[
                  styles.validityBanner,
                  {
                    backgroundColor:
                      validityStatusInfo.status === 'VALID'
                        ? isDark
                          ? 'rgba(16,185,129,0.12)'
                          : '#ECFDF5'
                        : validityStatusInfo.status === 'EXPIRED'
                        ? isDark
                          ? 'rgba(239,68,68,0.12)'
                          : '#FEF2F2'
                        : isDark
                        ? 'rgba(245,158,11,0.12)'
                        : '#FFFBEB',
                    borderColor:
                      validityStatusInfo.status === 'VALID'
                        ? isDark
                          ? 'rgba(16,185,129,0.25)'
                          : '#A7F3D0'
                        : validityStatusInfo.status === 'EXPIRED'
                        ? isDark
                          ? 'rgba(239,68,68,0.25)'
                          : '#FECACA'
                        : isDark
                        ? 'rgba(245,158,11,0.25)'
                        : '#FDE68A',
                  },
                ]}
              >
                <View
                  style={[
                    styles.validityIconCircle,
                    {
                      backgroundColor:
                        validityStatusInfo.status === 'VALID'
                          ? '#D1FAE5'
                          : validityStatusInfo.status === 'EXPIRED'
                          ? '#FEE2E2'
                          : '#FEF3C7',
                    },
                  ]}
                >
                  {validityStatusInfo.status === 'VALID' ? (
                    <CheckCircle2 size={16} color="#059669" />
                  ) : validityStatusInfo.status === 'EXPIRED' ? (
                    <XCircle size={16} color="#DC2626" />
                  ) : (
                    <AlertTriangle size={16} color="#D97706" />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={[
                        styles.validityLabel,
                        {
                          color:
                            validityStatusInfo.status === 'VALID'
                              ? '#047857'
                              : validityStatusInfo.status === 'EXPIRED'
                              ? '#B91C1C'
                              : '#B45309',
                        },
                      ]}
                    >
                      {validityStatusInfo.label}
                    </Text>
                    <View
                      style={[
                        styles.validityBadge,
                        {
                          backgroundColor: isDark ? '#262626' : '#FFFFFF',
                          borderColor: isDark ? '#2E2E33' : '#E2E8F0',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.validityBadgeText,
                          {
                            color:
                              validityStatusInfo.status === 'VALID'
                                ? '#047857'
                                : validityStatusInfo.status === 'EXPIRED'
                                ? '#B91C1C'
                                : '#B45309',
                          },
                        ]}
                      >
                        {validityStatusInfo.badgeText}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.validityDesc,
                      {
                        color:
                          validityStatusInfo.status === 'VALID'
                            ? '#059669'
                            : validityStatusInfo.status === 'EXPIRED'
                            ? '#DC2626'
                            : '#D97706',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {validityStatusInfo.desc}
                  </Text>
                </View>
              </View>

              {/* Specs Section: Compact 3-Column Grid */}
              <View
                style={[
                  styles.specsCard,
                  {
                    backgroundColor: isDark ? '#262626' : '#F8FAFC',
                    borderColor: isDark ? '#2E2E33' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.gridRow3}>
                  <View style={styles.gridCol3}>
                    <Text style={styles.fieldLabel}>MAKE / YEAR</Text>
                    <Text
                      style={[styles.fieldValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
                      numberOfLines={1}
                    >
                      {makeYearVal}
                    </Text>
                  </View>
                  <View style={styles.gridCol3}>
                    <Text style={styles.fieldLabel}>CAPACITY</Text>
                    <Text
                      style={[styles.fieldValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
                      numberOfLines={1}
                    >
                      {capacityVal}
                    </Text>
                  </View>
                  <View style={styles.gridCol3}>
                    <Text style={styles.fieldLabel}>SWL</Text>
                    <Text
                      style={[styles.fieldValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
                      numberOfLines={1}
                    >
                      {safeWorkingLoadVal}
                    </Text>
                  </View>
                </View>

                <View style={[styles.gridRow3, { marginTop: 9 }]}>
                  <View style={styles.gridCol3}>
                    <Text style={styles.fieldLabel}>VARIANT</Text>
                    <Text
                      style={[styles.fieldValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
                      numberOfLines={1}
                    >
                      {toolVariantVal}
                    </Text>
                  </View>
                  <View style={styles.gridCol3}>
                    <Text style={styles.fieldLabel}>CATEGORY</Text>
                    <Text
                      style={[styles.fieldValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
                      numberOfLines={1}
                    >
                      {toolTypeVal}
                    </Text>
                  </View>
                  <View style={styles.gridCol3}>
                    <Text style={styles.fieldLabel}>MATERIAL</Text>
                    <Text
                      style={[styles.fieldValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
                      numberOfLines={1}
                    >
                      {metalTypeVal}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Supplier & Receipt Grid (2-Column) */}
              <View style={{ marginTop: 12 }}>
                <View style={styles.gridRow2}>
                  <View style={styles.gridCol2}>
                    <Text style={styles.fieldLabel}>SUPPLIER NAME</Text>
                    <Text
                      style={[styles.fieldValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
                      numberOfLines={1}
                    >
                      {supplierNameVal}
                    </Text>
                  </View>
                  <View style={styles.gridCol2}>
                    <Text style={styles.fieldLabel}>DATE OF RECEIPT</Text>
                    <Text
                      style={[styles.fieldValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
                      numberOfLines={1}
                    >
                      {dateOfSupplyVal}
                    </Text>
                  </View>
                </View>

                <View style={[styles.gridRow2, { marginTop: 9 }]}>
                  <View style={styles.gridCol2}>
                    <Text style={styles.fieldLabel}>SUPPLIER CODE</Text>
                    <Text
                      style={[styles.fieldValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
                      numberOfLines={1}
                    >
                      {supplierCodeVal}
                    </Text>
                  </View>
                  <View style={styles.gridCol2}>
                    <Text style={styles.fieldLabel}>LAST INSPECTION</Text>
                    <Text
                      style={[styles.fieldValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
                      numberOfLines={1}
                    >
                      {lastInspectionVal}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View
                style={[
                  styles.divider,
                  { backgroundColor: isDark ? '#2E2E33' : '#E2E8F0' },
                ]}
              />

              {/* Job Information Grid (2-Column) */}
              <View>
                <View style={styles.gridRow2}>
                  <View style={styles.gridCol2}>
                    <Text style={styles.fieldLabel}>JOB CODE</Text>
                    <Text
                      style={[styles.fieldValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
                      numberOfLines={1}
                    >
                      {jobCodeVal}
                    </Text>
                  </View>
                  <View style={styles.gridCol2}>
                    <Text style={styles.fieldLabel}>JOB DESCRIPTION</Text>
                    <Text
                      style={[styles.fieldValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}
                      numberOfLines={2}
                    >
                      {jobDescriptionVal}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 20,
    padding: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingRight: 32, // leave room for close button
    marginBottom: 12,
    gap: 8,
  },
  headerLeft: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    letterSpacing: -0.2,
    lineHeight: 21,
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#2563EB',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 50,
  },
  qrInner: {
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  qrShareBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#2563EB',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  sharePopover: {
    position: 'absolute',
    top: 68,
    right: 0,
    width: 175,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  sharePopoverHeader: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
    marginBottom: 4,
  },
  sharePopoverTitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  shareOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  shareOptionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  shareOptionSubtext: {
    fontSize: 9.5,
    color: '#64748B',
  },
  shareDivider: {
    height: 1,
    marginVertical: 4,
  },
  validityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 11,
  },
  validityIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validityLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  validityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  validityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  validityDesc: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  specsCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  gridRow3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol3: {
    flex: 1,
    paddingRight: 4,
  },
  gridRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol2: {
    flex: 1,
    paddingRight: 6,
  },
  fieldLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
});
