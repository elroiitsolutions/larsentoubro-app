import { ToolRecord } from '../types';

export interface PendingChallanSelection {
  storeId: string;
  toolIds: string[];
  tools: ToolRecord[];
}

let pendingChallan: PendingChallanSelection | null = null;

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
};
