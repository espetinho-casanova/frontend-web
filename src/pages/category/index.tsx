import { useState } from "react";
import Head from "next/head";
import { Header } from "../../components/Header";
import styles from "./styles.module.scss";
import { setupApiClient } from "../../services/api";
import { toast } from "react-toastify";
import { canSSRWithPermission } from "../../utils/canSSRWithPermission";
import { FiTrash2, FiTag, FiPlus, FiEdit2 } from "react-icons/fi";
import { ModalCategoryForm } from "../../components/ModalCategoryForm";
import Modal from "react-modal";
import { useCategories, useInvalidateCategories } from "../../hooks/useCategories";

type Category = {
  id: string;
  categoryName: string;
};

interface CategoryPageProps {
  readonly initialCategories: Category[];
}

export default function Category({ initialCategories }: CategoryPageProps) {
  const { data: categories = initialCategories || [], isLoading } = useCategories();
  const invalidateCategories = useInvalidateCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  Modal.setAppElement("#__next");

  async function handleRefreshCategories() {
    invalidateCategories();
  }

  async function handleDelete(id: string) {
    const confirmDelete = globalThis.confirm("Deseja realmente excluir esta categoria?");

    if (!confirmDelete) return;

    try {
      const apiClient = setupApiClient();
      await apiClient.delete(`/category/${id}`);

      // Invalidar cache para atualizar a lista
      invalidateCategories();

      toast.success("Categoria excluída com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      toast.error("Erro ao excluir categoria! Pode haver produtos vinculados.");
    }
  }

  return (
    <>
      <Head>
        <title>Categorias - Espetinho Casanova</title>
      </Head>

      <div className={styles.page}>
        <Header />
        <main className={styles.container}>
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <h1>Categorias</h1>
              <span className={styles.count}>
                {categories.length} {categories.length === 1 ? "categoria" : "categorias"}
              </span>
              <button
                type="button"
                className={styles.buttonAdd}
                onClick={() => {
                  setEditingCategory(null);
                  setModalOpen(true);
                }}
              >
                <FiPlus size={20} />
                <span>Nova Categoria</span>
              </button>
            </div>
            <p className={styles.subtitle}>Organize seu cardápio em categorias</p>
          </div>

          {/* Lista de categorias */}
          {categories.length === 0 ? (
            <div className={styles.emptyState}>
              <FiTag size={48} color="var(--gray-100)" />
              <h3>Nenhuma categoria cadastrada</h3>
              <p>Adicione a primeira categoria para começar a organizar seu cardápio</p>
            </div>
          ) : (
            <div className={styles.list}>
              {categories.map((category) => (
                <div key={category.id} className={styles.categoryCard}>
                  <div className={styles.categoryInfo}>
                    <div className={styles.categoryIcon}>
                      <FiTag size={24} />
                    </div>
                    <div className={styles.categoryDetails}>
                      <h3>{category.categoryName}</h3>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(category);
                        setModalOpen(true);
                      }}
                      className={styles.editButton}
                      title="Editar categoria"
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(category.id)}
                      className={styles.deleteButton}
                      title="Excluir categoria"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal de Cadastro/Edição */}
          <ModalCategoryForm
            isOpen={modalOpen}
            onRequestClose={() => {
              setModalOpen(false);
              setEditingCategory(null);
            }}
            onSuccess={handleRefreshCategories}
            category={editingCategory}
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
      const response = await apiClient.get("/categories");

      return {
        props: {
          initialCategories: response.data,
        },
      };
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      return {
        props: {
          initialCategories: [],
        },
      };
    }
  },
  {
    requiredManageResource: "category",
    redirectTo: "/dashboard",
  }
);
