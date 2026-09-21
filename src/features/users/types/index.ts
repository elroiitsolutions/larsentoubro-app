export interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Store Incharge' | 'Operator' | 'Vendor' | string;
  status: 'Active' | 'Inactive' | 'Pending';
  department?: string;
  phone?: string;
  assignedStores?: string[];
  assignedProjects?: string[];
  vendorScope?: string;
  createdAt?: string;
}

export interface PendingLoginRequest {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  roleRequested?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: string;
}
