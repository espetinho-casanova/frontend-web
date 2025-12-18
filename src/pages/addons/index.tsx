import { useState } from "react";
import Head from "next/head";
import styles from "./styles.module.scss";
import { Header } from "../../components/Header";
import { canSSRWithPermission } from "../../utils/canSSRWithPermission";
import { setupApiClient } from "../../services/api";
import { FiTrash2, FiPlus, FiEdit2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { ModalAddonForm } from "../../components/ModalAddonForm";
import Modal from "react-modal";

type Addon = {
  id: string;
  name: string;
  price: string;
};

interface AddonsProps {
  readonly initialAddons: Addon[];
}

export default function Addons({ initialAddons }: AddonsProps) {
  const [addons, setAddons] = useState<Addon[]>(initialAddons || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

  Modal.setAppElement("#__next");

  async function handleRefreshAddons() {
    try {
      const apiClient = setupApiClient();
      const response = await apiClient.get("/addons");
      setAddons(response.data);
    } catch (error) {
      console.error("Erro ao buscar adicionais:", error);
      toast.error("Erro ao carregar adicionais!");
    }
  }

  async function handleDelete(id: string) {
    const confirmDelete = globalThis.confirm("Deseja realmente excluir este adicional?");

    if (!confirmDelete) return;

    try {
      const apiClient = setupApiClient();
      await apiClient.delete(`/addon/${id}`);

      // Remover adicional da lista
      setAddons(addons.filter((addon) => addon.id !== id));

      toast.success("Adicional excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir adicional:", error);
      toast.error("Erro ao excluir adicional! Pode haver produtos vinculados.");
    }
  }

  function formatDisplayPrice(price: string): string {
    const numPrice = Number.parseFloat(price);
    return numPrice.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <>
      <Head>
        <title>Adicionais - Espetinho Casanova</title>
      </Head>

      <div className={styles.page}>
        <Header />
        <main className={styles.container}>
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <h1>Adicionais</h1>
              <span className={styles.count}>
                {addons.length} {addons.length === 1 ? "adicional" : "adicionais"}
              </span>
              <button
                type="button"
                className={styles.buttonAdd}
                onClick={() => {
                  setEditingAddon(null);
                  setModalOpen(true);
                }}
              >
                <FiPlus size={20} />
                <span>Novo Adicional</span>
              </button>
            </div>
            <p className={styles.subtitle}>Cadastre adicionais (extras) que podem ser acrescentados aos produtos</p>
          </div>

          {/* Lista de adicionais */}
          {addons.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>Nenhum adicional cadastrado</h3>
              <p>Adicione o primeiro adicional para começar</p>
            </div>
          ) : (
            <div className={styles.list}>
              {addons.map((addon) => (
                <div key={addon.id} className={styles.card}>
                  <div className={styles.cardInfo}>
                    <h3>{addon.name}</h3>
                    <div className={styles.cardDetails}>
                      <span className={styles.cardPrice}>{formatDisplayPrice(addon.price)}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddon(addon);
                        setModalOpen(true);
                      }}
                      className={styles.editButton}
                      title="Editar adicional"
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(addon.id)}
                      className={styles.deleteButton}
                      title="Excluir adicional"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal de Cadastro/Edição */}
          <ModalAddonForm
            isOpen={modalOpen}
            onRequestClose={() => {
              setModalOpen(false);
              setEditingAddon(null);
            }}
            onSuccess={handleRefreshAddons}
            addon={editingAddon}
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
      const response = await apiClient.get("/addons");

      return {
        props: {
          initialAddons: response.data,
        },
      };
    } catch (error) {
      console.error("Erro ao buscar adicionais:", error);
      return {
        props: {
          initialAddons: [],
        },
      };
    }
  },
  {
    requiredManageResource: "addon",
    redirectTo: "/dashboard",
  }
);
