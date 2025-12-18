import { useContext, useState } from "react";
import styles from "./styles.module.scss";
import Link from "next/link";

import { FiLogOut, FiMenu, FiX, FiUsers, FiShield, FiFolder, FiPackage, FiPlusCircle, FiBook } from "react-icons/fi";

import { AuthContext } from "../../contexts/AuthContext";

export function Header() {
  const { signOut, hasPermission, canManageResource } = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Verificar permissões para cada seção
  // Links de gerenciamento (Categorias, Ingredientes, etc) só aparecem se o usuário pode criar/editar/deletar
  // Cardápio aparece se pode visualizar OU alterar disponibilidade (garçom precisa acessar)
  // Links de visualização (Funcionários, Cargos) aparecem se o usuário pode visualizar
  const canManageCategories = canManageResource("category");
  const canManageIngredients = canManageResource("ingredient");
  const canManageAddons = canManageResource("addon");
  const canViewProducts = hasPermission("product.view") || hasPermission("product.toggle_availability");
  const canViewUsers = hasPermission("user.view");
  const canViewRoles = hasPermission("role.view");

  return (
    <header className={styles.headerContainer}>
      <div className={styles.headerContent}>
        <Link href="/dashboard">
          <img src="/white-logo-horizontal.png" alt="Espetinho Casanova" width={152} height={48} />
        </Link>

        <button 
          className={styles.menuToggle}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <FiX size={24} color="#fff" /> : <FiMenu size={24} color="#fff" />}
        </button>

        <nav className={`${styles.menuNav} ${isMenuOpen ? styles.menuOpen : ""}`}>
          <div className={styles.navLinks}>
            {canManageCategories && (
              <Link legacyBehavior href="/category">
                <a onClick={() => setIsMenuOpen(false)}>
                  <FiFolder size={18} />
                  <span>Categorias</span>
                </a>
              </Link>
            )}

            {canManageIngredients && (
              <Link legacyBehavior href="/ingredients">
                <a onClick={() => setIsMenuOpen(false)}>
                  <FiPackage size={18} />
                  <span>Ingredientes</span>
                </a>
              </Link>
            )}

            {canManageAddons && (
              <Link legacyBehavior href="/addons">
                <a onClick={() => setIsMenuOpen(false)}>
                  <FiPlusCircle size={18} />
                  <span>Adicionais</span>
                </a>
              </Link>
            )}

            {canViewProducts && (
              <Link legacyBehavior href="/product">
                <a onClick={() => setIsMenuOpen(false)}>
                  <FiBook size={18} />
                  <span>Cardápio</span>
                </a>
              </Link>
            )}

            {(canViewUsers || canViewRoles) && <div className={styles.separator} />}

            {canViewUsers && (
              <Link legacyBehavior href="/users">
                <a onClick={() => setIsMenuOpen(false)}>
                  <FiUsers size={18} />
                  <span>Funcionários</span>
                </a>
              </Link>
            )}

            {canViewRoles && (
              <Link legacyBehavior href="/roles">
                <a onClick={() => setIsMenuOpen(false)}>
                  <FiShield size={18} />
                  <span>Cargos</span>
                </a>
              </Link>
            )}
          </div>

          <div className={styles.separator} />

          <button onClick={signOut} className={styles.logoutButton}>
            <FiLogOut size={20} />
            <span>Sair</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
