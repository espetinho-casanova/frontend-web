import { useQuery, useQueryClient } from "@tanstack/react-query";
import { setupApiClient } from "../services/api";

export interface Ingredient {
  id: number;
  name: string;
  image?: string | null;
  nonRemovable: boolean;
  stock?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function useIngredients() {
  return useQuery({
    queryKey: ["ingredients"],
    queryFn: async () => {
      const apiClient = setupApiClient();
      const response = await apiClient.get("/ingredients");
      return response.data as Ingredient[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useInvalidateIngredients() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ["ingredients"] });
  };
}

