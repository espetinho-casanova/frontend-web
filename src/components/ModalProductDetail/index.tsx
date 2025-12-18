import { useState, useEffect } from "react";
import Modal from "react-modal";
import { FiX, FiMinus, FiPlus } from "react-icons/fi";
import styles from "./styles.module.scss";
import { Product, CartItem } from "../../types/order";
import { setupApiClient } from "../../services/api";
import { toast } from "react-toastify";

interface ModalProductDetailProps {
  readonly isOpen: boolean;
  readonly onRequestClose: () => void;
  readonly product: Product | null;
  readonly onAddToCart: (item: CartItem) => void;
  readonly isComplexProduct: boolean; // Se é lanche complexo
}

export function ModalProductDetail({ isOpen, onRequestClose, product, onAddToCart, isComplexProduct }: ModalProductDetailProps) {
  const [amount, setAmount] = useState(1);
  const [meatChoice, setMeatChoice] = useState<Product | null>(null);
  const [meatPoint, setMeatPoint] = useState<string>("ao ponto"); // Ponto da carne (padrão: ao ponto)
  const [removals, setRemovals] = useState<string[]>([]); // Array de Strings (nomes)
  const [additions, setAdditions] = useState<{ [key: string]: number }>({}); // Objeto: { addonId: quantity }
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Listas de produtos auxiliares (carnes)
  const [meats, setMeats] = useState<Product[]>([]);
  
  // Verificar se o produto é um espetinho
  const [isEspetinho, setIsEspetinho] = useState(false);

  // DEBUG: Log do produto ao abrir
  useEffect(() => {
    if (product) {
      // Dados do produto já estão disponíveis via props
    }
  }, [product, isComplexProduct]);

  useEffect(() => {
    if (isOpen && product) {
    // Reset ao abrir
      setAmount(1);
      setMeatChoice(null);
      setMeatPoint("ao ponto");
      setRemovals([]);
      setAdditions({});
      setNotes("");

      // Verificar se é espetinho e buscar carnes (se necessário)
      if (isComplexProduct || product.categoryId) {
        checkCategoryAndFetchMeats();
      }
    }
  }, [isOpen, isComplexProduct, product]);

  async function checkCategoryAndFetchMeats() {
    if (!product) return;
    
    setLoading(true);
    const apiClient = setupApiClient();

    try {
      const categoriesResponse = await apiClient.get("/categories");
      const categories = categoriesResponse.data;

      // Verificar se tem ponto da carne (usando o campo hasMeatPoint do produto)
      setIsEspetinho((product as any).hasMeatPoint === true);

      // Buscar carnes (se for produto complexo)
      if (isComplexProduct) {
      const meatCategory = categories.find(
        (cat: any) => cat.categoryName.toLowerCase().includes("espetinho") || cat.categoryName.toLowerCase().includes("carne")
      );
      if (meatCategory) {
        const meatsResponse = await apiClient.get("/category/product", {
            params: { categoryId: meatCategory.id, onlyUsableInSandwich: true },
        });
        setMeats(meatsResponse.data);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar informações");
    }

    setLoading(false);
  }

  function handleIncrement() {
    setAmount(amount + 1);
  }

  function handleDecrement() {
    if (amount > 1) {
      setAmount(amount - 1);
    }
  }

  // Toggle ingrediente: Inicia INCLUÍDO, clicar = remover
  function toggleIngredient(ingredientName: string) {
    if (removals.includes(ingredientName)) {
      // Está removido, então re-adicionar (remover da lista de removals)
      setRemovals(removals.filter((item) => item !== ingredientName));
    } else {
      // Está incluído, então remover (adicionar à lista de removals)
      setRemovals([...removals, ingredientName]);
    }
  }

  // Incrementar quantidade do adicional
  function incrementAddition(addonId: string) {
    setAdditions((prev) => ({
      ...prev,
      [addonId]: (prev[addonId] || 0) + 1,
    }));
  }

  // Decrementar quantidade do adicional
  function decrementAddition(addonId: string) {
    setAdditions((prev) => {
      const currentQuantity = prev[addonId] || 0;
      if (currentQuantity <= 1) {
        // Se for 1 ou menos, remove do objeto
        const newAdditions = { ...prev };
        delete newAdditions[addonId];
        return newAdditions;
      }
      return {
        ...prev,
        [addonId]: currentQuantity - 1,
      };
    });
  }

  // Obter quantidade do adicional
  function getAdditionQuantity(addonId: string): number {
    return additions[addonId] || 0;
  }

  function calculateTotal(): number {
    if (!product) return 0;

    const basePrice = Number.parseFloat(String(product.price));

    // Calcular total dos adicionais (considerando quantidade)
    const additionsTotal = Object.entries(additions).reduce((sum, [addonId, quantity]) => {
      const addon = product.addons?.find((a) => String(a.id) === String(addonId));
      if (addon) {
        return sum + Number.parseFloat(String(addon.price)) * quantity;
      }
      return sum;
    }, 0);

    return (basePrice + additionsTotal) * amount;
  }

  function handleAddToCart() {
    if (!product) return;

    // Validação: Se é produto complexo, deve ter escolhido o espetinho
    if (isComplexProduct && !meatChoice) {
      toast.warn("Selecione um espetinho!");

      // Fazer scroll suave até o select e focar nele
      const selectElement = document.getElementById("meat-select") as HTMLSelectElement;
      if (selectElement) {
        selectElement.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          selectElement.focus();
          selectElement.click(); // Abre o dropdown
        }, 300);
      }
      return;
    }

    // Montar array de adições com detalhes completos para o carrinho
    const additionsWithDetails = Object.entries(additions)
      .filter(([_, quantity]) => quantity > 0) // Apenas adicionais com quantidade > 0
      .map(([addonId, quantity]) => {
      const addon = product.addons?.find((a) => String(a.id) === String(addonId));
      return {
        id: String(addonId),
        name: addon?.name || "",
        price: String(addon?.price || "0"),
          quantity: quantity, // Quantidade real do adicional
      };
    });

    const cartItem: CartItem = {
      product,
      amount,
      total: calculateTotal(),
      meatChoice: isComplexProduct ? meatChoice || undefined : undefined,
      meatPoint: isEspetinho ? meatPoint : undefined, // Ponto da carne apenas para espetinhos
      removals, // Array de Strings (nomes dos ingredientes)
      additions: additionsWithDetails,
      notes,
    };

    onAddToCart(cartItem);
    onRequestClose();
    toast.success("Produto adicionado ao carrinho!");
  }

  if (!product) return null;

  const customStyles = {
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
      width: "500px",
      borderRadius: "8px",
      overflow: "hidden",
      zIndex: 1008,
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      zIndex: 1007,
    },
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose} style={customStyles}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2>{product.name}</h2>
          </div>
              <button type="button" onClick={onRequestClose} className={styles.closeButton}>
                <FiX size={22} />
              </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Controle de Quantidade */}
          <div className={styles.quantityControl}>
            <span className={styles.quantityLabel}>Quantidade</span>
            <div className={styles.quantityButtons}>
              <button type="button" onClick={handleDecrement} disabled={amount <= 1}>
                <FiMinus size={16} />
              </button>
              <span className={styles.quantityValue}>{amount}</span>
              <button type="button" onClick={handleIncrement}>
                <FiPlus size={16} />
              </button>
            </div>
          </div>

          {/* 1. Escolha do Espetinho (Apenas para produtos complexos) */}
          {isComplexProduct && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Escolha o Espetinho <span className={styles.required}>*</span>
              </h3>
              {loading ? (
                <p>Carregando opções...</p>
              ) : (
                <select
                  id="meat-select"
                  className={styles.select}
                  value={meatChoice?.id || ""}
                  onChange={(e) => {
                    const selectedMeat = meats.find((m) => String(m.id) === e.target.value);
                    setMeatChoice(selectedMeat || null);
                  }}
                  required
                >
                  <option value="">Selecione um espetinho</option>
                  {meats.map((meat) => (
                    <option key={meat.id} value={meat.id}>
                      {meat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 1.5. Ponto da Carne (Apenas para espetinhos) */}
          {isEspetinho && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Ponto da Carne</h3>
              <div className={styles.meatPointButtons}>
                {["mal", ". pra mal", "ao ponto", ". pra bem", "bem"].map((point) => (
                  <button
                    key={point}
                    type="button"
                    className={`${styles.meatPointButton} ${meatPoint === point ? styles.meatPointActive : ""}`}
                    onClick={() => setMeatPoint(point)}
                  >
                    {point}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Ingredientes Removíveis (Filtrar apenas os que podem ser removidos) */}
          {product.ingredients && product.ingredients.filter((ing) => !ing.nonRemovable).length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitleRow}>
                <h3 className={styles.sectionTitle}>Ingredientes</h3>
                <span className={styles.sectionSubtitleInline}>(Clique para remover o que você não quer)</span>
              </div>
              <div className={styles.ingredientsList}>
                {product.ingredients
                  .filter((ingredient) => !ingredient.nonRemovable) // Apenas removíveis
                  .map((ingredient) => {
                    const isRemoved = removals.includes(ingredient.name);
                    return (
                      <button
                        key={ingredient.id}
                        type="button"
                        className={`${styles.ingredientButton} ${isRemoved ? styles.removed : styles.included}`}
                        onClick={() => toggleIngredient(ingredient.name)}
                      >
                        <span className={styles.ingredientName}>{ingredient.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 3. Turbine seu Lanche (Aparece sempre que o produto tiver adicionais) */}
          {product.addons && product.addons.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitleRow}>
                <h3 className={styles.sectionTitle}>Turbine seu Lanche</h3>
                <span className={styles.sectionSubtitleInline}>(Adicione extras deliciosos ao seu pedido)</span>
              </div>
              <div className={styles.addonsList}>
                {product.addons.map((addon) => {
                  const quantity = getAdditionQuantity(String(addon.id));
                  return (
                    <div key={addon.id} className={styles.addonItem}>
                      <div className={styles.addonInfo}>
                        <span className={styles.addonName}>{addon.name}</span>
                        <span className={styles.addonPrice}>+ R$ {Number.parseFloat(String(addon.price)).toFixed(2)}</span>
                      </div>
                      <div className={styles.addonQuantityControl}>
                        <button
                          type="button"
                          className={styles.quantityButton}
                          onClick={() => decrementAddition(String(addon.id))}
                          disabled={quantity === 0}
                          aria-label={`Diminuir ${addon.name}`}
                        >
                          <FiMinus size={14} />
                        </button>
                        <span className={styles.addonQuantity}>{quantity}</span>
                      <button
                        type="button"
                          className={styles.quantityButton}
                          onClick={() => incrementAddition(String(addon.id))}
                          aria-label={`Aumentar ${addon.name}`}
                      >
                          <FiPlus size={14} />
                      </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Observações */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Observações</h3>
            <input
              type="text"
              className={styles.noteInput}
              placeholder="Ex: Bem passado, sem sal..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer com Preço e Botão */}
        <div className={styles.footer}>
          <div className={styles.totalPrice}>
            <span>Total</span>
            <strong>R$ {calculateTotal().toFixed(2)}</strong>
          </div>
          <button type="button" className={styles.addButton} onClick={handleAddToCart}>
            Adicionar
          </button>
        </div>
      </div>
    </Modal>
  );
}
