export interface ChallanItemRecord {
  _id?: string;
  tool?: string;
  toolId: string;
  description?: string;
  toolCode?: string;
  quantity: number;
  unit: string;
  rate?: number;
  remarks?: string;
  returnStatus: "Sent" | "Returned" | "Missing" | string;
}

export interface ChallanVendor {
  _id?: string;
  name: string;
  vendorCode?: string;
  address?: string;
  gstNumber?: string;
  contactPerson?: string;
  contactPhone?: string;
}

export interface ChallanRecord {
  _id: string;
  challanNumber: string;
  challanType: "Delivery" | "Return" | string;
  type?: "Delivery" | "Return" | string;
  status: "Active" | "Completed" | "Cancelled" | "Transfer" | "Returned" | string;
  vendor: ChallanVendor;
  store?: any;
  storeName?: string;
  challanDate: string;
  deliveryDate?: string;
  indentNo?: string;
  siteCode?: string;
  subcontractorName?: string;
  locationChainage?: string;
  workFrontLocation?: string;
  trnCode?: string;
  sendingCentreCode?: string;
  mrNo?: string;
  mrDate?: string;
  stockType?: string;
  ewayBillNo?: string;
  gatePassNo?: string;
  gatePassApprovedBy?: string;
  consignorTaxNo?: string;
  vehicleNo?: string;
  lrNo?: string;
  freightStatus?: string;
  receiverName?: string;
  receiverMobile?: string;
  mrnNo?: string;
  receiptDate?: string;
  remarks?: string;
  notes?: string;
  referenceDcId?: string;
  referenceDcNumber?: string;
  transferFromDcId?: string;
  transferFromDcNumber?: string;
  transferredToDcId?: string;
  transferredToDcNumber?: string;
  items: ChallanItemRecord[];
  toolCount: number;
  returnedCount?: number;
  missingCount?: number;
  createdBy?: {
    _id?: string;
    name: string;
    email?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ChallanListResponse {
  success: boolean;
  data: ChallanRecord[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  message?: string;
}

export interface ChallanFilterParams {
  search?: string;
  challanType?: string;
  status?: string;
  vendor?: string;
  page?: number;
  limit?: number;
}
