import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import {
  RotateCcw,
  Check,
  Package,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Share2,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAppTheme } from '@/context/ThemeContext';
import { challanService } from '../services/challanService';
import { ChallanRecord, ChallanItemRecord } from '../types';
import { generateAndShareChallanPdf } from '../utils/challanPdfGenerator';

interface CreateReturnChallanModalProps {
  visible: boolean;
  onClose: () => void;
  deliveryChallan: ChallanRecord;
  onSuccess: () => void;
}

interface ItemReturnState {
  item: ChallanItemRecord;
  selected: boolean;
  returnStatus: 'Returned' | 'Missing';
  remarks: string;
}

export const CreateReturnChallanModal: React.FC<CreateReturnChallanModalProps> = ({
  visible,
  onClose,
  deliveryChallan,
  onSuccess,
}) => {
  const { theme, isDark } = useAppTheme();

  const [itemStates, setItemStates] = useState<ItemReturnState[]>([]);
  const [alreadyClosedItems, setAlreadyClosedItems] = useState<ChallanItemRecord[]>([]);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Initialize and isolate pending vs already-closed items
  useEffect(() => {
    if (!visible) return;

    const allItems = deliveryChallan.items || [];
    const closed: ChallanItemRecord[] = [];
    const pending: ItemReturnState[] = [];

    allItems.forEach((it) => {
      const isClosed = it.returnStatus === 'Returned' || it.returnStatus === 'Missing';
      if (isClosed) {
        closed.push(it);
      } else {
        pending.push({
          item: it,
          selected: true, // Default selected
          returnStatus: 'Returned',
          remarks: '',
        });
      }
    });

    setAlreadyClosedItems(closed);
    setItemStates(pending);
    setReturnRemarks('');
  }, [visible, deliveryChallan]);

  const toggleItemSelect = (index: number) => {
    setItemStates((prev) =>
      prev.map((state, idx) =>
        idx === index ? { ...state, selected: !state.selected } : state
      )
    );
  };

  const toggleItemStatus = (index: number, status: 'Returned' | 'Missing') => {
    setItemStates((prev) =>
      prev.map((state, idx) =>
        idx === index ? { ...state, returnStatus: status } : state
      )
    );
  };

  const updateItemRemarks = (index: number, text: string) => {
    setItemStates((prev) =>
      prev.map((state, idx) =>
        idx === index ? { ...state, remarks: text } : state
      )
    );
  };

  const selectedItems = itemStates.filter((s) => s.selected);
  const returnedCount = selectedItems.filter((s) => s.returnStatus === 'Returned').length;
  const missingCount = selectedItems.filter((s) => s.returnStatus === 'Missing').length;
  const remainingPendingCount = itemStates.length - selectedItems.length;

  const handleCreateReturn = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one item to process for return.');
      return;
    }

    try {
      setSubmitting(true);
      const itemsPayload = selectedItems.map(({ item, returnStatus, remarks }) => ({
        tool: (item as any).tool?._id || (item as any).tool || item._id,
        toolId: item.toolId || (item as any).tool || 'UNKNOWN',
        toolCode: item.toolCode || '',
        description: item.description || 'Equipment Item',
        quantity: item.quantity || 1,
        unit: item.unit || 'NOS',
        rate: item.rate || 0,
        returnStatus,
        remarks: remarks.trim() || undefined,
      }));

      const payload = {
        referenceDcId: deliveryChallan._id,
        vendorId: deliveryChallan.vendor?._id || deliveryChallan.vendor,
        storeId: deliveryChallan.store?._id || deliveryChallan.store,
        challanDate: new Date().toISOString().split('T')[0],
        remarks: returnRemarks.trim() || undefined,
        items: itemsPayload,
      };

      const res = await challanService.createReturnChallan(payload);
      const createdRc = res?.data;

      const completionMessage =
        remainingPendingCount > 0
          ? `Partial Return Challan ${createdRc?.challanNumber || ''} created. ${remainingPendingCount} tool(s) remain pending.`
          : `Return Challan ${createdRc?.challanNumber || ''} created. All equipment successfully accounted for!`;

      Alert.alert(
        'Return Challan Generated!',
        `${completionMessage}${
          missingCount > 0 ? `\n\nNotice: ${missingCount} tool(s) recorded as Missing in incident logs.` : ''
        }`,
        [
          {
            text: 'View & Share PDF',
            onPress: async () => {
              if (createdRc) {
                try {
                  await generateAndShareChallanPdf(createdRc, { share: true });
                } catch {
                  // Fallback
                }
              }
              onSuccess();
              onClose();
            },
          },
          {
            text: 'Done',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Creation Failed', err?.response?.data?.message || err?.message || 'Could not generate return challan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Create Return Challan (RC)">
      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            Reference DC:{' '}
            <Text style={{ fontWeight: 'bold', color: theme.primary }}>
              #{deliveryChallan.challanNumber || deliveryChallan._id}
            </Text>
          </Text>
          <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
            Contractor: {deliveryChallan.vendor?.name || deliveryChallan.subcontractorName || 'Subcontractor'}
          </Text>
        </View>

        {/* All tools already returned state */}
        {itemStates.length === 0 && alreadyClosedItems.length > 0 ? (
          <View
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: isDark ? '#1C2E24' : '#ECFDF5',
              borderWidth: 1,
              borderColor: isDark ? '#065F46' : '#A7F3D0',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <CheckCircle2 size={28} color="#10B981" />
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: isDark ? '#ECFDF5' : '#065F46', marginTop: 6 }}>
              All Tools Accounted For
            </Text>
            <Text style={{ fontSize: 11, color: isDark ? '#A7F3D0' : '#047857', textAlign: 'center', marginTop: 2 }}>
              All {alreadyClosedItems.length} tool(s) from this Delivery Challan have already been returned or recorded.
            </Text>
          </View>
        ) : (
          <View>
            {/* Summary Tag Bar */}
            <View
              style={{
                flexDirection: 'row',
                gap: 6,
                marginBottom: 12,
                flexWrap: 'wrap',
              }}
            >
              <Badge variant="neutral" label={`Selected: ${selectedItems.length}`} />
              <Badge variant="success" label={`Returned: ${returnedCount}`} />
              {missingCount > 0 && (
                <Badge variant="destructive" label={`Missing: ${missingCount}`} />
              )}
              {remainingPendingCount > 0 && (
                <Badge variant="warning" label={`Partial (${remainingPendingCount} remaining)`} />
              )}
            </View>

            {/* List of Pending Items */}
            {itemStates.map(({ item, selected, returnStatus, remarks }, index) => {
              return (
                <View
                  key={index}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: selected
                      ? returnStatus === 'Missing'
                        ? isDark
                          ? '#2E1C1C'
                          : '#FFF1F2'
                        : isDark
                        ? '#1E2538'
                        : '#EEF2FF'
                      : isDark
                      ? '#1E293B'
                      : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: selected
                      ? returnStatus === 'Missing'
                        ? '#E11D48'
                        : theme.primary
                      : theme.border,
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {/* Checkbox */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleItemSelect(index)}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        backgroundColor: selected ? (returnStatus === 'Missing' ? '#E11D48' : theme.primary) : 'transparent',
                        borderWidth: 1,
                        borderColor: selected ? (returnStatus === 'Missing' ? '#E11D48' : theme.primary) : theme.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </TouchableOpacity>

                    {/* Item Details */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>
                        {item.description || `Tool Item #${index + 1}`}
                      </Text>
                      <Text style={{ fontSize: 10, fontFamily: 'monospace', color: theme.textSecondary }}>
                        ID: {item.toolId || item.toolCode || 'N/A'} • Qty: {item.quantity || 1} {item.unit || 'NOS'}
                      </Text>
                    </View>
                  </View>

                  {/* Status Toggle if selected */}
                  {selected && (
                    <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>
                          Inward Condition:
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => toggleItemStatus(index, 'Returned')}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: returnStatus === 'Returned' ? '#10B981' : isDark ? '#334155' : '#E2E8F0',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: returnStatus === 'Returned' ? '#FFFFFF' : theme.text,
                              }}
                            >
                              Returned
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => toggleItemStatus(index, 'Missing')}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: returnStatus === 'Missing' ? '#E11D48' : isDark ? '#334155' : '#E2E8F0',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: returnStatus === 'Missing' ? '#FFFFFF' : theme.text,
                              }}
                            >
                              Missing / Lost
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Remarks Input per item if missing */}
                      {returnStatus === 'Missing' && (
                        <TextInput
                          placeholder="Reason missing (e.g. lost at pier 12, damaged on site)..."
                          placeholderTextColor={theme.textSecondary}
                          value={remarks}
                          onChangeText={(txt) => updateItemRemarks(index, txt)}
                          style={{
                            marginTop: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#FDA4AF',
                            backgroundColor: isDark ? '#1F1215' : '#FFF5F5',
                            fontSize: 11,
                            color: theme.text,
                          }}
                        />
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Already Returned Items Accordion / Info */}
            {alreadyClosedItems.length > 0 && (
              <View
                style={{
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderWidth: 1,
                  borderColor: theme.border,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>
                  Already Processed Items ({alreadyClosedItems.length})
                </Text>
                <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>
                  {alreadyClosedItems
                    .map((it) => `${it.toolId || it.toolCode || 'Tool'} (${it.returnStatus})`)
                    .join(', ')}
                </Text>
              </View>
            )}

            <Input
              label="Return Challan Notes / Dispatch Remarks"
              placeholder="Driver details, vehicle number, inspection sign-off..."
              value={returnRemarks}
              onChangeText={setReturnRemarks}
              multiline
              numberOfLines={2}
            />
          </View>
        )}
      </ScrollView>

      {itemStates.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Button title="Cancel" variant="outline" onPress={onClose} disabled={submitting} />
          </View>
          <View style={{ flex: 1.4 }}>
            <Button
              title="Generate RC"
              loading={submitting}
              onPress={handleCreateReturn}
              icon={<RotateCcw size={14} color="#FFFFFF" />}
            />
          </View>
        </View>
      )}
    </Modal>
  );
};
