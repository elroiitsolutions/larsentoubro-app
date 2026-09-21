import api from "./api";

export interface FormFieldDefinition {
  id?: string;
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "select" | "date" | "switch" | "email" | "phone" | string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ id?: string; label: string; value: string | number } | string>;
  defaultValue?: any;
  description?: string;
}

export interface FormDefinition {
  _id?: string;
  slug: string;
  name?: string;
  title?: string;
  description?: string;
  fields: FormFieldDefinition[];
}

export interface FormDetailResponse {
  success: boolean;
  data: FormDefinition;
  message?: string;
}

export interface FormMutationResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export const formService = {
  /**
   * Retrieves a dynamic form schema by its slug.
   */
  getFormBySlug: async (slug: string): Promise<FormDefinition | null> => {
    try {
      const response = await api.get<FormDetailResponse>(`/api/forms/${slug}`);
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Submits dynamic form data to the target endpoint.
   */
  submitForm: async (
    url: string,
    data: Record<string, any>,
    method: "POST" | "PUT" = "POST"
  ): Promise<FormMutationResponse> => {
    let targetUrl = url;
    if (!targetUrl.startsWith("http") && !targetUrl.startsWith("/api")) {
      targetUrl = `/api${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;
    }

    const response = await api({
      method,
      url: targetUrl,
      data,
    });
    return response.data;
  },
};

export default formService;
