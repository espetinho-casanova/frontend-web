// Tipos para o sistema de pedidos

export type Product = {
  id: string | number;
  name: string;
  description: string;
  price: string | number;
  banner: string;
  categoryId: string | number;
  ingredients: Array<{
    id: string | number;
    name: string;
    image?: string | null;
    nonRemovable?: boolean; // Se true, não pode ser removido (ingrediente essencial)
  }>; // Array de objetos
  addons: Array<{ id: string | number; name: string; price: string | number; image?: string | null }>; // Array de objetos
  available: boolean;
  stock?: number; // Estoque do produto
  canBeUsedInSandwich?: boolean; // Se o espetinho pode ser usado no lanche (Xis/Ká)
  hasMeatPoint?: boolean; // Se o produto tem ponto da carne (espetinhos de carne)
};

export type Category = {
  id: string;
  categoryName: string;
  children?: Category[]; // Subcategorias
};

export type CartItem = {
  product: Product;
  amount: number;
  total: number; // Preço calculado (Base + Adicionais)
  meatChoice?: Product; // O objeto do espeto escolhido
  meatPoint?: string; // Ponto da carne (mal, . pra mal, ao ponto, . pra bem, bem)
  removals: string[]; // Array de Strings (Nomes dos ingredientes removidos)
  additions: { id: string; name: string; price: string; quantity: number }[]; // Adicionais com quantidade
  notes: string; // Observações
};

export type OrderPayload = {
  table: string; // Mesa/Nome (pode ser número ou nome)
  draft?: boolean;
  status?: number;
  items: OrderItem[];
};

export type OrderItem = {
  productId: string;
  amount: number;
  meatChoiceId?: string;
  meatPoint?: string; // Ponto da carne
  removals: string[]; // Array de Strings (Nomes)
  additions: string[]; // Array de Strings (IDs dos Addons)
  notes: string;
};

