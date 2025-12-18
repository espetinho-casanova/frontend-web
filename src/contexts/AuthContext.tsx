import { createContext, ReactNode, useState, useEffect } from "react";

import { api } from "../services/apiClient";
import { env } from "../config/env";

import { setCookie, parseCookies, destroyCookie } from "nookies";
import Router from "next/router";

import { toast } from "react-toastify";

type AuthContextData = {
  user: UserProps;
  isAuthenticated: boolean;
  signIn: (credentials: SingInProps) => Promise<void>;
  signOut: () => void;
  signUp: (credentials: SignUpProps) => Promise<void>;
  hasPermission: (permissionName: string) => boolean;
  canManageResource: (resource: string) => boolean;
};

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
};

type UserProps = {
  id: string;
  name: string;
  login: string;
  role?: Role | null;
};

type SingInProps = {
  login: string;
  password: string;
};

type SignUpProps = {
  name: string;
  login: string;
  password: string;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

export function signOut() {
  try {
    destroyCookie(undefined, env.NEXT_PUBLIC_COOKIE_NAME);
    Router.push("/");
  } catch {
    // Erro silencioso ao deslogar - não crítico
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProps>();
  const isAuthenticated = !!user;

  useEffect(() => {
    //tentar pegar o token no cookie
    const cookies = parseCookies();
    const token = cookies[env.NEXT_PUBLIC_COOKIE_NAME];

    if (token) {
      api
        .get("/userinfo")
        .then((response) => {
          const { id, name, login, role } = response.data;

          setUser({
            id,
            name,
            login,
            role: role || null,
          });
        })
        .catch(() => {
          //Se der erro deslogar o usuario.
          signOut();
        });
    }
  }, []);

  async function signIn({ login, password }: SingInProps) {
    try {
      const response = await api.post("/session", {
        login,
        password,
      });

      const { id, name, token } = response.data;

      setCookie(undefined, env.NEXT_PUBLIC_COOKIE_NAME, token, {
        maxAge: env.NEXT_PUBLIC_COOKIE_MAX_AGE,
        path: "/", //quais caminhos terao acesso ao cookie ( todos )
      });

      //passar para proximas requisições o token
      api.defaults.headers["Authorization"] = `Bearer ${token}`;

      // Buscar informações completas do usuário incluindo role e permissões
      const userInfoResponse = await api.get("/userinfo");
      const { id: userId, name: userName, login: userLogin, role } = userInfoResponse.data;

      setUser({
        id: userId,
        name: userName,
        login: userLogin,
        role: role || null,
      });

      toast.success("Logado com sucesso!");

      //Redirecionar o usuario que estiver logado para /dashboard
      Router.push("/dashboard");
    } catch (err) {
      toast.error("Erro ao acessar!");
    }
  }

  async function signUp({ name, login, password }: SignUpProps) {
    try {
      const response = await api.post("/users", {
        name,
        login,
        password,
      });

      toast.success("Conta criada com sucesso!");

      Router.push("/");
    } catch (err) {
      const { error } = err.response?.data || { error: "Erro ao cadastrar" };
      toast.error(error);
    }
  }

  function hasPermission(permissionName: string): boolean {
    if (!user?.role) return false;
    return user.role.permissions.some(
      (rp) => rp.permission.name === permissionName
    );
  }

  /**
   * Verifica se o usuário pode gerenciar um recurso (criar, editar ou deletar)
   * Usado para determinar se deve mostrar links de gerenciamento no menu
   */
  function canManageResource(resource: string): boolean {
    if (!user?.role) return false;
    return user.role.permissions.some(
      (rp) =>
        rp.permission.resource === resource &&
        (rp.permission.action === "create" ||
          rp.permission.action === "edit" ||
          rp.permission.action === "delete")
    );
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, signIn, signOut, signUp, hasPermission, canManageResource }}
    >
      {children}
    </AuthContext.Provider>
  );
}
