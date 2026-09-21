export type ProfileType = 'Subcontractor' | 'ScrapDealer' | 'Supplier';

export interface ProfileDocument {
  _id?: string;
  title: string;
  documentType: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileSize?: number;
  uploadedAt?: string;
}

export interface ProfileRecord {
  _id: string;
  profileType: ProfileType;
  name: string;
  code: string;
  contactPerson?: string;
  contactDesignation?: string;
  contactPhone?: string;
  alternatePhone?: string;
  contactEmail?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  licenseNumber?: string;
  status: 'Active' | 'Inactive';
  projects?: string[];
  stores?: string[];
  documents?: ProfileDocument[];
  metrics?: {
    dcCount?: number;
    rcCount?: number;
    returnedCount?: number;
    missingCount?: number;
    scrapCount?: number;
    supplyCount?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileListResponse {
  success: boolean;
  data: ProfileRecord[];
  message?: string;
}

export interface ProfileDetailResponse {
  success: boolean;
  data: ProfileRecord;
  message?: string;
}

export interface ProfileMutationResponse {
  success: boolean;
  data?: ProfileRecord;
  message?: string;
}
