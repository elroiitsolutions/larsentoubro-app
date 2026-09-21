export interface ProjectRecord {
  _id: string;
  name: string;
  projectCode?: string;
  description?: string;
  location?: string;
  incharge?: string;
  department?: string;
  lead?: string;
  status: "Active" | "In Progress" | "Completed" | "On Hold" | "Pending" | string;
  budget?: string | number;
  deadline?: string;
  startDate?: string;
  endDate?: string;
  storesCount?: number;
  totalTools?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectsResponse {
  success: boolean;
  data: ProjectRecord[];
  message?: string;
}

export interface ProjectMutationResponse {
  success: boolean;
  data?: ProjectRecord;
  message?: string;
}

export interface ProjectFormValues {
  name: string;
  projectCode?: string;
  department?: string;
  lead?: string;
  location?: string;
  status: string;
  budget?: string;
  description?: string;
  startDate?: string;
  deadline?: string;
}
