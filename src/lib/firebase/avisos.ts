import {
  collection,
  doc,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { obterApp, obterDb } from "./client";
import { despachar } from "./mutations/despachar";
import { caminhos, VERSAO_SCHEMA, type AparelhoDeAviso } from "@/lib/types";

/**
 * O aviso de pedido novo, por aparelho (spec 119, `DECISOES.md#d323`). O token
 * vem do FCM pelo service worker do Serwist, sem um segundo service worker; o
 * documento é `contas/{contaId}/aparelhos/{sha256 do token}`.
 */

const VAPID = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/** O id do documento deste aparelho, quando ele está ativo. */
const CHAVE_LOCAL = "rende:aviso-aparelho";

export function lerAparelhoLocal(): string | null {
  try {
    return localStorage.getItem(CHAVE_LOCAL);
  } catch {
    return null;
  }
}

function guardarAparelhoLocal(id: string | null) {
  try {
    if (id) localStorage.setItem(CHAVE_LOCAL, id);
    else localStorage.removeItem(CHAVE_LOCAL);
  } catch {
    // Sem armazenamento, o aparelho continua ativo; só não se renova sozinho.
  }
}

/**
 * O iPhone é a exceção ao "nada de user-agent" do `#d71`: fora do app
 * instalado o Safari não tem `PushManager`, e a pergunta "dá para avisar?"
 * responde só "não", sem dizer que instalar resolve. O iPad se diz Mac.
 */
export function ehIphone(): boolean {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

function plataforma(): AparelhoDeAviso["plataforma"] {
  if (ehIphone()) return "iphone";
  return /Android/i.test(navigator.userAgent) ? "android" : "computador";
}

/**
 * Dá para avisar neste navegador? Sem a chave Web Push, ou sem o service
 * worker registrado (o `npm run dev` não registra), também não.
 */
export async function avisoSuportado(): Promise<boolean> {
  if (!VAPID || !(await isSupported().catch(() => false))) return false;
  return Boolean(await navigator.serviceWorker.getRegistration());
}

async function tokenDoAparelho(): Promise<string> {
  return getToken(getMessaging(obterApp()), {
    vapidKey: VAPID,
    serviceWorkerRegistration: await navigator.serviceWorker.ready,
  });
}

async function idDoToken(token: string): Promise<string> {
  const resumo = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(resumo), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

const docAparelho = (contaId: string, id: string) =>
  doc(collection(obterDb(), caminhos.aparelhos(contaId)), id);

/** Regrava o documento inteiro: ativar de novo no mesmo aparelho é o mesmo id. */
function gravarAtivo(contaId: string, uid: string, id: string, token: string) {
  const agora = Timestamp.now();
  despachar(
    setDoc(docAparelho(contaId, id), {
      uid,
      token,
      ativo: true,
      plataforma: plataforma(),
      criadoEm: agora,
      atualizadoEm: agora,
      v: VERSAO_SCHEMA,
    } satisfies Omit<AparelhoDeAviso, "id">),
  );
  guardarAparelhoLocal(id);
}

function gravarDesligado(contaId: string, id: string) {
  despachar(
    updateDoc(docAparelho(contaId, id), {
      ativo: false,
      atualizadoEm: Timestamp.now(),
      v: VERSAO_SCHEMA,
    }),
  );
}

export type ResultadoDoAviso = "ativo" | "bloqueado" | "falhou";

/**
 * Só no toque: o navegador some com o pedido de quem pergunta ao abrir, e o
 * iPhone só pergunta de dentro de um gesto. Por isso a permissão é a primeira
 * coisa, antes de qualquer `await`.
 */
export async function ativarAviso(
  contaId: string,
  uid: string,
): Promise<ResultadoDoAviso> {
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return "bloqueado";
  try {
    const token = await tokenDoAparelho();
    gravarAtivo(contaId, uid, await idDoToken(token), token);
    return "ativo";
  } catch (erro) {
    console.error("Não deu para ativar o aviso", erro);
    return "falhou";
  }
}

export function desativarAviso(contaId: string) {
  const id = lerAparelhoLocal();
  if (id) gravarDesligado(contaId, id);
  guardarAparelhoLocal(null);
}

/**
 * O token envelhece (spec 119): ao abrir o app, com o aparelho ativo e a
 * permissão dada, pede de novo; mudou, grava o novo e desliga o antigo. Sem
 * rede, espera a próxima abertura.
 */
export async function renovarAviso(contaId: string, uid: string) {
  const anterior = lerAparelhoLocal();
  if (
    !anterior ||
    !navigator.onLine ||
    typeof Notification === "undefined" ||
    Notification.permission !== "granted" ||
    !(await avisoSuportado())
  ) {
    return;
  }
  try {
    const token = await tokenDoAparelho();
    const id = await idDoToken(token);
    if (id === anterior) return;
    gravarAtivo(contaId, uid, id, token);
    gravarDesligado(contaId, anterior);
  } catch (erro) {
    console.error("Não deu para renovar o aviso", erro);
  }
}
