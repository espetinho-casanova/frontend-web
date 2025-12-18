import { useQuery, useQueryClient } from "@tanstack/react-query";
import { setupApiClient } from "../services/api";

export interface Category {
  id: number;
  categoryName: string;
  children?: Category[]; // Subcategorias
  createdAt?: string;
  updatedAt?: string;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const apiClient = setupApiClient();
      const response = await apiClient.get("/categories");
      return response.data as Category[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useInvalidateCategories() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };
}

