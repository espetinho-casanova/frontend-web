import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Modal from "react-modal";
import styles from "./styles.module.scss";
import { FiUpload, FiX } from "react-icons/fi";
import { setupApiClient } from "../../services/api";
import { toast } from "react-toastify";
import { getImageUrl } from "../../utils/imageUrl";

type Category = {
  id: number;
  categoryName: string;
  children?: Category[]; // Subcategorias
};

type Ingredient = {
  id: string;
  name: string;
};

type Addon = {
  id: string;
  name: string;
  price: string;
};

type Product = {
  id?: number;
  name: string;
  price: string;
  description: string;
  banner: string;
  categoryId: number;
  ingredients?: Array<{ id: number; name: string }>;
  addons?: Array<{ id: number; name: string; price: string }>;
  canBeUsedInSandwich?: boolean; // Se o espetinho pode ser usado no lanche (Xis/Ká)
  hasMeatPoint?: boolean; // Se o produto tem ponto da carne (espetinhos de carne)
};

interface ModalProductFormProps {
  readonly isOpen: boolean;
  readonly onRequestClose: () => void;
  readonly categories: Category[];
  readonly product?: Product | null;
  readonly onSuccess: () => void;
}

export function ModalProductForm({
  isOpen,
  onRequestClose,
  categories,
  product,
  onSuccess,
}: ModalProductFormProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "ingredients" | "addons">("basic");

  // Dados básicos
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [canBeUsedInSandwich, setCanBeUsedInSandwich] = useState(true);
  const [hasMeatPoint, setHasMeatPoint] = useState(true);

  // Imagem
  const [avatarUrl, setAvatarUrl] = useState("");
  const [imageAvatar, setImageAvatar] = useState<File | null>(null);

  // Listas disponíveis
  const [ingredientsList, setIngredientsList] = useState<Ingredient[]>([]);
  const [addonsList, setAddonsList] = useState<Addon[]>([]);

  // Seleções
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  const isEditMode = !!product?.id;

  // Fetch ingredientes e adicionais ao abrir modal
  useEffect(() => {
    if (isOpen) {
      fetchIngredients();
      fetchAddons();
    }
  }, [isOpen]);

  // Preencher form quando editar
  useEffect(() => {
    if (product && isOpen) {
      setName(product.name || "");
      setPrice(product.price || "");
      setDescription(product.description || "");
      setCategoryId(product.categoryId ? String(product.categoryId) : "");
      setAvatarUrl(product.banner ? getImageUrl(product.banner) : "");
      setCanBeUsedInSandwich((product as any).canBeUsedInSandwich !== undefined ? (product as any).canBeUsedInSandwich : true);
      setHasMeatPoint((product as any).hasMeatPoint !== undefined ? (product as any).hasMeatPoint : false);

      // Pre-selecionar ingredientes e adicionais
      if (product.ingredients) {
        setSelectedIngredientIds(product.ingredients.map((i) => String(i.id)));
      }
      if (product.addons) {
        setSelectedAddonIds(product.addons.map((a) => String(a.id)));
      }
    } else if (isOpen) {
      // Modo criação - limpar form
      resetForm();
    }
  }, [product, isOpen]);

  async function fetchIngredients() {
    try {
      const apiClient = setupApiClient();
      const response = await apiClient.get("/ingredients");
      setIngredientsList(response.data);
    } catch (error) {
      console.error("Erro ao buscar ingredientes:", error);
    }
  }

  async function fetchAddons() {
    try {
      const apiClient = setupApiClient();
      const response = await apiClient.get("/addons");
      setAddonsList(response.data);
    } catch (error) {
      console.error("Erro ao buscar adicionais:", error);
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0]) return;

    const image = e.target.files[0];
    if (image.type === "image/jpeg" || image.type === "image/png" || image.type === "image/webp") {
      setImageAvatar(image);
      setAvatarUrl(URL.createObjectURL(image));
    } else {
      toast.warn("Formato de imagem inválido! Use JPG, PNG ou WEBP.");
    }
  }

  function toggleIngredient(ingredientId: string) {
    if (selectedIngredientIds.includes(ingredientId)) {
      setSelectedIngredientIds(selectedIngredientIds.filter((id) => id !== ingredientId));
    } else {
      setSelectedIngredientIds([...selectedIngredientIds, ingredientId]);
    }
  }

  function toggleAddon(addonId: string) {
    if (selectedAddonIds.includes(addonId)) {
      setSelectedAddonIds(selectedAddonIds.filter((id) => id !== addonId));
    } else {
      setSelectedAddonIds([...selectedAddonIds, addonId]);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (name === "" || price === "") {
      toast.warn("Preencha o nome e o preço do produto!");
      return;
    }

    if (!categoryId) {
      toast.warn("Selecione uma categoria!");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("name", name);
      data.append("price", price);
      data.append("description", description || "");
      data.append("categoryId", categoryId);

      if (imageAvatar) {
        data.append("file", imageAvatar);
      }

      data.append("ingredientIds", JSON.stringify(selectedIngredientIds));
      data.append("addonIds", JSON.stringify(selectedAddonIds));
      data.append("canBeUsedInSandwich", String(canBeUsedInSandwich));
      data.append("hasMeatPoint", String(hasMeatPoint));

      const apiClient = setupApiClient();

      if (isEditMode) {
        // Edição
        await apiClient.put(`/product/${product.id}`, data);
        toast.success("Produto atualizado com sucesso!");
      } else {
        // Criação
        await apiClient.post("/product", data);
        toast.success("Produto cadastrado com sucesso!");
      }

      resetForm();
      onSuccess();
      onRequestClose();
    } catch (error) {
      toast.error("Erro ao salvar produto!");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setPrice("");
    setDescription("");
    setCategoryId("");
    setAvatarUrl("");
    setImageAvatar(null);
    setSelectedIngredientIds([]);
    setSelectedAddonIds([]);
    setCanBeUsedInSandwich(true);
    setHasMeatPoint(true);
    setActiveTab("basic");
  }

  // Verificar se a categoria selecionada é "Espetinhos"
  const selectedCategory = categories.find((cat) => String(cat.id) === String(categoryId));
  const isEspetinhoCategory = selectedCategory?.categoryName.toLowerCase().includes("espetinho") || false;

  function handleClose() {
    resetForm();
    onRequestClose();
  }

  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      padding: "0",
      transform: "translate(-50%, -50%)",
      backgroundColor: "var(--dark-900)",
      border: "1px solid var(--gray-100)",
      borderRadius: "8px",
      maxWidth: "800px",
      width: "90%",
      maxHeight: "90vh",
      overflow: "hidden",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      zIndex: 999,
    },
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} style={customStyles} ariaHideApp={false}>
      <div className={styles.modalContainer}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2>{isEditMode ? "Editar Produto" : "Novo Produto"}</h2>
          <button type="button" onClick={handleClose} className={styles.closeButton}>
            <FiX size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "basic" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("basic")}
          >
            Dados Básicos
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "ingredients" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("ingredients")}
          >
            Ingredientes ({selectedIngredientIds.length})
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "addons" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("addons")}
          >
            Adicionais ({selectedAddonIds.length})
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className={styles.modalContent}>
          {/* Aba: Dados Básicos */}
          {activeTab === "basic" && (
            <div className={styles.tabContent}>
              {/* Upload de Imagem */}
              <label className={styles.labelAvatar}>
                <span>
                  <FiUpload size={30} color="#fff" />
                </span>
                <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFile} />
                {avatarUrl && <img src={avatarUrl} alt="Foto do produto" className={styles.preview} />}
              </label>

              <input
                type="text"
                placeholder="Nome do produto *"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                type="text"
                placeholder="Preço (ex: 25.00) *"
                className={styles.input}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />

              <select className={styles.select} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Selecione uma categoria *</option>
                {categories.flatMap((category) => {
                  // Se a categoria tem subcategorias, mostrar apenas as subcategorias
                  if (category.children && category.children.length > 0) {
                    return category.children.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {category.categoryName} - {subcategory.categoryName}
                      </option>
                    ));
                  }
                  // Se não tem subcategorias, mostrar a categoria principal
                  return [
                    <option key={category.id} value={category.id}>
                      {category.categoryName}
                    </option>,
                  ];
                })}
              </select>

              <textarea
                placeholder="Descrição do produto (opcional)"
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />

              {/* Opções específicas para categoria Espetinhos */}
              {isEspetinhoCategory && (
                <div className={styles.checkboxOptions}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={canBeUsedInSandwich}
                      onChange={(e) => setCanBeUsedInSandwich(e.target.checked)}
                    />
                    <span>Pode ser usado no lanche (Xis/Ká)</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={hasMeatPoint}
                      onChange={(e) => setHasMeatPoint(e.target.checked)}
                    />
                    <span>Tem ponto da carne</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Aba: Ingredientes */}
          {activeTab === "ingredients" && (
            <div className={styles.tabContent}>
              <div className={styles.sectionHeader}>
                <h3>Composição Padrão</h3>
                <p>Selecione os ingredientes que compõem este produto</p>
              </div>

              {ingredientsList.length === 0 ? (
                <p className={styles.emptyMessage}>Nenhum ingrediente cadastrado. Cadastre ingredientes primeiro.</p>
              ) : (
                <div className={styles.checkboxGrid}>
                  {ingredientsList.map((ingredient) => (
                    <label key={ingredient.id} className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        checked={selectedIngredientIds.includes(String(ingredient.id))}
                        onChange={() => toggleIngredient(String(ingredient.id))}
                      />
                      <span>{ingredient.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba: Adicionais */}
          {activeTab === "addons" && (
            <div className={styles.tabContent}>
              <div className={styles.sectionHeader}>
                <h3>Adicionais Permitidos</h3>
                <p>Selecione quais adicionais podem ser incluídos neste produto</p>
              </div>

              {addonsList.length === 0 ? (
                <p className={styles.emptyMessage}>Nenhum adicional cadastrado. Cadastre adicionais primeiro.</p>
              ) : (
                <div className={styles.checkboxGrid}>
                  {addonsList.map((addon) => (
                    <label key={addon.id} className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        checked={selectedAddonIds.includes(String(addon.id))}
                        onChange={() => toggleAddon(String(addon.id))}
                      />
                      <span>
                        {addon.name}{" "}
                        <span className={styles.addonPrice}>+ R$ {Number.parseFloat(addon.price).toFixed(2)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer com botões */}
          <div className={styles.modalFooter}>
            <button type="button" onClick={handleClose} className={styles.cancelButton} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "Salvando..." : isEditMode ? "Atualizar Produto" : "Cadastrar Produto"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

