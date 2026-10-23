import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
  StyleSheet,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  Printer,
  Share2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  QrCode as QrIcon,
  Filter,
  Layers,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { useAppTheme } from '@/context/ThemeContext';
import { ToolRecord } from '../types';
import { toolService } from '../services/toolService';

interface BulkQrModalProps {
  visible: boolean;
  onClose: () => void;
  tools: ToolRecord[];
  onStatusChange?: () => void;
}

type PrintFilter = 'all' | 'unprinted' | 'printed';

export const BulkQrModal: React.FC<BulkQrModalProps> = ({
  visible,
  onClose,
  tools,
  onStatusChange,
}) => {
  const { theme, isDark } = useAppTheme();
  const [marking, setMarking] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Advanced Filtering and Batch Range State
  const [filter, setFilter] = useState<PrintFilter>('all');
  const [batchLimit, setBatchLimit] = useState<number>(24); // 24 per A4 sheet (12 per page, 2 pages)

  const toolList = tools || [];

  const unprintedCount = useMemo(
    () => toolList.filter((t) => !t.isPrinted).length,
    [toolList]
  );
  const printedCount = useMemo(
    () => toolList.filter((t) => t.isPrinted).length,
    [toolList]
  );

  // Apply print status filter
  const filteredTools = useMemo(() => {
    let list = toolList;
    if (filter === 'unprinted') {
      list = list.filter((t) => !t.isPrinted);
    } else if (filter === 'printed') {
      list = list.filter((t) => t.isPrinted);
    }
    return list;
  }, [toolList, filter]);

  // Apply batch range/limit
  const activeTools = useMemo(() => {
    if (batchLimit === 0) return filteredTools;
    return filteredTools.slice(0, batchLimit);
  }, [filteredTools, batchLimit]);

  const allFilteredPrinted =
    activeTools.length > 0 && activeTools.every((t) => t.isPrinted);

  const generateStickersHtml = () => {
    const cardsHtml = activeTools
      .map((t) => {
        const code = t.toolId || t.toolCode || 'ID';
        const link = t.qrLink || `https://lntqr.com/vt/${code}`;
        const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
          link
        )}`;
        const desc = t.description || 'Tool / Equipment';
        const validity = t.validityPeriod || t.validation || 'N/A';
        const date = t.dateOfSupply || '-';
        const serial = t.serialNumber !== undefined ? String(t.serialNumber) : '-';
        const category = t.category || '-';

        return `
          <div class="qr-card">
            <div class="card-header">
              <div class="lnt-logo">L&T CONSTRUCTION</div>
              <div class="tool-id">${code}</div>
            </div>
            <div class="card-body">
              <div class="qr-box">
                <img src="${qrImg}" alt="QR" />
              </div>
              <div class="tool-info">
                <div class="desc">${desc}</div>
                <div class="meta"><strong>Date:</strong> ${date}</div>
                <div class="meta"><strong>Validity:</strong> ${validity}</div>
                <div class="meta"><strong>Serial:</strong> ${serial}</div>
                <div class="meta"><strong>Category:</strong> ${category}</div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>L&T Tool QR Code Labels</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 10px; background: #fff; color: #000; }
          .header-title { text-align: center; font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #002b66; padding-bottom: 6px; color: #002b66; font-weight: 800; letter-spacing: 0.5px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .qr-card { border: 2px solid #000; border-radius: 8px; padding: 10px; page-break-inside: avoid; background: #fff; }
          .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
          .lnt-logo { font-weight: 800; font-size: 11px; letter-spacing: 0.5px; color: #002b66; text-transform: uppercase; }
          .tool-id { font-family: monospace; font-weight: 800; font-size: 13px; background: #f0f4f8; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1; }
          .card-body { display: flex; gap: 12px; align-items: center; }
          .qr-box { width: 100px; height: 100px; flex-shrink: 0; }
          .qr-box img { width: 100%; height: 100%; object-fit: contain; }
          .tool-info { flex: 1; min-width: 0; }
          .desc { font-weight: 700; font-size: 13px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .meta { font-size: 10px; color: #334155; margin-bottom: 2px; }
        </style>
      </head>
      <body>
        <div class="header-title">
          LARSEN &amp; TOUBRO - QR CODE LABELS (${activeTools.length} TOOLS)
        </div>
        <div class="grid">${cardsHtml}</div>
      </body>
      </html>
    `;
  };

  const handlePrintSheet = async () => {
    if (activeTools.length === 0) return;
    try {
      setPrinting(true);
      const html = generateStickersHtml();
      await Print.printAsync({ html });

      // Offer auto-mark printed
      const unprintedIds = activeTools.filter((t) => !t.isPrinted).map((t) => t._id);
      if (unprintedIds.length > 0) {
        await toolService.markToolsAsPrinted(unprintedIds);
        if (onStatusChange) onStatusChange();
      }
    } catch (err: any) {
      Alert.alert('Print Error', err?.message || 'Could not print sticker sheet.');
    } finally {
      setPrinting(false);
    }
  };

  const handleSharePdf = async () => {
    if (activeTools.length === 0) return;
    try {
      setPrinting(true);
      const html = generateStickersHtml();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Share L&T QR Code Stickers',
        });

        // Offer auto-mark printed
        const unprintedIds = activeTools.filter((t) => !t.isPrinted).map((t) => t._id);
        if (unprintedIds.length > 0) {
          await toolService.markToolsAsPrinted(unprintedIds);
          if (onStatusChange) onStatusChange();
        }
      } else {
        Alert.alert('PDF Generated', `Sticker sheet saved to:\n${uri}`);
      }
    } catch (err: any) {
      Alert.alert('Share Error', err?.message || 'Could not generate sticker PDF.');
    } finally {
      setPrinting(false);
    }
  };

  const handleTogglePrinted = async () => {
    const ids = activeTools.map((t) => t._id || t.toolId).filter(Boolean) as string[];
    if (ids.length === 0) return;

    try {
      setMarking(true);
      if (allFilteredPrinted) {
        await toolService.unmarkToolsAsPrinted(ids);
        Alert.alert('Status Updated', `Unmarked ${ids.length} tools as printed.`);
      } else {
        await toolService.markToolsAsPrinted(ids);
        Alert.alert('Status Updated', `Marked ${ids.length} tools as printed.`);
      }
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || err?.message || 'Failed to update print status.'
      );
    } finally {
      setMarking(false);
    }
  };

  const handleCopyLink = (tool: ToolRecord) => {
    const code = tool.toolId || tool.toolCode || '';
    const link = tool.qrLink || `https://lntqr.com/vt/${code}`;
    Clipboard.setString(link);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Modal visible={visible} onClose={onClose} title="QR Code Stickers">
      <View style={{ maxHeight: '82%' }}>
        {/* Header Action Bar */}
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
              <QrIcon size={18} color="#4F46E5" />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>
                {activeTools.length} Stickers Ready
              </Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                A4 Standard Grid Format (2x per row)
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleTogglePrinted}
            disabled={marking}
            style={[
              styles.markBtn,
              {
                backgroundColor: allFilteredPrinted ? '#FEF3C7' : '#ECFDF5',
              },
            ]}
          >
            {marking ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : allFilteredPrinted ? (
              <>
                <XCircle size={13} color="#D97706" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>
                  Unmark
                </Text>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} color="#059669" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#047857' }}>
                  Mark Printed
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Filter Pills (All / Unprinted / Printed) */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setFilter('all')}
            style={[
              styles.filterPill,
              filter === 'all' && [styles.filterPillActive, { backgroundColor: '#4F46E5' }],
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: filter === 'all' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              All ({toolList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('unprinted')}
            style={[
              styles.filterPill,
              filter === 'unprinted' && [styles.filterPillActive, { backgroundColor: '#059669' }],
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: filter === 'unprinted' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Unprinted ({unprintedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('printed')}
            style={[
              styles.filterPill,
              filter === 'printed' && [styles.filterPillActive, { backgroundColor: '#64748B' }],
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: filter === 'printed' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Printed ({printedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Batch Size Selector (24, 48, All) */}
        {filteredTools.length > 24 && (
          <View style={styles.batchRow}>
            <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }}>
              Batch Range:
            </Text>
            {[24, 48, 0].map((size) => (
              <TouchableOpacity
                key={size}
                onPress={() => setBatchLimit(size)}
                style={[
                  styles.batchPill,
                  batchLimit === size && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: batchLimit === size ? '#FFFFFF' : theme.textSecondary,
                  }}
                >
                  {size === 0 ? 'All' : `First ${size}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* QR Stickers Scroll View */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 340, marginVertical: 8 }}
        >
          {activeTools.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                No equipment records matched filter.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {activeTools.map((tool) => {
                const code = tool.toolId || tool.toolCode || 'ID';
                const link = tool.qrLink || `https://lntqr.com/vt/${code}`;
                const isCopied = copiedId === code;

                return (
                  <View
                    key={tool._id || code}
                    style={[
                      styles.card,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.lntLogo}>L&T CONSTRUCTION</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.codeBadge, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                          <Text style={[styles.codeBadgeText, { color: theme.text }]}>
                            {code}
                          </Text>
                        </View>
                        {tool.isPrinted && (
                          <View style={styles.printedPill}>
                            <Text style={styles.printedPillText}>PRINTED</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {/* Interactive QR SVG */}
                      <View style={styles.qrContainer}>
                        <QRCode value={link} size={60} color="#0F172A" backgroundColor="#FFFFFF" />
                      </View>

                      {/* Tool Info */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontSize: 12, fontWeight: '700', color: theme.text }}
                          numberOfLines={1}
                        >
                          {tool.description || 'Tool / Equipment'}
                        </Text>
                        <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 1 }}>
                          Category: {tool.category || '-'}
                        </Text>
                        <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                          Validation: {tool.validityPeriod || tool.validation || 'N/A'}
                        </Text>
                        <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                          Date: {tool.dateOfSupply || '-'}
                        </Text>
                      </View>

                      {/* Copy Link Button */}
                      <TouchableOpacity
                        onPress={() => handleCopyLink(tool)}
                        style={[styles.copyBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                      >
                        {isCopied ? (
                          <Check size={13} color="#059669" />
                        ) : (
                          <Copy size={13} color="#64748B" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={handleSharePdf}
            disabled={printing || activeTools.length === 0}
            style={[styles.actionBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
          >
            <Share2 size={16} color={theme.text} />
            <Text style={[styles.actionBtnText, { color: theme.text }]}>
              Share PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePrintSheet}
            disabled={printing || activeTools.length === 0}
            style={[styles.actionBtn, { backgroundColor: '#4F46E5', flex: 1.2 }]}
          >
            {printing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Printer size={16} color="#FFFFFF" />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                  Print Stickers ({activeTools.length})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  filterPillActive: {},
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  batchPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  card: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  lntLogo: {
    fontSize: 9,
    fontWeight: '800',
    color: '#002B49',
    letterSpacing: 0.5,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  printedPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  printedPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#059669',
  },
  qrContainer: {
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  copyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
