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
  parentUser?: any;
  canCreateUser?: boolean;
  hasInspectionAccess?: boolean;
  isVendor?: boolean;
  vendorCode?: string;
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

export interface ExtensionHistoryItem {
  extendedAt: string;
  extendedBy?: {
    _id?: string;
    name: string;
    email: string;
  };
  durationDays: number;
  durationLabel: string;
  previousExpiresAt: string;
  newExpiresAt: string;
}

export interface GuestUserRecord {
  _id: string;
  name: string;
  phone: string;
  formattedPhone?: string;
  email?: string;
  organization?: string;
  purpose?: string;
  status: 'Active' | 'Expired' | 'Disabled';
  computedStatus?: 'Active' | 'Expiring Soon' | 'Expired' | 'Disabled';
  expiresAt: string;
  startDate?: string;
  initialDurationDays?: number;
  totalDurationDays?: number;
  notificationSentAt?: string;
  notificationStatus?: 'None' | 'Pending' | 'Confirmed' | 'Rejected' | 'Expired';
  rejectionReason?: string;
  lastLoginAt?: string;
  createdBy?: {
    _id?: string;
    name: string;
    email: string;
    role: string;
  };
  extensionHistory?: ExtensionHistoryItem[];
  customFields?: Record<string, any>;
  daysRemaining?: number;
  hoursRemaining?: number;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type ExtensionDuration = '15 days' | '45 days' | '1 month' | '3 months' | '6 months';

export interface CreateGuestUserDto {
  name: string;
  phone: string;
  email?: string;
  organization?: string;
  purpose?: string;
  customFields?: Record<string, any>;
}

export interface UpdateGuestUserDto {
  name?: string;
  phone?: string;
  email?: string;
  organization?: string;
  purpose?: string;
  status?: 'Active' | 'Expired' | 'Disabled';
  expiresAt?: string;
  customFields?: Record<string, any>;
}
