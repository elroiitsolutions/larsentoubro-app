import api from "@/services/api";
import {
  ProjectsResponse,
  ProjectMutationResponse,
  ProjectRecord,
  ProjectFormValues,
} from "../types";

export const projectService = {
  /**
   * Retrieves all projects from backend.
   */
  getProjects: async (): Promise<ProjectRecord[]> => {
    const response = await api.get<ProjectsResponse>("/api/projects");
    if (response.data && response.data.success) {
      return response.data.data || [];
    }
    return [];
  },

  /**
   * Retrieves a single project by ID.
   */
  getProjectById: async (id: string): Promise<ProjectRecord | null> => {
    const response = await api.get<{ success: boolean; data: ProjectRecord }>(`/api/projects/${id}`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return null;
  },

  /**
   * Creates a new project.
   */
  createProject: async (data: ProjectFormValues): Promise<ProjectMutationResponse> => {
    const response = await api.post<ProjectMutationResponse>("/api/projects", data);
    return response.data;
  },

  /**
   * Updates an existing project.
   */
  updateProject: async (
    id: string,
    data: Partial<ProjectFormValues>
  ): Promise<ProjectMutationResponse> => {
    const response = await api.put<ProjectMutationResponse>(`/api/projects/${id}`, data);
    return response.data;
  },

  /**
   * Deletes a project.
   */
  deleteProject: async (id: string): Promise<ProjectMutationResponse> => {
    const response = await api.delete<ProjectMutationResponse>(`/api/projects/${id}`);
    return response.data;
  },
};

export default projectService;
