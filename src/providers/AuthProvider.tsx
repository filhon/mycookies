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
  type ParsedToken,
  type User,
} from "firebase/auth";
import { obterAuth } from "@/lib/firebase/client";
import { docConta } from "@/lib/firebase/colecoes";
import { useDocumento } from "@/lib/hooks/useColecao";
import type { Conta, ContasDaClaim } from "@/lib/types";

interface ContextoAuth {
  /** Quem entrou. */
  usuario: User | null;
  /** De quem é o dado. `null` = login sem vínculo com conta alguma. */
  contaId: string | null;
  /** O documento da conta. `null` enquanto a primeira leitura não chega. */
  conta: Conta | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  /**
   * Reconfere o vínculo forçando a renovação do token. Resolve `true` quando
   * há conta, `false` quando o acesso ainda não foi concedido, e rejeita se
   * não houver rede para perguntar.
   */
  reconferirAcesso: () => Promise<boolean>;
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
  "auth/missing-email": "Escreva o seu e-mail no campo acima.",
};

/**
 * O mesmo mapa serve à entrada e à recuperação de senha, e por isso a frase de
 * saída é parâmetro: "Não foi possível entrar" não serve para quem estava
 * pedindo um link de senha nova.
 */
export function traduzirErroAuth(
  erro: unknown,
  padrao = "Não foi possível entrar. Tente novamente.",
): string {
  const codigo =
    typeof erro === "object" && erro !== null && "code" in erro
      ? String((erro as { code: unknown }).code)
      : "";
  return MENSAGENS[codigo] ?? padrao;
}

/**
 * Lê o vínculo de conta da claim `{ contas: { [contaId]: papel } }`.
 *
 * A primeira chave é a conta ativa, e não há seletor de conta na interface:
 * com uma conta, escolher é ruído. Quando existir a segunda, este é o ponto
 * único que passa a consultar uma preferência em vez de decidir sozinho.
 */
function contaAtivaDaClaim(claims: ParsedToken): string | null {
  const contas = claims.contas as ContasDaClaim | undefined;
  if (typeof contas !== "object" || contas === null) return null;
  return Object.keys(contas)[0] ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [contaId, setContaId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // onIdTokenChanged, e não onAuthStateChanged: precisamos reagir também à
    // renovação do token, que é quando uma claim recém-concedida aparece.
    const cancelar = onIdTokenChanged(obterAuth(), async (proximoUsuario) => {
      setUsuario(proximoUsuario);

      if (proximoUsuario) {
        try {
          const token = await proximoUsuario.getIdTokenResult();
          setContaId(contaAtivaDaClaim(token.claims));
        } catch {
          // Offline, o token em cache ainda vale. Não derruba a sessão.
          setContaId((anterior) => anterior);
        }
      } else {
        setContaId(null);
      }

      setCarregando(false);
    });

    return cancelar;
  }, []);

  // O documento da conta é uma assinatura, não uma leitura avulsa: renomear o
  // negócio precisa aparecer sem recarregar o app, e o cache do Firestore
  // devolve a versão local antes mesmo de haver rede.
  const referenciaConta = useMemo(
    () => (contaId ? docConta(contaId) : null),
    [contaId],
  );
  const { dado: conta } = useDocumento<Conta>(referenciaConta);

  const entrar = useCallback(async (email: string, senha: string) => {
    await signInWithEmailAndPassword(obterAuth(), email.trim(), senha);
  }, []);

  const sair = useCallback(async () => {
    await signOut(obterAuth());
  }, []);

  /**
   * Claim recém-concedida não aparece sozinha: o token em cache vale uma hora,
   * e é por isso que o caminho antigo mandava sair e entrar de novo. O `true`
   * força a ida ao servidor e troca o token no lugar.
   */
  const reconferirAcesso = useCallback(async () => {
    const atual = obterAuth().currentUser;
    if (!atual) return false;

    const token = await atual.getIdTokenResult(true);
    const proximaConta = contaAtivaDaClaim(token.claims);
    setContaId(proximaConta);
    return proximaConta !== null;
  }, []);

  const valor = useMemo<ContextoAuth>(
    () => ({
      usuario,
      contaId,
      conta,
      carregando,
      entrar,
      sair,
      reconferirAcesso,
    }),
    [usuario, contaId, conta, carregando, entrar, sair, reconferirAcesso],
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
 * Atalho para telas internas, onde o layout já garantiu sessão e conta.
 * Evita `contaId!` espalhado por todo componente que consulta o Firestore.
 */
export function useContaId(): string {
  const { contaId } = useAuth();
  if (!contaId) throw new Error("Tela autenticada renderizada sem conta.");
  return contaId;
}
