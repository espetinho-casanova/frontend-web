import { useState, FormEvent, useContext } from "react";
import Head from "next/head";
import Image from "next/image";
import styles from "../../../styles/home.module.scss";

import logoImg from "../../../public/logo-white.svg";

import { Input } from "../../components/ui/Input";
import { CustomButton } from "../../components/ui/customButton";

import { AuthContext } from "../../contexts/AuthContext";
import { toast } from "react-toastify";

import Link from "next/link";

export default function SignUp() {
  const { signUp } = useContext(AuthContext);
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleSignUp(event: FormEvent) {
    event.preventDefault();

    setLoading(true);

    try {
      // Validar dados com Zod
      const { createUserSchema } = await import("../validations/userValidations");
      const validatedData = createUserSchema.parse({ name, login, password });

      await signUp(validatedData);
    } catch (error: any) {
      if (error.errors) {
        // Erros de validação do Zod
        const firstError = error.errors[0];
        toast.warn(firstError.message);
      } else {
        toast.warn("Por favor, preencha todos os campos corretamente!");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Cradastrar usuário</title>
      </Head>
      <div className={styles.containerCenter}>
        <div className={styles.login}>
          <h1>Criando sua conta</h1>

          <form onSubmit={handleSignUp}>
            <Input placeholder="Digite o nome" type="text" value={name} onChange={(e) => setName(e.target.value)} />

            <Input placeholder="Digite o login" type="text" value={login} onChange={(e) => setLogin(e.target.value)} />

            <Input placeholder="Digite a senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <CustomButton type="submit" loading={loading}>
              Cadastrar
            </CustomButton>
          </form>

          <Link legacyBehavior href="/">
            <a className={styles.text}>Já possui uma conta? Faça login!</a>
          </Link>
        </div>

        <Image className="logo" src={logoImg} alt="Logo Espetinho Casanova" />
      </div>
    </>
  );
}
