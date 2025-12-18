import { useState, useEffect } from "react";
import Modal from "react-modal";
import { FiX } from "react-icons/fi";
import styles from "./styles.module.scss";
import { toast } from "react-toastify";
import { setupApiClient } from "../../services/api";

interface ModalIngredientFormProps {
  readonly isOpen: boolean;
  readonly onRequestClose: () => void;
  readonly onSuccess: () => void;
  readonly ingredient?: { id: string | number; name: string; nonRemovable?: boolean } | null;
}

export function ModalIngredientForm({ isOpen, onRequestClose, onSuccess, ingredient }: ModalIngredientFormProps) {
  const [name, setName] = useState("");
  const [nonRemovable, setNonRemovable] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditing = !!ingredient;

  useEffect(() => {
    if (isOpen) {
      if (ingredient) {
        // Modo edição: preencher com dados do ingrediente
        setName(ingredient.name);
        setNonRemovable(ingredient.nonRemovable || false);
      } else {
        // Modo criação: reset
        setName("");
        setNonRemovable(false);
      }
    }
  }, [isOpen, ingredient]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    try {
      // Validar dados com Zod
      const { createIngredientSchema, updateIngredientSchema } = await import("../../validations/ingredientValidations");
      const schema = isEditing ? updateIngredientSchema : createIngredientSchema;
      const validatedData = schema.parse({ name, nonRemovable });

      const apiClient = setupApiClient();
      
      if (isEditing && ingredient) {
        // Atualizar ingrediente existente
        await apiClient.put(`/ingredient/${ingredient.id}`, validatedData);
        toast.success("Ingrediente atualizado com sucesso!");
      } else {
        // Criar novo ingrediente
        await apiClient.post("/ingredient", validatedData);
        toast.success("Ingrediente cadastrado com sucesso!");
      }

      onSuccess();
      onRequestClose();
    } catch (error: any) {
      // Tratar erros de validação do Zod
      if (error.errors) {
        const firstError = error.errors[0];
        toast.warn(firstError.message);
      } else {
        const errorMessage = error.response?.data?.error || "Erro ao cadastrar ingrediente!";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

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
      width: "500px",
      borderRadius: "8px",
      overflow: "hidden",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.75)",
    },
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose} style={customStyles}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h2>{isEditing ? "Editar Ingrediente" : "Cadastrar Ingrediente"}</h2>
          <button type="button" onClick={onRequestClose} className={styles.closeButton}>
            <FiX size={28} />
          </button>
        </div>

        {/* Content */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Nome */}
          <div className={styles.field}>
            <label className={styles.label}>
              Nome do Ingrediente <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="Ex: Cebola, Tomate, Alface..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Não Removível */}
          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={nonRemovable}
                onChange={(e) => setNonRemovable(e.target.checked)}
                className={styles.checkbox}
              />
              <span>Ingrediente essencial (não pode ser removido)</span>
            </label>
            <p className={styles.helpText}>
              Se marcado, este ingrediente não aparecerá na lista de ingredientes removíveis nos produtos
            </p>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button type="button" onClick={onRequestClose} className={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? (isEditing ? "Atualizando..." : "Cadastrando...") : (isEditing ? "Atualizar" : "Cadastrar")}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

