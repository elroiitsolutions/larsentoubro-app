export interface UserRecord {
  _id: string;
  name: string;
  email: string;
  phonenumber?: string;
  phone?: string;
  role: 'Admin' | 'User' | 'Vendor' | 'Guest' | string;
  user_id?: string;
  allowedPages?: string[];
  projects?: any[];
  stores?: any[];
  status?: 'Active' | 'Inactive' | 'Pending';
  department?: string;
  createdAt?: string;
  updatedAt?: string;
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
