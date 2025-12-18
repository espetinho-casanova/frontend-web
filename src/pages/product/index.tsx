import { useState, useEffect, useContext } from "react";
import Head from "next/head";
import styles from "./styles.module.scss";
import { Header } from "../../components/Header";
import { ModalProductForm } from "../../components/ModalProductForm";
import Modal from "react-modal";
import { canSSRWithPermission } from "../../utils/canSSRWithPermission";
import { setupApiClient } from "../../services/api";
import { toast } from "react-toastify";
import { FiPlus, FiEdit2, FiImage, FiCoffee } from "react-icons/fi";
import { getImageUrl } from "../../utils/imageUrl";
import { AuthContext } from "../../contexts/AuthContext";

export type Category = {
  id: number;
  categoryName: string;
  children?: Category[]; // Subcategorias
};

type Product = {
  id: number;
  name: string;
  price: string;
  description: string;
  banner: string;
  categoryId: number;
  available: boolean;
  stock?: number; // Estoque do produto
  ingredients?: Array<{ id: number; name: string }>;
  addons?: Array<{ id: number; name: string; price: string }>;
  category?: Category;
  canBeUsedInSandwich?: boolean; // Se o espetinho pode ser usado no lanche (Xis/Ká)
  hasMeatPoint?: boolean; // Se o produto tem ponto da carne (espetinhos de carne)
};

interface ProductPageProps {
  readonly categoryList: Category[];
}

export interface CategoryProps {
  readonly categoryList: Category[];
}

export default function ProductPage({ categoryList }: ProductPageProps) {
  const { hasPermission } = useContext(AuthContext);
  const [categories] = useState<Category[]>(categoryList || []);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    categoryList && categoryList.length > 0 ? categoryList[0] : null
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Verificar permissões
  const canCreateProduct = hasPermission("product.create");
  const canEditProduct = hasPermission("product.edit");
  const canUpdateStock = hasPermission("product.update_stock");
  const canToggleAvailability = hasPermission("product.toggle_availability");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Modal de Estoque
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState("");

  useEffect(() => {
    fetchAllProducts();
  }, []);

  useEffect(() => {
    // Resetar subcategoria quando mudar categoria principal
    setSelectedSubcategory(null);
    filterProducts();
  }, [selectedCategory, products]);

  useEffect(() => {
    // Quando uma subcategoria for selecionada, filtrar produtos
    filterProducts();
  }, [selectedSubcategory, products]);

  async function fetchAllProducts() {
    setLoading(true);
    try {
      const apiClient = setupApiClient();

      // Buscar produtos de todas as categorias e subcategorias
      const allProducts: Product[] = [];

      for (const category of categories) {
        // Se a categoria tem subcategorias, buscar produtos de cada subcategoria
        if (category.children && category.children.length > 0) {
          for (const subcategory of category.children) {
            const response = await apiClient.get("/category/product", {
              params: { categoryId: subcategory.id },
            });

            // Adicionar subcategoria ao produto
            const productsWithCategory = response.data.map((product: Product) => ({
              ...product,
              category: subcategory, // Produto pertence à subcategoria
            }));

            allProducts.push(...productsWithCategory);
          }
        } else {
          // Se não tem subcategorias, buscar produtos da categoria principal
          const response = await apiClient.get("/category/product", {
            params: { categoryId: category.id },
          });

          // Adicionar categoria ao produto
          const productsWithCategory = response.data.map((product: Product) => ({
            ...product,
            category: category,
          }));

          allProducts.push(...productsWithCategory);
        }
      }

      setProducts(allProducts);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }

  function filterProducts() {
    if (!selectedCategory) {
      setFilteredProducts(products);
      return;
    }

    // Se uma subcategoria foi selecionada, filtrar por ela
    if (selectedSubcategory) {
      setFilteredProducts(products.filter((p) => String(p.categoryId) === String(selectedSubcategory.id)));
      return;
    }

    // Se a categoria tem subcategorias, mostrar produtos de todas as subcategorias
    if (selectedCategory.children && selectedCategory.children.length > 0) {
      const subcategoryIds = selectedCategory.children.map((child) => String(child.id));
      setFilteredProducts(products.filter((p) => subcategoryIds.includes(String(p.categoryId))));
    } else {
      // Se não tem subcategorias, filtrar pela categoria principal
      setFilteredProducts(products.filter((p) => String(p.categoryId) === String(selectedCategory.id)));
    }
  }

  function handleNewProduct() {
    setSelectedProduct(null);
    setModalOpen(true);
  }

  function handleEditProduct(product: Product) {
    // Usar o produto diretamente da listagem (já vem com ingredients e addons)
    setSelectedProduct(product);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setSelectedProduct(null);
  }

  function handleSuccess() {
    fetchAllProducts();
  }

  async function handleToggleAvailability(product: Product, event: React.MouseEvent) {
    event.stopPropagation(); // Previne abrir o modal de edição

    try {
      const apiClient = setupApiClient();
      const response = await apiClient.patch(`/product/${product.id}/toggle-availability`);

      // Atualizar o produto na lista local
      const updatedProducts = products.map((p) => (p.id === product.id ? { ...p, available: response.data.available } : p));
      setProducts(updatedProducts);

      toast.success(response.data.available ? "Produto habilitado!" : "Produto desabilitado!");
    } catch (error) {
      console.error("Erro ao alterar disponibilidade:", error);
      toast.error("Erro ao alterar disponibilidade do produto!");
    }
  }

  function handleOpenStockModal(product: Product, event: React.MouseEvent) {
    event.stopPropagation(); // Previne abrir o modal de edição
    setStockProduct(product);
    setNewStock(String(product.stock || 0));
    setStockModalOpen(true);
  }

  function handleCloseStockModal() {
    setStockModalOpen(false);
    setStockProduct(null);
    setNewStock("");
  }

  async function handleUpdateStock() {
    if (!stockProduct) return;

    const stockValue = Number.parseInt(newStock);

    if (Number.isNaN(stockValue) || stockValue < 0) {
      toast.warn("Digite um valor válido para o estoque!");
      return;
    }

    try {
      const apiClient = setupApiClient();
      const response = await apiClient.put(`/product/${stockProduct.id}/stock`, {
        stock: stockValue,
      });

      // Atualizar o produto na lista local
      const updatedProducts = products.map((p) =>
        p.id === stockProduct.id ? { ...p, stock: response.data.stock, available: response.data.available } : p
      );
      setProducts(updatedProducts);

      toast.success("Estoque atualizado com sucesso!");
      handleCloseStockModal();
    } catch (error) {
      console.error("Erro ao atualizar estoque:", error);
      toast.error("Erro ao atualizar estoque do produto!");
    }
  }

  return (
    <>
      <Head>
        <title>Cardápio - Espetinho Casanova</title>
      </Head>

      <div className={styles.page}>
        <Header />

        <main className={styles.container}>
          {/* Cabeçalho da Página */}
          <div className={styles.pageHeader}>
            <div className={styles.titleRow}>
              <h1>Cardápio</h1>
              {canCreateProduct && (
                <button type="button" className={styles.newProductButton} onClick={handleNewProduct}>
                  <FiPlus size={20} />
                  <span>Novo Produto</span>
                </button>
              )}
            </div>
            <p className={styles.subtitle}>Gerencie os produtos do seu estabelecimento</p>
          </div>

          {/* Abas de Categorias */}
          <div className={styles.categoryTabs}>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
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
                    type="button"
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
                  <option value="">Todas as subcategorias</option>
                  {selectedCategory.children.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.categoryName}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Grid de Produtos */}
          {loading ? (
            <div className={styles.loadingContainer}>
              <p>Carregando produtos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <FiImage size={64} color="var(--gray-100)" />
              <h3>Nenhum produto encontrado</h3>
              <p>Adicione produtos ao seu cardápio para começar</p>
              {canCreateProduct && (
                <button type="button" className={styles.emptyStateButton} onClick={handleNewProduct}>
                  <FiPlus size={18} />
                  Adicionar Produto
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={styles.productsCount}>
                Exibindo <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? "produto" : "produtos"}
              </div>

              <div className={styles.productsGrid}>
                {filteredProducts.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    className={styles.productCard}
                    onClick={() => canEditProduct && handleEditProduct(product)}
                    style={{ cursor: canEditProduct ? "pointer" : "default" }}
                  >
                    <div className={styles.productImageContainer}>
                      {product.banner && product.banner !== "default-bebida.png" ? (
                        <img src={getImageUrl(product.banner)} alt={product.name} className={styles.productImage} />
                      ) : (
                        <div className={styles.productImagePlaceholder}>
                          <FiCoffee size={40} color="var(--gray-100)" />
                        </div>
                      )}
                      {canEditProduct && (
                        <button
                          type="button"
                          className={styles.editButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProduct(product);
                          }}
                        >
                          <FiEdit2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{product.name}</h3>
                      <p className={styles.productCategory}>{product.category?.categoryName || "Sem categoria"}</p>
                      <div className={styles.productFooter}>
                        <span className={styles.productPrice}>R$ {Number.parseFloat(product.price).toFixed(2)}</span>
                        <span className={`${styles.productStatus} ${product.available ? styles.available : styles.unavailable}`}>
                          {product.available ? "Disponível" : "Indisponível"}
                        </span>
                      </div>

                      {/* Info de ingredientes e adicionais */}
                      <div className={styles.productMeta}>
                        {product.ingredients && product.ingredients.length > 0 && (
                          <span className={styles.metaBadge}>
                            🥗 {product.ingredients.length} {product.ingredients.length === 1 ? "ingrediente" : "ingredientes"}
                          </span>
                        )}
                        {product.addons && product.addons.length > 0 && (
                          <span className={styles.metaBadge}>
                            🔥 {product.addons.length} {product.addons.length === 1 ? "adicional" : "adicionais"}
                          </span>
                        )}
                        {/* Badge de Estoque (Clicável) */}
                        {product.stock !== undefined && (
                          <>
                            {canUpdateStock ? (
                              <button
                                type="button"
                                className={`${styles.stockBadge} ${
                                  product.stock === 0 ? styles.stockEmpty : product.stock <= 10 ? styles.stockLow : ""
                                }`}
                                onClick={(e) => handleOpenStockModal(product, e)}
                                title="Clique para editar o estoque"
                              >
                                📦 Estoque: {product.stock}
                              </button>
                            ) : (
                              <span
                                className={`${styles.stockBadge} ${
                                  product.stock === 0 ? styles.stockEmpty : product.stock <= 10 ? styles.stockLow : ""
                                }`}
                                title="Estoque (somente leitura)"
                              >
                                📦 Estoque: {product.stock}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Toggle de Disponibilidade */}
                      {canToggleAvailability && (
                        <div className={styles.availabilityToggle}>
                          <span className={styles.toggleLabel}>{product.available ? "Disponível" : "Indisponível"}</span>
                          <button
                            type="button"
                            className={`${styles.toggleSwitch} ${product.available ? styles.toggleActive : ""}`}
                            onClick={(e) => handleToggleAvailability(product, e)}
                            title={product.available ? "Clique para desabilitar" : "Clique para habilitar"}
                          >
                            <span className={styles.toggleSlider}></span>
                          </button>
                        </div>
                      )}
                      {!canToggleAvailability && (
                        <div className={styles.availabilityToggle}>
                          <span className={styles.toggleLabel}>{product.available ? "Disponível" : "Indisponível"}</span>
                          <span className={styles.toggleLabel} style={{ opacity: 0.7 }}>
                            (somente leitura)
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </main>

        {/* Modal de Produto */}
        <ModalProductForm
          isOpen={modalOpen}
          onRequestClose={handleModalClose}
          categories={categories}
          product={selectedProduct}
          onSuccess={handleSuccess}
        />

        {/* Modal de Edição de Estoque */}
        <Modal
          isOpen={stockModalOpen}
          onRequestClose={handleCloseStockModal}
          style={{
            content: {
              top: "50%",
              left: "50%",
              right: "auto",
              bottom: "auto",
              transform: "translate(-50%, -50%)",
              backgroundColor: "var(--dark-900)",
              border: "1px solid var(--gray-100)",
              borderRadius: "8px",
              padding: "2rem",
              maxWidth: "400px",
              width: "90%",
            },
            overlay: {
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              zIndex: 1000,
            },
          }}
          ariaHideApp={false}
        >
          <div className={styles.stockModal}>
            <h2>Atualizar Estoque</h2>
            {stockProduct && (
              <>
                <p className={styles.productName}>{stockProduct.name}</p>
                <p className={styles.currentStock}>
                  Estoque atual: <strong>{stockProduct.stock}</strong>
                </p>
                <div className={styles.inputGroup}>
                  <label htmlFor="stock-input">Novo estoque:</label>
                  <input
                    id="stock-input"
                    type="number"
                    min="0"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className={styles.stockInput}
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" onClick={handleCloseStockModal} className={styles.cancelButton}>
                    Cancelar
                  </button>
                  <button type="button" onClick={handleUpdateStock} className={styles.confirmButton}>
                    Atualizar
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>
    </>
  );
}

export const getServerSideProps = canSSRWithPermission(
  async (context) => {
    const apiClient = setupApiClient(context);

    try {
      const categoriesResponse = await apiClient.get("/categories");

      return {
        props: {
          categoryList: categoriesResponse.data,
        },
      };
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      return {
        props: {
          categoryList: [],
        },
      };
    }
  },
  {
    // Permite acesso se tiver product.view (visualizar) ou product.toggle_availability (alterar disponibilidade)
    requiredAnyPermission: ["product.view", "product.toggle_availability"],
    redirectTo: "/dashboard",
  }
);
