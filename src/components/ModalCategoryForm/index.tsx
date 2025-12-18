import { useState, useEffect } from "react";
import Modal from "react-modal";
import { FiX } from "react-icons/fi";
import styles from "./styles.module.scss";
import { toast } from "react-toastify";
import { setupApiClient } from "../../services/api";

interface ModalCategoryFormProps {
  readonly isOpen: boolean;
  readonly onRequestClose: () => void;
  readonly onSuccess: () => void;
  readonly category?: { id: string | number; categoryName: string } | null;
}

export function ModalCategoryForm({ isOpen, onRequestClose, onSuccess, category }: ModalCategoryFormProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!category;

  useEffect(() => {
    if (isOpen) {
      if (category) {
        // Modo edição: preencher com dados da categoria
        setName(category.categoryName);
      } else {
        // Modo criação: reset
        setName("");
      }
    }
  }, [isOpen, category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    try {
      // Validar dados com Zod
      const { createCategorySchema, updateCategorySchema } = await import("../../validations/categoryValidations");
      const schema = isEditing ? updateCategorySchema : createCategorySchema;
      const validatedData = schema.parse({ name });

      const apiClient = setupApiClient();

      if (isEditing && category) {
        // Atualizar categoria existente
        await apiClient.put(`/category/${category.id}`, validatedData);
        toast.success("Categoria atualizada com sucesso!");
      } else {
        // Criar nova categoria
        await apiClient.post("/category", validatedData);
        toast.success("Categoria cadastrada com sucesso!");
      }

      onSuccess();
      onRequestClose();
    } catch (error: any) {
      // Tratar erros de validação do Zod
      if (error.errors) {
        const firstError = error.errors[0];
        toast.warn(firstError.message);
      } else {
        const errorMessage = error.response?.data?.error || "Erro ao cadastrar categoria!";
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
          <h2>{isEditing ? "Editar Categoria" : "Cadastrar Categoria"}</h2>
          <button type="button" onClick={onRequestClose} className={styles.closeButton}>
            <FiX size={28} />
          </button>
        </div>

        {/* Content */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Nome */}
          <div className={styles.field}>
            <label className={styles.label}>
              Nome da Categoria <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="Ex: Lanches, Bebidas, Espetinhos..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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

