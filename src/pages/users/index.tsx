import { useState, useEffect } from "react";
import Head from "next/head";
import { Header } from "../../components/Header";
import styles from "./styles.module.scss";
import { setupApiClient } from "../../services/api";
import { toast } from "react-toastify";
import { canSSRAuth } from "../../utils/canSSRAuth";
import { FiTrash2, FiUser, FiPlus, FiEdit2, FiShield } from "react-icons/fi";
import Modal from "react-modal";
import { createUserSchema, updateUserSchema } from "../../validations/userValidations";

type Role = {
  id: string;
  name: string;
  description?: string;
};

type User = {
  id: string;
  name: string;
  login: string;
  roleId?: string | null;
  role?: Role | null;
  createdAt: string;
  updatedAt: string;
};

interface UsersPageProps {
  readonly initialUsers: User[];
  readonly initialRoles: Role[];
}

export default function Users({ initialUsers, initialRoles }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>(initialUsers || []);
  const [roles, setRoles] = useState<Role[]>(initialRoles || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<string>("");

  // Validation errors
  const [errors, setErrors] = useState<{
    name?: string;
    login?: string;
    password?: string;
    roleId?: string;
  }>({});

  Modal.setAppElement("#__next");

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  async function fetchUsers() {
    try {
      const apiClient = setupApiClient();
      const response = await apiClient.get("/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast.error("Erro ao carregar usuários");
    }
  }

  async function fetchRoles() {
    try {
      const apiClient = setupApiClient();
      const response = await apiClient.get("/roles");
      setRoles(response.data);
    } catch (error) {
      console.error("Erro ao buscar cargos:", error);
    }
  }

  function handleNewUser() {
    setEditingUser(null);
    setName("");
    setLogin("");
    setPassword("");
    setRoleId("");
    setErrors({});
    setModalOpen(true);
  }

  function handleEdit(user: User) {
    setEditingUser(user);
    setName(user.name);
    setLogin(user.login);
    setPassword("");
    setRoleId(user.roleId || "");
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validação com Zod
      const schema = editingUser ? updateUserSchema : createUserSchema;
      const dataToValidate: any = {
        name: name.trim(),
        login: login.trim(),
        password: password,
        roleId: roleId === "" ? null : roleId || null,
      };

      // Para edição, senha pode ser vazia
      if (editingUser && !password) {
        dataToValidate.password = "";
      }

      // Usar safeParse para melhor tratamento de erros
      const validationResult = schema.safeParse(dataToValidate);

      if (!validationResult.success) {
        const validationErrors: typeof errors = {};
        validationResult.error.issues.forEach((err) => {
          const field = err.path && err.path.length > 0 ? (err.path[0] as keyof typeof errors) : null;
          if (field) {
            validationErrors[field] = err.message;
          }
        });
        setErrors(validationErrors);
        toast.error("Por favor, corrija os erros no formulário");
        setLoading(false);
        return;
      }

      const validatedData = validationResult.data;
      const apiClient = setupApiClient();

      if (editingUser) {
        // Atualizar
        const data: any = { name: validatedData.name, login: validatedData.login };
        if (validatedData.password && validatedData.password.length > 0) {
          data.password = validatedData.password;
        }
        data.roleId = validatedData.roleId;

        await apiClient.put(`/users/${editingUser.id}`, data);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        // Criar
        await apiClient.post("/users", {
          name: validatedData.name,
          login: validatedData.login,
          password: validatedData.password,
          roleId: validatedData.roleId,
        });
        toast.success("Usuário criado com sucesso!");
      }

      setModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      // Erro da API
      const errorMessage = error.response?.data?.error || "Erro ao salvar usuário";
      const errorDetails = error.response?.data?.details;

      if (errorDetails && Array.isArray(errorDetails) && errorDetails.length > 0) {
        const validationErrors: typeof errors = {};
        errorDetails.forEach((detail: any) => {
          const field = detail.field as keyof typeof errors;
          if (field) {
            validationErrors[field] = detail.message;
          }
        });
        setErrors(validationErrors);
        toast.error("Por favor, corrija os erros no formulário");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmDelete = globalThis.confirm("Deseja realmente excluir este usuário?");

    if (!confirmDelete) return;

    try {
      const apiClient = setupApiClient();
      await apiClient.delete(`/users/${id}`);

      toast.success("Usuário excluído com sucesso!");
      fetchUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Erro ao excluir usuário";
      toast.error(errorMessage);
    }
  }

  return (
    <>
      <Head>
        <title>Funcionários - Espetinho Casanova</title>
      </Head>

      <div className={styles.page}>
        <Header />
        <main className={styles.container}>
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <h1>Funcionários</h1>
              <span className={styles.count}>
                {users.length} {users.length === 1 ? "funcionário" : "funcionários"}
              </span>
              <button type="button" className={styles.buttonAdd} onClick={handleNewUser}>
                <FiPlus size={20} />
                <span>Novo Funcionário</span>
              </button>
            </div>
            <p className={styles.subtitle}>Gerencie os funcionários do sistema</p>
          </div>

          {/* Lista de usuários */}
          {users.length === 0 ? (
            <div className={styles.emptyState}>
              <FiUser size={48} color="var(--gray-100)" />
              <h3>Nenhum funcionário cadastrado</h3>
              <p>Adicione o primeiro funcionário para começar</p>
            </div>
          ) : (
            <div className={styles.list}>
              {users.map((user) => (
                <div key={user.id} className={styles.userCard}>
                  <div className={styles.userInfo}>
                    <div className={styles.userIcon}>
                      <FiUser size={24} />
                    </div>
                    <div className={styles.userDetails}>
                      <h3>{user.name}</h3>
                      <p className={styles.login}>Login: {user.login}</p>
                      {user.role ? (
                        <div className={styles.roleBadge}>
                          <FiShield size={14} />
                          <span>{user.role.name}</span>
                        </div>
                      ) : (
                        <span className={styles.noRole}>Sem cargo</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.userActions}>
                    <button type="button" className={styles.buttonEdit} onClick={() => handleEdit(user)}>
                      <FiEdit2 size={18} />
                    </button>
                    <button type="button" className={styles.buttonDelete} onClick={() => handleDelete(user.id)}>
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal de formulário */}
          <Modal isOpen={modalOpen} onRequestClose={() => setModalOpen(false)} className={styles.modal} overlayClassName={styles.overlay}>
            <div className={styles.modalHeader}>
              <h2>{editingUser ? "Editar Funcionário" : "Novo Funcionário"}</h2>
              <button type="button" className={styles.closeButton} onClick={() => setModalOpen(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Nome *</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  required
                  placeholder="Digite o nome"
                  className={errors.name ? styles.inputError : ""}
                />
                {errors.name && <span className={styles.errorMessage}>{errors.name}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="login">Login *</label>
                <input
                  id="login"
                  type="text"
                  value={login}
                  onChange={(e) => {
                    setLogin(e.target.value);
                    if (errors.login) setErrors({ ...errors, login: undefined });
                  }}
                  required
                  placeholder="Digite o login"
                  className={errors.login ? styles.inputError : ""}
                />
                {errors.login && <span className={styles.errorMessage}>{errors.login}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">Senha {editingUser ? "(deixe em branco para não alterar)" : "*"}</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  required={!editingUser}
                  placeholder="Digite a senha"
                  className={errors.password ? styles.inputError : ""}
                />
                {errors.password && <span className={styles.errorMessage}>{errors.password}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="roleId">Cargo</label>
                <select
                  id="roleId"
                  value={roleId}
                  onChange={(e) => {
                    setRoleId(e.target.value);
                    if (errors.roleId) setErrors({ ...errors, roleId: undefined });
                  }}
                  className={errors.roleId ? styles.inputError : ""}
                >
                  <option value="">Sem cargo</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {errors.roleId && <span className={styles.errorMessage}>{errors.roleId}</span>}
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.buttonCancel} onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.buttonSave} disabled={loading}>
                  {loading ? "Salvando..." : editingUser ? "Atualizar" : "Criar"}
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
    const [usersResponse, rolesResponse] = await Promise.all([
      apiClient.get("/users").catch(() => ({ data: [] })),
      apiClient.get("/roles").catch(() => ({ data: [] })),
    ]);

    return {
      props: {
        initialUsers: usersResponse.data || [],
        initialRoles: rolesResponse.data || [],
      },
    };
  } catch (error) {
    return {
      props: {
        initialUsers: [],
        initialRoles: [],
      },
    };
  }
});
