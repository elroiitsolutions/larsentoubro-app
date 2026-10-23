import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileDown,
  Layers,
  ArrowRight,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/context/ThemeContext';
import api from '@/services/api';

interface BulkImportModalProps {
  visible: boolean;
  onClose: () => void;
  storeId: string;
  storeName?: string;
  onSuccess: () => void;
}

type StepType = 'pick' | 'preview' | 'processing' | 'done';

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  visible,
  onClose,
  storeId,
  storeName,
  onSuccess,
}) => {
  const { theme, isDark } = useAppTheme();

  const [step, setStep] = useState<StepType>('pick');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  // Preview data
  const [jobId, setJobId] = useState<string | null>(null);
  const [previewSummary, setPreviewSummary] = useState<{
    totalRows: number;
    validCount: number;
    invalidCount: number;
    records: any[];
  } | null>(null);

  const resetState = () => {
    setStep('pick');
    setSelectedFile(null);
    setJobId(null);
    setPreviewSummary(null);
    setLoading(false);
    setCommitting(false);
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setSelectedFile(res.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('File Error', err?.message || 'Could not pick file.');
    }
  };

  const handleUploadAndPreview = async () => {
    if (!selectedFile) {
      Alert.alert('No File', 'Please select an Excel or CSV file first.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type:
          selectedFile.mimeType ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } as any);

      const res = await api.post(`/api/stores/${storeId}/tools/bulk-import/preview`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data && res.data.success) {
        setJobId(res.data.data.jobId);
        setPreviewSummary({
          totalRows: res.data.data.totalRows,
          validCount: res.data.data.validCount,
          invalidCount: res.data.data.invalidCount,
          records: res.data.data.records || [],
        });
        setStep('preview');
      } else {
        Alert.alert('Validation Error', res.data?.message || 'Failed to parse file.');
      }
    } catch (err: any) {
      Alert.alert(
        'Upload Failed',
        err?.response?.data?.message || err?.message || 'Could not upload spreadsheet.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!jobId) return;

    setCommitting(true);
    setStep('processing');
    try {
      const res = await api.post(`/api/stores/${storeId}/tools/bulk-import/commit`, { jobId });
      if (res.data && res.data.success) {
        // Wait 2 seconds for worker to process
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setStep('done');
      } else {
        Alert.alert('Error', res.data?.message || 'Could not commit import.');
        setStep('preview');
      }
    } catch (err: any) {
      Alert.alert(
        'Commit Failed',
        err?.response?.data?.message || err?.message || 'Failed to commit tools import.'
      );
      setStep('preview');
    } finally {
      setCommitting(false);
    }
  };

  const handleDownloadSample = () => {
    const baseUrl = api.defaults.baseURL || '';
    const sampleUrl = `${baseUrl}/api/stores/${storeId}/tools/bulk-import/sample`;
    Linking.openURL(sampleUrl).catch(() => {
      Alert.alert('Download Error', 'Could not open sample template URL.');
    });
  };

  const handleDone = () => {
    resetState();
    onSuccess();
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
            <FileSpreadsheet size={22} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>
              Bulk Tool Excel / CSV Import
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Target Store: {storeName || 'Selected Facility'}
            </Text>
          </View>
        </View>

        {/* STEP 1: PICK FILE */}
        {step === 'pick' && (
          <View style={{ gap: 14 }}>
            {/* Upload Dropzone */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickDocument}
              style={[
                styles.dropzone,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: selectedFile ? '#4F46E5' : theme.border,
                },
              ]}
            >
              <UploadCloud size={36} color={selectedFile ? '#4F46E5' : '#94A3B8'} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginTop: 8 }}>
                {selectedFile ? selectedFile.name : 'Tap to Select Spreadsheet'}
              </Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                {selectedFile
                  ? `${((selectedFile.size || 0) / 1024).toFixed(1)} KB • Ready to preview`
                  : 'Supported formats: .XLSX, .XLS, .CSV'}
              </Text>
            </TouchableOpacity>

            {/* Download Sample Template Banner */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDownloadSample}
              style={[
                styles.sampleBanner,
                { backgroundColor: isDark ? '#0F172A' : '#EFF6FF', borderColor: '#BFDBFE' },
              ]}
            >
              <FileDown size={18} color="#2563EB" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E40AF' }}>
                  Download Official L&T Excel Template
                </Text>
                <Text style={{ fontSize: 10, color: '#3B82F6' }}>
                  Standard pre-configured columns matching all required equipment attributes.
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
              <Button
                title={loading ? 'Validating...' : 'Preview Records'}
                onPress={handleUploadAndPreview}
                disabled={loading || !selectedFile}
                icon={loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ArrowRight size={14} color="#FFFFFF" />}
                style={{ flex: 1.5, backgroundColor: '#4F46E5' }}
              />
            </View>
          </View>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 'preview' && previewSummary && (
          <View style={{ gap: 12 }}>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                <Text style={styles.statLabel}>Total Rows</Text>
                <Text style={[styles.statValue, { color: '#4338CA' }]}>
                  {previewSummary.totalRows}
                </Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Text style={styles.statLabel}>Valid</Text>
                <Text style={[styles.statValue, { color: '#047857' }]}>
                  {previewSummary.validCount}
                </Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={styles.statLabel}>Invalid</Text>
                <Text style={[styles.statValue, { color: '#B91C1C' }]}>
                  {previewSummary.invalidCount}
                </Text>
              </View>
            </View>

            {previewSummary.invalidCount > 0 && (
              <View style={[styles.warningBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <AlertCircle size={16} color="#D97706" />
                <Text style={{ fontSize: 11, color: '#B45309', flex: 1 }}>
                  {previewSummary.invalidCount} row(s) contain missing required fields or validation errors. Only valid records will be imported.
                </Text>
              </View>
            )}

            {/* Sample Records List */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text, marginTop: 4 }}>
              Preview Sample Records ({previewSummary.records.length})
            </Text>

            <View style={{ gap: 6, maxHeight: 220 }}>
              {previewSummary.records.slice(0, 5).map((row: any, idx: number) => (
                <View
                  key={idx}
                  style={[
                    styles.previewCard,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>
                    {row.toolName || row.description || `Row ${idx + 1}`}
                  </Text>
                  <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                    Code: {row.toolCode || 'Auto'} • Category: {row.toolType || row.category || '-'} • SWL: {row.safeWorkingLoad || '-'}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Button title="Back" variant="outline" onPress={() => setStep('pick')} style={{ flex: 1 }} />
              <Button
                title={committing ? 'Importing...' : `Commit & Import (${previewSummary.validCount})`}
                onPress={handleCommitImport}
                disabled={committing || previewSummary.validCount === 0}
                style={{ flex: 1.8, backgroundColor: '#059669' }}
              />
            </View>
          </View>
        )}

        {/* STEP 3: PROCESSING */}
        {step === 'processing' && (
          <View style={{ paddingVertical: 40, alignItems: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>
              Ingesting Equipment into Store...
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center' }}>
              Assigning auto-generated barcodes, store locations, and generating audit logs.
            </Text>
          </View>
        )}

        {/* STEP 4: DONE */}
        {step === 'done' && (
          <View style={{ paddingVertical: 24, alignItems: 'center', gap: 12 }}>
            <View style={[styles.doneIcon, { backgroundColor: '#ECFDF5' }]}>
              <CheckCircle2 size={40} color="#059669" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>
              Import Completed Successfully!
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center' }}>
              Tools have been registered in the store catalog and are ready for stickers and DC dispatch.
            </Text>

            <View style={{ width: '100%', marginTop: 12 }}>
              <Button title="Return to Store Inventory" onPress={handleDone} style={{ backgroundColor: '#4F46E5' }} />
            </View>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  headerRow: {
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
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  dropzone: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewCard: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
