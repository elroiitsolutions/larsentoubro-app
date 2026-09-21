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
  scrapDealer?: any;
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
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
  category?: string;
  validation?: string;
  validityPeriod?: string;
  purchaserName?: string;
  makeYear?: string;
  storeId?: string;
  page?: number;
  limit?: number;
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
