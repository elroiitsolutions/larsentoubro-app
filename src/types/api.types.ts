export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  requestId?: string;
  status?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
