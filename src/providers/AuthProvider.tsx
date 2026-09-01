"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { obterAuth } from "@/lib/firebase/client";

interface ContextoAuth {
  usuario: User | null;
  uid: string | null;
  /** A claim `admin` foi concedida a esta conta. As regras do Firestore exigem. */
  ehAdministradora: boolean;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
}

const Contexto = createContext<ContextoAuth | null>(null);

/** Códigos do Firebase traduzidos. A usuária não deve ler "auth/invalid-credential". */
const MENSAGENS: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Esse e-mail não parece válido.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/too-many-requests":
    "Muitas tentativas. Espere um minuto e tente de novo.",
  "auth/network-request-failed":
    "Sem conexão para entrar. Verifique a internet.",
};

export function traduzirErroAuth(erro: unknown): string {
  const codigo =
    typeof erro === "object" && erro !== null && "code" in erro
      ? String((erro as { code: unknown }).code)
      : "";
  return MENSAGENS[codigo] ?? "Não foi possível entrar. Tente novamente.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [ehAdministradora, setEhAdministradora] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // onIdTokenChanged, e não onAuthStateChanged: precisamos reagir também à
    // renovação do token, que é quando uma claim recém-concedida aparece.
    const cancelar = onIdTokenChanged(obterAuth(), async (proximoUsuario) => {
      setUsuario(proximoUsuario);

      if (proximoUsuario) {
        try {
          const token = await proximoUsuario.getIdTokenResult();
          setEhAdministradora(token.claims.admin === true);
        } catch {
          // Offline, o token em cache ainda vale. Não derruba a sessão.
          setEhAdministradora((anterior) => anterior);
        }
      } else {
        setEhAdministradora(false);
      }

      setCarregando(false);
    });

    return cancelar;
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    await signInWithEmailAndPassword(obterAuth(), email.trim(), senha);
  }, []);

  const sair = useCallback(async () => {
    await signOut(obterAuth());
  }, []);

  const valor = useMemo<ContextoAuth>(
    () => ({
      usuario,
      uid: usuario?.uid ?? null,
      ehAdministradora,
      carregando,
      entrar,
      sair,
    }),
    [usuario, ehAdministradora, carregando, entrar, sair],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ContextoAuth {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  }
  return contexto;
}

/**
 * Atalho para telas internas, onde a sessão já foi garantida pelo layout.
 * Evita `uid!` espalhado por todo componente que consulta o Firestore.
 */
export function useUid(): string {
  const { uid } = useAuth();
  if (!uid) throw new Error("Tela autenticada renderizada sem sessão.");
  return uid;
}
