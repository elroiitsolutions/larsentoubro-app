export interface UserProfile {
  id: string;
  _id: string;
  name: string;
  username?: string;
  email: string;
  role: "Admin" | "Manager" | "Engineer" | "Analyst" | "Viewer" | "Vendor" | string;
  user_id: string;
  phonenumber?: string;
  allowedPages?: string[];
  projects?: any[];
  stores?: any[];
  createdAt?: string;
}

export type LoadingState = "idle" | "loading" | "success" | "error";
