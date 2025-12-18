import { useQuery, useQueryClient } from "@tanstack/react-query";
import { setupApiClient } from "../services/api";

export interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  banner?: string;
  available: boolean;
  categoryId: number;
  stock?: number;
  hasMeatPoint?: boolean;
  canBeUsedInSandwich?: boolean;
  category?: {
    id: number;
    categoryName: string;
  };
}

export function useProductsByCategory(categoryId: number | string | null) {
  return useQuery({
    queryKey: ["products", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      const apiClient = setupApiClient();
      const response = await apiClient.get("/category/product", {
        params: { categoryId },
      });
      return response.data as Product[];
    },
    enabled: !!categoryId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const apiClient = setupApiClient();

      // Buscar todas as categorias primeiro
      const categoriesResponse = await apiClient.get("/categories");
      const categories = categoriesResponse.data;

      // Buscar produtos de todas as categorias
      const allProducts: Product[] = [];

      for (const category of categories) {
        const response = await apiClient.get("/category/product", {
          params: { categoryId: category.id },
        });

        const productsWithCategory = response.data.map((product: Product) => ({
          ...product,
          category: category,
        }));

        allProducts.push(...productsWithCategory);
      }

      return allProducts;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useInvalidateProducts() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };
}

