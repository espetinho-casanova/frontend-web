import { useState, useEffect } from "react";
import Head from "next/head";
import styles from "./styles.module.scss";
import { Header } from "../../components/Header";
import { canSSRAuth } from "../../utils/canSSRAuth";
import { setupApiClient } from "../../services/api";
import { Product, Category, CartItem, OrderPayload } from "../../types/order";
import { ModalProductDetail } from "../../components/ModalProductDetail";
import { FiShoppingCart, FiTrash2, FiEdit2, FiPlus, FiMinus, FiX, FiCoffee } from "react-icons/fi";
import Modal from "react-modal";
import { toast } from "react-toastify";
import { OrderStatus } from "../../utils/constants";
import Router from "next/router";
import { getImageUrl } from "../../utils/imageUrl";

interface PDVProps {
  readonly categories: Category[];
  readonly initialProducts: Product[];
}

export default function PDV({ categories, initialProducts }: PDVProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(categories[0] || null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);

  // Carrinho
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartModalOpen, setCartModalOpen] = useState(false);

  // Modal de produto
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Dados do pedido
  const [tableName, setTableName] = useState("");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Controle de edição de notas no carrinho
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [noteTimeouts, setNoteTimeouts] = useState<Map<number, NodeJS.Timeout>>(new Map());

  Modal.setAppElement("#__next");

  // Carregar pedido em edição se existir
  useEffect(() => {
    const editingOrderData = sessionStorage.getItem("editingOrder");
    if (editingOrderData) {
      try {
        const orderData = JSON.parse(editingOrderData);

        // Preencher dados do pedido
        setTableName(String(orderData.table || ""));
        setEditingOrderId(orderData.orderId || null);

        // Converter itens do pedido para o formato do carrinho
        const cartItems: CartItem[] = orderData.items.map((item: any) => {
          // Calcular preço total do item
          const basePrice = Number.parseFloat(String(item.product.price)) || 0;

          // Agrupar adicionais por ID para contar quantidades
          const additionsMap = new Map<string, { id: string; name: string; price: number; quantity: number }>();

          (item.additions || []).forEach((add: any) => {
            const addonId = String(add.addon?.id || add.id);
            const addonName = add.addon?.name || add.name;
            const addonPrice = Number.parseFloat(String(add.addon?.price || add.price || 0));

            if (additionsMap.has(addonId)) {
              additionsMap.get(addonId)!.quantity += 1;
            } else {
              additionsMap.set(addonId, {
                id: addonId,
                name: addonName,
                price: addonPrice,
                quantity: 1,
              });
            }
          });

          const additionsArray = Array.from(additionsMap.values());
          const additionsTotal = additionsArray.reduce((sum, add) => sum + add.price * add.quantity, 0);
          const itemTotal = (basePrice + additionsTotal) * item.amount;

          return {
            product: item.product,
            amount: item.amount,
            total: itemTotal,
            meatChoice: item.meatChoice || undefined,
            removals: item.removals || [],
            additions: additionsArray.map((add) => ({
              id: add.id,
              name: add.name,
              price: String(add.price),
              quantity: add.quantity,
            })),
            notes: item.notes || "",
            meatPoint: item.meatPoint || undefined,
          };
        });

        setCart(cartItems);

        // Abrir modal do carrinho automaticamente
        setCartModalOpen(true);

        // Limpar dados do sessionStorage
        sessionStorage.removeItem("editingOrder");

        toast.info("Pedido carregado para edição");
      } catch (error) {
        sessionStorage.removeItem("editingOrder");
      }
    }
  }, []);

  useEffect(() => {
    // Resetar subcategoria quando mudar categoria principal
    setSelectedSubcategory(null);

    if (selectedCategory) {
      // Se a categoria tem subcategorias, não buscar produtos ainda
      // Se não tem subcategorias, buscar produtos diretamente
      if (!selectedCategory.children || selectedCategory.children.length === 0) {
        fetchProductsByCategory(selectedCategory.id);
      } else {
        // Se tem subcategorias, limpar produtos até selecionar uma subcategoria
        setProducts([]);
      }
    }
  }, [selectedCategory]);

  useEffect(() => {
    // Quando uma subcategoria for selecionada, buscar produtos dela
    if (selectedSubcategory) {
      fetchProductsByCategory(selectedSubcategory.id);
    }
  }, [selectedSubcategory]);

  async function fetchProductsByCategory(categoryId: string) {
    setLoading(true);
    const apiClient = setupApiClient();

    try {
      const response = await apiClient.get("/category/product", {
        params: { categoryId },
      });

      setProducts(response.data);
    } catch (error) {
      toast.error("Erro ao carregar produtos");
    }

    setLoading(false);
  }

  function handleProductClick(product: Product) {
    // Verificar se o produto está disponível
    if (!product.available) {
      toast.warning("Este produto está temporariamente indisponível!");
      return;
    }

    setSelectedProduct(product);
    setProductModalOpen(true);
  }

  // Agrupamento Inteligente (Smart Grouping)
  function handleAddToCart(item: CartItem) {
    const existingItemIndex = cart.findIndex((cartItem) => {
      const sameProduct = cartItem.product.id === item.product.id;
      const sameMeat = cartItem.meatChoice?.id === item.meatChoice?.id;
      const sameRemovals = JSON.stringify(cartItem.removals.sort()) === JSON.stringify(item.removals.sort());
      const sameAdditions =
        JSON.stringify(cartItem.additions.map((a) => ({ id: a.id, qty: a.quantity })).sort((a, b) => a.id.localeCompare(b.id))) ===
        JSON.stringify(item.additions.map((a) => ({ id: a.id, qty: a.quantity })).sort((a, b) => a.id.localeCompare(b.id)));
      const sameNotes = cartItem.notes.trim() === item.notes.trim();

      return sameProduct && sameMeat && sameRemovals && sameAdditions && sameNotes;
    });

    if (existingItemIndex !== -1) {
      // Item idêntico encontrado - incrementar quantidade
      const updatedCart = [...cart];
      updatedCart[existingItemIndex] = {
        ...updatedCart[existingItemIndex],
        amount: updatedCart[existingItemIndex].amount + item.amount,
        total: updatedCart[existingItemIndex].total + item.total,
      };
      setCart(updatedCart);
      toast.success("Quantidade atualizada no carrinho!");
    } else {
      // Item diferente - adicionar nova linha
      setCart([...cart, item]);
    }
  }

  function handleRemoveFromCart(index: number) {
    setCart(cart.filter((_, i) => i !== index));
    toast.info("Item removido do carrinho");
  }

  function handleUpdateCartItemQuantity(index: number, newAmount: number) {
    if (newAmount <= 0) {
      // Perguntar se quer remover
      if (confirm("Remover este item do carrinho?")) {
        handleRemoveFromCart(index);
      }
      return;
    }

    const updatedCart = [...cart];
    const item = updatedCart[index];

    // Recalcular o total baseado na nova quantidade
    const unitPrice = item.total / item.amount;
    updatedCart[index] = {
      ...item,
      amount: newAmount,
      total: unitPrice * newAmount,
    };

    setCart(updatedCart);
  }

  function handleUpdateCartItemNote(index: number, newNote: string) {
    // Atualizar valor imediatamente no estado local
    const updatedCart = [...cart];
    updatedCart[index] = {
      ...updatedCart[index],
      notes: newNote,
    };
    setCart(updatedCart);

    // Limpar timeout anterior se existir
    const existingTimeout = noteTimeouts.get(index);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Criar novo timeout para salvar após 500ms sem digitar
    const timeout = setTimeout(() => {
      // Remover timeout do mapa
      setNoteTimeouts((prev) => {
        const newMap = new Map(prev);
        newMap.delete(index);
        return newMap;
      });
    }, 500);

    // Salvar timeout no mapa
    setNoteTimeouts((prev) => {
      const newMap = new Map(prev);
      newMap.set(index, timeout);
      return newMap;
    });
  }

  function startEditingNote(index: number, currentNote: string) {
    setEditingNoteIndex(index);
  }

  function stopEditingNote() {
    setEditingNoteIndex(null);
  }

  // Limpar timeouts ao desmontar
  useEffect(() => {
    return () => {
      noteTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [noteTimeouts]);

  function isComplexProduct(product: Product): boolean {
    // Apenas Xis e Ká precisam escolher carne (espetinho)
    // Hambúrguer não precisa porque já vem com hambúrguer
    const productName = product.name.toLowerCase();
    const isXis = productName.includes("xis");
    const isKa = productName.includes("ká") || productName.includes("ka");

    return isXis || isKa;
  }

  function calculateCartTotal(): number {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }

  async function handleFinishOrder() {
    try {
      const apiClient = setupApiClient();

      // Preparar payload
      const payload: OrderPayload = {
        table: tableName,
        draft: false, // Pedido criado, não é rascunho
        status: OrderStatus.IN_PREPARATION,
        items: cart.map((cartItem) => ({
          productId: Number(cartItem.product.id),
          amount: cartItem.amount,
          meatChoiceId: cartItem.meatChoice?.id ? Number(cartItem.meatChoice.id) : undefined,
          meatPoint: cartItem.meatPoint, // Ponto da carne
          removals: cartItem.removals, // Array de Strings (Nomes)
          additions: cartItem.additions.flatMap((add) => Array(add.quantity).fill(Number(add.id))), // Array de Numbers (IDs repetidos baseado na quantidade)
          notes: cartItem.notes,
        })),
      };

      // Validar dados com Zod
      const { createOrderSchema } = await import("../../validations/orderValidations");
      const validatedPayload = createOrderSchema.parse(payload);

      await apiClient.post("/order", validatedPayload);

      toast.success("Pedido realizado com sucesso!");

      // Limpar carrinho e dados
      setCart([]);
      setTableName("");
      setCartModalOpen(false);

      // Redirecionar para a tela de listagem de pedidos
      Router.push("/dashboard");
    } catch (error: any) {
      // Tratar erros de validação do Zod
      if (error.errors) {
        const firstError = error.errors[0];
        toast.warn(firstError.message);
      } else {
        toast.error("Erro ao criar pedido!");
      }
    }
  }

  return (
    <>
      <Head>
        <title>PDV - Espetinho Casanova</title>
      </Head>

      <div className={styles.page}>
        <Header />

        <main className={styles.container}>
          <div className={styles.header}>
            <h1>Ponto de Venda</h1>
          </div>

          {/* Abas de Categorias */}
          <div className={styles.categoryTabs}>
            {categories.map((category) => (
              <button
                key={category.id}
                className={`${styles.categoryTab} ${selectedCategory?.id === category.id ? styles.active : ""}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category.categoryName}
              </button>
            ))}
          </div>

          {/* Abas de Subcategorias (quando categoria principal tem subcategorias) */}
          {selectedCategory?.children && selectedCategory.children.length > 0 && (
            <>
              {/* Desktop: Abas horizontais com scroll */}
              <div className={styles.subcategoryTabs}>
                {selectedCategory.children.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    className={`${styles.categoryTab} ${selectedSubcategory?.id === subcategory.id ? styles.active : ""}`}
                    onClick={() => setSelectedSubcategory(subcategory)}
                  >
                    {subcategory.categoryName}
                  </button>
                ))}
              </div>

              {/* Mobile: Select dropdown */}
              <div className={styles.subcategorySelect}>
                <select
                  value={selectedSubcategory?.id || ""}
                  onChange={(e) => {
                    const subcategory = selectedCategory.children?.find((sub) => String(sub.id) === e.target.value);
                    setSelectedSubcategory(subcategory || null);
                  }}
                  className={styles.select}
                >
                  <option value="">Selecione uma subcategoria</option>
                  {selectedCategory.children.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.categoryName}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Grade de Produtos */}
          <div className={styles.productsGrid}>
            {loading ? (
              <p className={styles.loadingText}>Carregando produtos...</p>
            ) : products.length === 0 ? (
              <p className={styles.emptyText}>Nenhum produto disponível nesta categoria</p>
            ) : (
              products.map((product) => {
                // Verificar se é bebida (categoria pai é "Bebidas" ou banner é default-bebida.png)
                const isBeverage = product.banner === "default-bebida.png" || !product.banner;
                const hasImage = product.banner && product.banner !== "default-bebida.png";

                return (
                  <button
                    type="button"
                    key={product.id}
                    className={`${styles.productCard} ${!product.available ? styles.productUnavailable : ""}`}
                    onClick={() => handleProductClick(product)}
                  >
                    <div className={styles.productImage}>
                      {hasImage ? (
                        <img src={getImageUrl(product.banner)} alt={product.name} />
                      ) : (
                        <div className={styles.productImagePlaceholder}>
                          <FiCoffee size={48} color="var(--gray-100)" />
                        </div>
                      )}
                      {!product.available && <div className={styles.unavailableBadge}>Indisponível</div>}
                    </div>
                    <div className={styles.productInfo}>
                      <h3>{product.name}</h3>
                      <span className={styles.productPrice}>R$ {Number.parseFloat(product.price).toFixed(2)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Botão Flutuante do Carrinho */}
          {cart.length > 0 && (
            <button className={styles.cartButton} onClick={() => setCartModalOpen(true)}>
              <FiShoppingCart size={24} />
              <span className={styles.cartBadge}>{cart.length}</span>
              <span className={styles.cartTotal}>R$ {calculateCartTotal().toFixed(2)}</span>
            </button>
          )}
        </main>
      </div>

      {/* Modal de Detalhes do Produto */}
      <ModalProductDetail
        isOpen={productModalOpen}
        onRequestClose={() => setProductModalOpen(false)}
        product={selectedProduct}
        onAddToCart={handleAddToCart}
        isComplexProduct={selectedProduct ? isComplexProduct(selectedProduct) : false}
      />

      {/* Modal do Carrinho */}
      <Modal
        isOpen={cartModalOpen}
        onRequestClose={() => setCartModalOpen(false)}
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#1d1d2e",
            padding: "0",
            maxWidth: "95%",
            maxHeight: "90vh",
            width: "600px",
            borderRadius: "8px",
            overflow: "hidden",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.75)",
          },
        }}
      >
        <div className={styles.cartModal}>
          <div className={styles.cartHeader}>
            <div className={styles.headerLeft}>
              <h2>Carrinho</h2>
            </div>
            <button type="button" onClick={() => setCartModalOpen(false)} className={styles.closeButton}>
              <FiX size={22} color="#f34748" />
            </button>
          </div>

          <div className={styles.cartContent}>
            {/* Input de Mesa/Nome */}
            <div className={styles.orderInfo}>
              <input
                type="text"
                placeholder="Mesa/Nome *"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className={styles.input}
                required
              />
            </div>

            {/* Lista de Itens */}
            <div className={styles.cartItems}>
              {cart.map((item, index) => (
                <div key={`${item.product.id}-${index}`} className={styles.cartItem}>
                  <div className={styles.cartItemHeader}>
                    <div className={styles.headerContent}>
                      <div className={styles.itemPrice}>R$ {item.total.toFixed(2)}</div>
                      <h4>
                        {item.product.name}
                        {item.meatChoice && <span className={styles.meatChoiceLabel}> + {item.meatChoice.name}</span>}
                        {item.meatPoint && <span className={styles.meatPointLabel}> - {item.meatPoint}</span>}
                      </h4>
                    </div>
                    <button type="button" onClick={() => handleRemoveFromCart(index)} className={styles.removeButton}>
                      <FiTrash2 size={18} />
                    </button>
                  </div>

                  <div className={styles.cartItemDetails}>
                    {item.meatChoice && (
                      <p>
                        <strong>Carne:</strong> {item.meatChoice.name}
                      </p>
                    )}
                    {item.removals.length > 0 && (
                      <p>
                        <strong>Sem:</strong> {item.removals.join(", ")}
                      </p>
                    )}
                    {item.additions.length > 0 && (
                      <p>
                        <strong>Adicionais:</strong> {item.additions.map((add) => `${add.name} (${add.quantity}x)`).join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Quantidade e Observação na mesma linha */}
                  <div className={styles.cartItemBottom}>
                    {/* Controle de Quantidade */}
                    <div className={styles.cartItemQuantity}>
                      <div className={styles.quantityControls}>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartItemQuantity(index, item.amount - 1)}
                          className={styles.qtyButton}
                        >
                          <FiMinus size={16} />
                        </button>
                        <span className={styles.qtyValue}>{item.amount}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartItemQuantity(index, item.amount + 1)}
                          className={styles.qtyButton}
                        >
                          <FiPlus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Observações Editáveis */}
                    <div className={styles.cartItemNotes}>
                      {editingNoteIndex === index ? (
                        <div className={styles.noteEdit}>
                          <input
                            type="text"
                            value={item.notes || ""}
                            onChange={(e) => handleUpdateCartItemNote(index, e.target.value)}
                            onBlur={stopEditingNote}
                            placeholder="Observação..."
                            className={styles.noteInput}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className={styles.noteDisplay}>
                          <span>{item.notes || "Sem obs"}</span>
                          <button type="button" onClick={() => startEditingNote(index, item.notes)} className={styles.noteEditButton}>
                            <FiEdit2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer com Total e Botão */}
          <div className={styles.cartFooter}>
            <div className={styles.cartTotalPrice}>
              <span>Total</span>
              <strong>R$ {calculateCartTotal().toFixed(2)}</strong>
            </div>
            <button type="button" className={styles.finishButton} onClick={handleFinishOrder}>
              Abrir Pedido
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export const getServerSideProps = canSSRAuth(async (context) => {
  const apiClient = setupApiClient(context);

  try {
    // Buscar todas as categorias
    const categoriesResponse = await apiClient.get("/categories");
    const categories = categoriesResponse.data;

    // Buscar produtos da primeira categoria
    let initialProducts = [];
    if (categories.length > 0) {
      const productsResponse = await apiClient.get("/category/product", {
        params: { categoryId: categories[0].id },
      });
      initialProducts = productsResponse.data;
    }

    return {
      props: {
        categories,
        initialProducts,
      },
    };
  } catch (error) {
    return {
      props: {
        categories: [],
        initialProducts: [],
      },
    };
  }
});
