import { useState } from "react";
import Head from "next/head";
import styles from "./styles.module.scss";
import { Header } from "../../components/Header";
import { canSSRWithPermission } from "../../utils/canSSRWithPermission";
import { setupApiClient } from "../../services/api";
import { FiTrash2, FiPlus, FiEdit2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { ModalIngredientForm } from "../../components/ModalIngredientForm";
import Modal from "react-modal";
import { useIngredients, useInvalidateIngredients } from "../../hooks/useIngredients";

type Ingredient = {
  id: string;
  name: string;
  nonRemovable?: boolean; // Se true, não pode ser removido (essencial)
};

interface IngredientsProps {
  readonly initialIngredients: Ingredient[];
}

export default function Ingredients({ initialIngredients }: IngredientsProps) {
  const { data: ingredients = initialIngredients || [], isLoading } = useIngredients();
  const invalidateIngredients = useInvalidateIngredients();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  Modal.setAppElement("#__next");

  async function handleRefreshIngredients() {
    invalidateIngredients();
  }

  async function handleDelete(id: string) {
    const confirmDelete = globalThis.confirm("Deseja realmente excluir este ingrediente?");

    if (!confirmDelete) return;

    try {
      const apiClient = setupApiClient();
      await apiClient.delete(`/ingredient/${id}`);

      // Invalidar cache para atualizar a lista
      invalidateIngredients();

      toast.success("Ingrediente excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir ingrediente:", error);
      toast.error("Erro ao excluir ingrediente! Pode haver produtos vinculados.");
    }
  }

  return (
    <>
      <Head>
        <title>Ingredientes - Espetinho Casanova</title>
      </Head>

      <div className={styles.page}>
        <Header />
        <main className={styles.container}>
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <h1>Ingredientes</h1>
              <span className={styles.count}>
                {ingredients.length} {ingredients.length === 1 ? "ingrediente" : "ingredientes"}
              </span>
              <button
                type="button"
                className={styles.buttonAdd}
                onClick={() => {
                  setEditingIngredient(null);
                  setModalOpen(true);
                }}
              >
                <FiPlus size={20} />
                <span>Novo Ingrediente</span>
              </button>
            </div>
            <p className={styles.subtitle}>Cadastre ingredientes que podem ser removidos dos produtos</p>
          </div>

          {/* Lista de ingredientes */}
          {ingredients.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>Nenhum ingrediente cadastrado</h3>
              <p>Adicione o primeiro ingrediente para começar</p>
            </div>
          ) : (
            <div className={styles.list}>
              {ingredients.map((ingredient) => (
                  <div key={ingredient.id} className={styles.card}>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardHeader}>
                      <h3>{ingredient.name}</h3>
                    </div>
                    {ingredient.nonRemovable && (
                      <span className={styles.essentialBadge} title="Ingrediente essencial - não pode ser removido">
                        Essencial
                      </span>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIngredient(ingredient);
                        setModalOpen(true);
                      }}
                      className={styles.editButton}
                      title="Editar ingrediente"
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ingredient.id)}
                      className={styles.deleteButton}
                      title="Excluir ingrediente"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal de Cadastro/Edição */}
          <ModalIngredientForm
            isOpen={modalOpen}
            onRequestClose={() => {
              setModalOpen(false);
              setEditingIngredient(null);
            }}
            onSuccess={handleRefreshIngredients}
            ingredient={editingIngredient}
          />
        </main>
      </div>
    </>
  );
}

export const getServerSideProps = canSSRWithPermission(
  async (context) => {
    try {
      const apiClient = setupApiClient(context);
      const response = await apiClient.get("/ingredients");

      return {
        props: {
          initialIngredients: response.data,
        },
      };
    } catch (error) {
      console.error("Erro ao buscar ingredientes:", error);
      return {
        props: {
          initialIngredients: [],
        },
      };
    }
  },
  {
    requiredManageResource: "ingredient",
    redirectTo: "/dashboard",
  }
);
