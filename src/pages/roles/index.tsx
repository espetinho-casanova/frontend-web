import { useState, useEffect } from "react";
import Head from "next/head";
import { Header } from "../../components/Header";
import styles from "./styles.module.scss";
import { setupApiClient } from "../../services/api";
import { toast } from "react-toastify";
import { canSSRAuth } from "../../utils/canSSRAuth";
import { FiTrash2, FiShield, FiPlus, FiEdit2, FiCheck, FiX } from "react-icons/fi";
import Modal from "react-modal";

type Permission = {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
};

type Role = {
  id: string;
  name: string;
  description?: string;
  permissions: Array<{
    permission: Permission;
  }>;
  _count?: {
    users: number;
  };
};

interface RolesPageProps {
  readonly initialRoles: Role[];
  readonly initialPermissions: {
    all: Permission[];
    grouped: Record<string, Permission[]>;
  };
}

export default function Roles({ initialRoles, initialPermissions }: RolesPageProps) {
  const [roles, setRoles] = useState<Role[]>(initialRoles || []);
  const [permissions, setPermissions] = useState<{
    all: Permission[];
    grouped: Record<string, Permission[]>;
  }>(initialPermissions || { all: [], grouped: {} });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  Modal.setAppElement("#__next");

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  async function fetchRoles() {
    try {
      const apiClient = setupApiClient();
      const response = await apiClient.get("/roles");
      setRoles(response.data);
    } catch (error) {
      console.error("Erro ao buscar cargos:", error);
      toast.error("Erro ao carregar cargos");
    }
  }

  async function fetchPermissions() {
    try {
      const apiClient = setupApiClient();
      const response = await apiClient.get("/permissions");
      setPermissions(response.data);
    } catch (error) {
      console.error("Erro ao buscar permissões:", error);
    }
  }

  function handleNewRole() {
    setEditingRole(null);
    setName("");
    setDescription("");
    setSelectedPermissions(new Set());
    setModalOpen(true);
  }

  function handleEdit(role: Role) {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description || "");
    const permissionIds = new Set(role.permissions.map((rp) => rp.permission.id));
    setSelectedPermissions(permissionIds);
    setModalOpen(true);
  }

  function togglePermission(permissionId: string) {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  }

  function toggleAllPermissionsInResource(resource: string) {
    const resourcePermissions = permissions.grouped[resource] || [];
    const resourcePermissionIds = resourcePermissions.map((p) => p.id);
    const allSelected = resourcePermissionIds.every((id) => selectedPermissions.has(id));

    const newSelected = new Set(selectedPermissions);
    if (allSelected) {
      // Desmarcar todas
      resourcePermissionIds.forEach((id) => newSelected.delete(id));
    } else {
      // Marcar todas
      resourcePermissionIds.forEach((id) => newSelected.add(id));
    }
    setSelectedPermissions(newSelected);
  }

  function isResourceFullySelected(resource: string): boolean {
    const resourcePermissions = permissions.grouped[resource] || [];
    if (resourcePermissions.length === 0) return false;
    return resourcePermissions.every((p) => selectedPermissions.has(p.id));
  }

  function isResourcePartiallySelected(resource: string): boolean {
    const resourcePermissions = permissions.grouped[resource] || [];
    if (resourcePermissions.length === 0) return false;
    const selectedCount = resourcePermissions.filter((p) => selectedPermissions.has(p.id)).length;
    return selectedCount > 0 && selectedCount < resourcePermissions.length;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const apiClient = setupApiClient();

      if (editingRole) {
        // Atualizar
        await apiClient.put(`/roles/${editingRole.id}`, {
          name,
          description,
          permissionIds: Array.from(selectedPermissions),
        });
        toast.success("Cargo atualizado com sucesso!");
      } else {
        // Criar
        await apiClient.post("/roles", {
          name,
          description,
          permissionIds: Array.from(selectedPermissions),
        });
        toast.success("Cargo criado com sucesso!");
      }

      setModalOpen(false);
      fetchRoles();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Erro ao salvar cargo";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmDelete = globalThis.confirm("Deseja realmente excluir este cargo?");

    if (!confirmDelete) return;

    try {
      const apiClient = setupApiClient();
      await apiClient.delete(`/roles/${id}`);

      toast.success("Cargo excluído com sucesso!");
      fetchRoles();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Erro ao excluir cargo";
      toast.error(errorMessage);
    }
  }

  const resourceLabels: Record<string, string> = {
    product: "Produtos",
    category: "Categorias",
    ingredient: "Ingredientes",
    addon: "Adicionais",
    order: "Pedidos",
    user: "Usuários",
    role: "Cargos",
  };

  const actionLabels: Record<string, string> = {
    view: "Visualizar",
    create: "Criar",
    edit: "Editar",
    delete: "Deletar",
    toggle_availability: "Alterar Disponibilidade",
    update_stock: "Atualizar Estoque",
    update_status: "Atualizar Status",
    finish: "Entregar",
  };

  return (
    <>
      <Head>
        <title>Cargos e Permissões - Espetinho Casanova</title>
      </Head>

      <div className={styles.page}>
        <Header />
        <main className={styles.container}>
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <h1>Cargos e Permissões</h1>
              <span className={styles.count}>
                {roles.length} {roles.length === 1 ? "cargo" : "cargos"}
              </span>
              <button type="button" className={styles.buttonAdd} onClick={handleNewRole}>
                <FiPlus size={20} />
                <span>Novo Cargo</span>
              </button>
            </div>
            <p className={styles.subtitle}>Gerencie os cargos e permissões do sistema</p>
          </div>

          {/* Lista de cargos */}
          {roles.length === 0 ? (
            <div className={styles.emptyState}>
              <FiShield size={48} color="var(--gray-100)" />
              <h3>Nenhum cargo cadastrado</h3>
              <p>Adicione o primeiro cargo para começar</p>
            </div>
          ) : (
            <div className={styles.list}>
              {roles.map((role) => (
                <div key={role.id} className={styles.roleCard}>
                  <div className={styles.roleIcon}>
                    <FiShield size={24} />
                  </div>
                  <div className={styles.roleContent}>
                    <div className={styles.roleHeader}>
                      <h3>{role.name}</h3>
                      <div className={styles.roleActions}>
                        <button
                          type="button"
                          className={styles.buttonEdit}
                          onClick={() => handleEdit(role)}
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          type="button"
                          className={styles.buttonDelete}
                          onClick={() => handleDelete(role.id)}
                          disabled={role._count && role._count.users > 0}
                          title={
                            role._count && role._count.users > 0
                              ? "Não é possível deletar cargo com usuários associados"
                              : "Deletar cargo"
                          }
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                    {role.description && <p className={styles.description}>{role.description}</p>}
                    <div className={styles.roleStats}>
                      <span className={styles.permissionCount}>
                        {role.permissions.length}{" "}
                        {role.permissions.length === 1 ? "permissão" : "permissões"}
                      </span>
                      {role._count && (
                        <span className={styles.userCount}>
                          {role._count.users}{" "}
                          {role._count.users === 1 ? "usuário" : "usuários"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal de formulário */}
          <Modal
            isOpen={modalOpen}
            onRequestClose={() => setModalOpen(false)}
            className={styles.modal}
            overlayClassName={styles.overlay}
          >
            <div className={styles.modalHeader}>
              <h2>{editingRole ? "Editar Cargo" : "Novo Cargo"}</h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Nome do Cargo *</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ex: Garçom, Cozinheiro, etc."
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Descrição</label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do cargo (opcional)"
                />
              </div>

              <div className={styles.permissionsSection}>
                <div className={styles.permissionsHeader}>
                  <label>Permissões *</label>
                  <span className={styles.selectedCount}>
                    {selectedPermissions.size} de {permissions.all.length} selecionadas
                  </span>
                </div>

                <div className={styles.permissionsList}>
                  {Object.entries(permissions.grouped).map(([resource, resourcePermissions]) => (
                    <div key={resource} className={styles.resourceGroup}>
                      <div className={styles.resourceHeader}>
                        <button
                          type="button"
                          className={styles.resourceToggle}
                          onClick={() => toggleAllPermissionsInResource(resource)}
                        >
                          {isResourceFullySelected(resource) ? (
                            <FiCheck size={16} />
                          ) : isResourcePartiallySelected(resource) ? (
                            <span className={styles.partialCheck}>−</span>
                          ) : (
                            <FiX size={16} />
                          )}
                          <span className={styles.resourceName}>
                            {resourceLabels[resource] || resource}
                          </span>
                        </button>
                      </div>
                      <div className={styles.permissionsGrid}>
                        {resourcePermissions.map((permission) => (
                          <label
                            key={permission.id}
                            className={`${styles.permissionItem} ${
                              selectedPermissions.has(permission.id) ? styles.selected : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                            />
                            <div className={styles.permissionInfo}>
                              <span className={styles.permissionAction}>
                                {actionLabels[permission.action] || permission.action}
                              </span>
                              {permission.description && (
                                <span className={styles.permissionDescription}>
                                  {permission.description}
                                </span>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.buttonCancel}
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.buttonSave} disabled={loading}>
                  {loading ? "Salvando..." : editingRole ? "Atualizar" : "Criar"}
                </button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </>
  );
}

export const getServerSideProps = canSSRAuth(async (context) => {
  const apiClient = setupApiClient(context);

  try {
    const [rolesResponse, permissionsResponse] = await Promise.all([
      apiClient.get("/roles").catch(() => ({ data: [] })),
      apiClient.get("/permissions").catch(() => ({ data: { all: [], grouped: {} } })),
    ]);

    return {
      props: {
        initialRoles: rolesResponse.data || [],
        initialPermissions: permissionsResponse.data || { all: [], grouped: {} },
      },
    };
  } catch (error) {
    return {
      props: {
        initialRoles: [],
        initialPermissions: { all: [], grouped: {} },
      },
    };
  }
});

