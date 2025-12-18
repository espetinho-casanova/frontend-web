import { useState, useEffect } from "react";
import Modal from "react-modal";
import { FiX } from "react-icons/fi";
import styles from "./styles.module.scss";
import { toast } from "react-toastify";
import { setupApiClient } from "../../services/api";

interface ModalAddonFormProps {
  readonly isOpen: boolean;
  readonly onRequestClose: () => void;
  readonly onSuccess: () => void;
  readonly addon?: { id: string | number; name: string; price: string | number } | null;
}

export function ModalAddonForm({ isOpen, onRequestClose, onSuccess, addon }: ModalAddonFormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!addon;

  useEffect(() => {
    if (isOpen) {
      if (addon) {
        // Modo edição: preencher com dados do adicional
        setName(addon.name);
        setPrice(String(addon.price));
      } else {
        // Modo criação: reset
        setName("");
        setPrice("");
      }
    }
  }, [isOpen, addon]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    try {
      // Validar dados com Zod
      const { createAddonSchema, updateAddonSchema } = await import("../../validations/addonValidations");
      const schema = isEditing ? updateAddonSchema : createAddonSchema;
      const validatedData = schema.parse({
        name,
        price: Number.parseFloat(price),
      });

      const apiClient = setupApiClient();

      if (isEditing && addon) {
        // Atualizar adicional existente
        await apiClient.put(`/addon/${addon.id}`, validatedData);
        toast.success("Adicional atualizado com sucesso!");
      } else {
        // Criar novo adicional
        await apiClient.post("/addon", validatedData);
        toast.success("Adicional cadastrado com sucesso!");
      }

      onSuccess();
      onRequestClose();
    } catch (error: any) {
      // Tratar erros de validação do Zod
      if (error.errors) {
        const firstError = error.errors[0];
        toast.warn(firstError.message);
      } else {
        const errorMessage = error.response?.data?.error || "Erro ao cadastrar adicional!";
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
          <h2>{isEditing ? "Editar Adicional" : "Cadastrar Adicional"}</h2>
          <button type="button" onClick={onRequestClose} className={styles.closeButton}>
            <FiX size={28} />
          </button>
        </div>

        {/* Content */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Nome */}
          <div className={styles.field}>
            <label className={styles.label}>
              Nome do Adicional <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="Ex: Bacon Extra, Queijo Extra..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Preço */}
          <div className={styles.field}>
            <label className={styles.label}>
              Preço <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={styles.input}
              placeholder="Ex: 3.50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
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

