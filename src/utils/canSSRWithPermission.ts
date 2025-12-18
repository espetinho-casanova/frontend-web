import {
  GetServerSideProps,
  GetServerSidePropsResult,
  GetServerSidePropsContext,
} from "next";
import { parseCookies, destroyCookie } from "nookies";
import { AuthTokenError } from "../services/errors/AuthTokenError";
import { setupApiClient } from "../services/api";

type Permission = {
  id: string;
  name: string;
  resource: string;
  action: string;
};

type Role = {
  id: string;
  name: string;
  permissions: Array<{
    permission: Permission;
  }>;
};

type UserInfo = {
  id: string;
  name: string;
  login: string;
  role?: Role | null;
};

function hasPermission(user: UserInfo | null, permissionName: string): boolean {
  if (!user?.role) return false;
  return user.role.permissions.some(
    (rp) => rp.permission.name === permissionName
  );
}

function canManageResource(user: UserInfo | null, resource: string): boolean {
  if (!user?.role) return false;
  return user.role.permissions.some(
    (rp) =>
      rp.permission.resource === resource &&
      (rp.permission.action === "create" ||
        rp.permission.action === "edit" ||
        rp.permission.action === "delete")
  );
}

export function canSSRWithPermission<P>(
  fn: GetServerSideProps<P>,
  options: {
    requiredPermission?: string;
    requiredManageResource?: string;
    requiredAnyPermission?: string[]; // Permite acesso se tiver qualquer uma das permissões
    redirectTo?: string;
  } = {}
) {
  return async (
    context: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(context);
    const token = cookies["@es-casanova.token"];

    if (!token) {
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

    try {
      const apiClient = setupApiClient(context);
      let user: UserInfo | null = null;

      try {
        const userResponse = await apiClient.get("/userinfo");
        user = userResponse.data;
      } catch (error) {
        destroyCookie(context, "@es-casanova.token");
        return {
          redirect: {
            destination: "/",
            permanent: false,
          },
        };
      }

      if (options.requiredPermission) {
        if (!hasPermission(user, options.requiredPermission)) {
          return {
            redirect: {
              destination: options.redirectTo || "/dashboard",
              permanent: false,
            },
          };
        }
      }

      if (options.requiredManageResource) {
        if (!canManageResource(user, options.requiredManageResource)) {
          return {
            redirect: {
              destination: options.redirectTo || "/dashboard",
              permanent: false,
            },
          };
        }
      }

      if (options.requiredAnyPermission && options.requiredAnyPermission.length > 0) {
        const hasAnyPermission = options.requiredAnyPermission.some((permission) =>
          hasPermission(user, permission)
        );
        if (!hasAnyPermission) {
          return {
            redirect: {
              destination: options.redirectTo || "/dashboard",
              permanent: false,
            },
          };
        }
      }

      return await fn(context);
    } catch (err) {
      if (err instanceof AuthTokenError) {
        destroyCookie(context, "@es-casanova.token");
        return {
          redirect: {
            destination: "/",
            permanent: false,
          },
        };
      }
      throw err;
    }
  };
}

