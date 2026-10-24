import { ToolRecord } from '../types';

export interface PendingChallanSelection {
  storeId: string;
  toolIds: string[];
  tools: ToolRecord[];
}

export interface ChallanPreviewState {
  selectedTools: ToolRecord[];
  vendor: any;
  storeId?: string;
  storeName?: string;
  challanDate: string;
  deliveryDate?: string;
  remarks: string;
  notes?: string;
  siteCode?: string;
  indentNo?: string;
  isScrapDC?: boolean;
  isTransfer?: boolean;
  transferFromDcId?: string;
  transferFromDcNumber?: string;
  [key: string]: any;
}

let pendingChallan: PendingChallanSelection | null = null;
let pendingPreview: ChallanPreviewState | null = null;

export const selectionStore = {
  setPendingChallan: (data: PendingChallanSelection) => {
    pendingChallan = data;
  },
  getPendingChallan: (storeId?: string): PendingChallanSelection | null => {
    if (!pendingChallan) return null;
    if (storeId && pendingChallan.storeId !== storeId) return null;
    return pendingChallan;
  },
  clearPendingChallan: () => {
    pendingChallan = null;
  },
  setPendingPreview: (data: ChallanPreviewState) => {
    pendingPreview = data;
  },
  getPendingPreview: (): ChallanPreviewState | null => {
    return pendingPreview;
  },
  clearPendingPreview: () => {
    pendingPreview = null;
  },
};

