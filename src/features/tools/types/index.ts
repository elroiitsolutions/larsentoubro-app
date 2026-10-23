export interface ToolRecord {
  _id: string;
  toolId?: string;
  toolCode?: string;
  name?: string;
  description?: string;
  category?: string;
  toolType?: string;
  status: string;
  serialNumber?: string;
  makeYear?: string;
  capacity?: string;
  safeWorkingLoad?: string;
  metalType?: string;
  toolVariant?: string;
  dateOfSupply?: string;
  validityPeriod?: string;
  validation?: string; // Unified alias for validity period
  purchaserName?: string;
  purchaserContact?: string;
  supplierCode?: string;
  testCertificate?: string;
  subcontractorName?: string;
  subcontractorCode?: string;
  subcontractorMobile?: string;
  jobCode?: string;
  jobDescription?: string;
  remarks?: string;
  qrLink?: string;
  project?: any;
  currentSite?: any;
  storeId?: string;
  storeName?: string;
  condition?: string;
  isPrinted?: boolean;
  isScrapped?: boolean;
  scrappedAt?: string;
  scrapReason?: string;
  isDisposed?: boolean;
  scrapValue?: number;
  store?: any;
  lastInspectionDate?: string;
  nextInspectionDueDate?: string;
  inspectionStatus?: string;
  inspectionResult?: string;
  inspectionAction?: string;
  inspectedBy?: {
    _id?: string;
    name?: string;
    email?: string;
  };
  inspectedAt?: string;
  inspectionHistory?: InspectionHistoryItem[];
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface InspectionHistoryItem {
  _id?: string;
  result: 'Pass' | 'Fail';
  action?: 'Pass' | 'Repair' | 'Scrap';
  validation?: string;
  expiryDate?: string;
  inspectedBy?: {
    _id?: string;
    name?: string;
    email?: string;
  };
  inspectedAt?: string;
  notes?: string;
}

export interface InspectToolsPayload {
  toolIds: string[];
  result: 'Pass' | 'Fail';
  action?: 'Pass' | 'Repair' | 'Scrap';
  validation?: string;
  remarks?: string;
}

export interface InspectToolsResponse {
  success: boolean;
  message?: string;
  data?: {
    count: number;
    result: string;
    action: string;
    validation?: string;
  };
}

export interface ToolListResponse {
  success: boolean;
  data: ToolRecord[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  message?: string;
}

export interface ToolDetailResponse {
  success: boolean;
  data: ToolRecord;
  message?: string;
}

export interface ToolMutationResponse {
  success: boolean;
  data?: ToolRecord;
  message?: string;
}

export interface ToolFilterParams {
  search?: string;
  status?: string;
  printStatus?: string;
  category?: string;
  validation?: string;
  validityPeriod?: string;
  purchaserName?: string;
  purchaserContact?: string;
  supplierCode?: string;
  toolCode?: string;
  toolId?: string;
  capacity?: string;
  safeWorkingLoad?: string;
  metalType?: string;
  toolVariant?: string;
  dateOfSupply?: string;
  jobCode?: string;
  remarks?: string;
  makeYear?: string;
  storeId?: string;
  page?: number;
  limit?: number;
  [key: string]: any;
}

export interface BulkEditPayload {
  toolIds?: string[];
  filterCriteria?: Record<string, string>;
  updates: Record<string, any>;
}

export interface ToolTransferPayload {
  sourceStoreId: string;
  destinationStoreId: string;
  toolIds: string[];
  remarks?: string;
}

export interface ScrapPayload {
  toolIds: string[];
  scrapDealerId?: string;
  scrapDealerName?: string;
  scrapReason?: string;
  remarks?: string;
  scrapDate?: string;
  scrapValue?: number;
}

export interface FilterOptionsResponse {
  categories?: string[];
  statuses?: string[];
  validationOptions?: string[];
  validityPeriods?: string[];
  purchasers?: string[];
  makeYears?: string[];
  [key: string]: string[] | undefined;
}

/**
 * Resolves the unified Validation display value from a tool record.
 * Handles validityPeriod, validation alias, and customFields.
 */
export const resolveValidationValue = (tool?: ToolRecord | null): string => {
  if (!tool) return '-';
  const raw =
    tool.validityPeriod ||
    tool.validation ||
    tool.customFields?.validation ||
    tool.customFields?.validityPeriod ||
    '';

  if (!raw || raw === 'N/A' || raw === '-') return '-';
  const str = String(raw).trim();
  if (str.toLowerCase().includes('year')) {
    return str;
  }
  return `${str} Years`;
};

/**
 * Calculates the 'Valid Until' date from the Date of Supply + Validation years.
 */
export const calculateValidUntilDate = (
  dateOfSupply?: string,
  validation?: string
): string => {
  if (!dateOfSupply || dateOfSupply === '-' || !validation || validation === '-') {
    return '-';
  }

  try {
    const supplyDate = new Date(dateOfSupply);
    if (isNaN(supplyDate.getTime())) return '-';

    const match = validation.match(/(\d+)/);
    if (!match) return '-';

    const years = parseInt(match[1], 10);
    const validUntil = new Date(supplyDate);
    validUntil.setFullYear(validUntil.getFullYear() + years);

    return validUntil.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

export interface ToolValidityData {
  toolId: string;
  description: string;
  project: string;
  store: string;
  expiryDate: string;
  validityStatus: 'VALID' | 'EXPIRED' | 'INVALID_EXPIRY';
  validityLabel: string;
  isValid: boolean;
  status: string;
}

export interface ToolValidityResponse {
  success: boolean;
  status?: string;
  message?: string;
  data?: ToolValidityData;
}

