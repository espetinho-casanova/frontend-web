import { FormEvent, useContext, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import styles from "../../styles/home.module.scss";

import logoImg from "../../public/logo-white.svg";

import { Input } from "../components/ui/Input";
import { CustomButton } from "../components/ui/customButton";

import { AuthContext } from "../contexts/AuthContext";
import { toast } from "react-toastify";

import Link from "next/link";

import { canSSRGuest } from "../utils/canSSRGuest";

export default function Home() {
  const { signIn } = useContext(AuthContext);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();

    setLoading(true);

    try {
      // Validar dados com Zod
      const { authUserSchema } = await import("../validations/userValidations");
      const validatedData = authUserSchema.parse({ login, password });

      await signIn(validatedData);
    } catch (error: any) {
      if (error.errors) {
        // Erros de validação do Zod
        const firstError = error.errors[0];
        toast.warn(firstError.message);
      } else {
        toast.warn("Por favor, forneça seu login e senha!");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Espetinho Casanonova - Login</title>
      </Head>
      <div className={styles.containerCenter}>
        <div className={styles.login}>
          <h1>Faça login!</h1>
          <form onSubmit={handleLogin}>
            <Input
              placeholder="Digite seu login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />

            <Input
              placeholder="Digite sua senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <CustomButton color="error" variant="contained" type="submit" loading={loading}>
              Acessar
            </CustomButton>
          </form>
        </div>

        <Image className="logo" src={logoImg} alt="Logo Espetinho Casanova" />
      </div>
    </>
  );
}

export const getServerSideProps = canSSRGuest(async (context) => {
  return {
    props: {},
  };
});
