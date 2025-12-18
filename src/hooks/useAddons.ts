import { useQuery, useQueryClient } from "@tanstack/react-query";
import { setupApiClient } from "../services/api";

export interface Addon {
  id: number;
  name: string;
  price: number;
  image?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function useAddons() {
  return useQuery({
    queryKey: ["addons"],
    queryFn: async () => {
      const apiClient = setupApiClient();
      const response = await apiClient.get("/addons");
      return response.data as Addon[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useInvalidateAddons() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["addons"] });
  };
}

