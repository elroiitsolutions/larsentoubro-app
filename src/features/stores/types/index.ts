export interface StoreRecord {
  _id: string;
  name: string;
  location: string;
  incharge: string;
  contactNumber?: string;
  totalToolsCount?: number;
  toolsCount?: number;
  assignedToolsCount?: number;
  availableToolsCount?: number;
  underMaintenanceToolsCount?: number;
  status: "Active" | "Inactive" | string;
  storeCode?: string;
  projectId?: string;
  projectName?: string;
  project?: any;
  type?: "Store" | "HUB";
  createdAt?: string;
}

export interface StoresResponse {
  success: boolean;
  data: StoreRecord[];
  message?: string;
}

export interface StoreMutationResponse {
  success: boolean;
  data?: StoreRecord;
  message?: string;
}

export interface StoreFormValues {
  name: string;
  storeName?: string;
  location?: string;
  incharge?: string;
  contactNumber?: string;
  status?: string;
  projectId?: string;
  project?: any;
  type?: string;
  [key: string]: any;
}
