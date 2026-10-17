import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
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

  const toolList = tools || [];
  const allPrinted = toolList.length > 0 && toolList.every((t) => t.isPrinted);

  const generateStickersHtml = () => {
    const cardsHtml = toolList
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
          LARSEN & TOUBRO - QR CODE LABELS (${toolList.length} TOOLS)
        </div>
        <div class="grid">${cardsHtml}</div>
      </body>
      </html>
    `;
  };

  const handlePrintSheet = async () => {
    if (toolList.length === 0) return;
    try {
      setPrinting(true);
      const html = generateStickersHtml();
      await Print.printAsync({ html });
    } catch (err: any) {
      Alert.alert('Print Error', err?.message || 'Could not print sticker sheet.');
    } finally {
      setPrinting(false);
    }
  };

  const handleSharePdf = async () => {
    if (toolList.length === 0) return;
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
      } else {
        Alert.alert('Sharing Unavailable', 'File sharing is not supported on this device.');
      }
    } catch (err: any) {
      Alert.alert('Share Error', err?.message || 'Could not generate sticker PDF.');
    } finally {
      setPrinting(false);
    }
  };

  const handleTogglePrinted = async () => {
    const ids = toolList.map((t) => t._id || t.toolId).filter(Boolean) as string[];
    if (ids.length === 0) return;

    try {
      setMarking(true);
      if (allPrinted) {
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
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to update print status.');
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
      <View className="max-h-[82vh]">
        {/* Header Action Bar */}
        <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center gap-2">
            <View className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60">
              <QrIcon size={18} color="#4F46E5" />
            </View>
            <View>
              <Text className="text-sm font-bold text-slate-900 dark:text-white">
                {toolList.length} QR Stickers
              </Text>
              <Text className="text-[11px] text-slate-500">
                A4 Printable Equipment Labels
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleTogglePrinted}
            disabled={marking}
            className={`px-2.5 py-1.5 rounded-lg flex-row items-center gap-1.5 ${
              allPrinted ? 'bg-amber-100 dark:bg-amber-950/60' : 'bg-emerald-100 dark:bg-emerald-950/60'
            }`}
          >
            {marking ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : allPrinted ? (
              <>
                <XCircle size={13} color="#D97706" />
                <Text className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Unmark
                </Text>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} color="#059669" />
                <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Mark Printed
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* QR Stickers Scroll View */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="my-3 max-h-[50vh]"
        >
          {toolList.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Text className="text-sm text-slate-400">No tools selected for QR generation.</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {toolList.map((tool) => {
                const code = tool.toolId || tool.toolCode || 'ID';
                const link = tool.qrLink || `https://lntqr.com/vt/${code}`;
                const isCopied = copiedId === code;

                return (
                  <View
                    key={tool._id || code}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60"
                  >
                    <View className="flex-row items-center justify-between mb-2 pb-1.5 border-b border-slate-200 dark:border-slate-700">
                      <Text className="text-[10px] font-extrabold tracking-wider text-indigo-700 dark:text-indigo-400 uppercase">
                        L&T CONSTRUCTION
                      </Text>
                      <View className="flex-row items-center gap-1.5">
                        <View className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                          <Text className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                            {code}
                          </Text>
                        </View>
                        {tool.isPrinted && (
                          <View className="px-1.5 py-0.5 rounded bg-emerald-500/20">
                            <Text className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                              PRINTED
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3">
                      {/* Interactive QR SVG */}
                      <View className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm items-center justify-center">
                        <QRCode
                          value={link}
                          size={64}
                          color="#0F172A"
                          backgroundColor="#FFFFFF"
                        />
                      </View>

                      {/* Tool Info */}
                      <View className="flex-1">
                        <Text
                          className="text-xs font-bold text-slate-900 dark:text-white"
                          numberOfLines={1}
                        >
                          {tool.description || 'Tool / Equipment'}
                        </Text>
                        <Text className="text-[10px] text-slate-500 mt-0.5">
                          Category: <Text className="font-semibold text-slate-700 dark:text-slate-300">{tool.category || '-'}</Text>
                        </Text>
                        <Text className="text-[10px] text-slate-500">
                          Validity: <Text className="font-semibold text-slate-700 dark:text-slate-300">{tool.validityPeriod || tool.validation || 'N/A'}</Text>
                        </Text>
                        <Text className="text-[10px] text-slate-500">
                          Date: <Text className="font-semibold text-slate-700 dark:text-slate-300">{tool.dateOfSupply || '-'}</Text>
                        </Text>
                      </View>

                      {/* Copy Link Button */}
                      <TouchableOpacity
                        onPress={() => handleCopyLink(tool)}
                        className="p-2 rounded-lg bg-slate-200/60 dark:bg-slate-700/60 active:bg-slate-300"
                      >
                        {isCopied ? (
                          <Check size={14} color="#059669" />
                        ) : (
                          <Copy size={14} color="#64748B" />
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
        <View className="flex-row gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <TouchableOpacity
            onPress={handleSharePdf}
            disabled={printing || toolList.length === 0}
            className="flex-1 py-3 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex-row items-center justify-center gap-2 active:opacity-80"
          >
            <Share2 size={16} color={isDark ? '#E2E8F0' : '#1E293B'} />
            <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Share PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePrintSheet}
            disabled={printing || toolList.length === 0}
            className="flex-1 py-3 px-3 rounded-xl bg-indigo-600 flex-row items-center justify-center gap-2 active:bg-indigo-700"
          >
            {printing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Printer size={16} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">Print Sheet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
