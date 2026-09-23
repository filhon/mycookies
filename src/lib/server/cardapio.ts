import {
  entraNoCardapio,
  LIMITE_DO_CARDAPIO,
  montarCardapio,
  tipoDaFoto,
  type Cardapio,
} from "@/lib/domain/cardapio";
import {
  caminhos,
  type ConfiguracaoGeral,
  type Conta,
  type FichaTecnica,
} from "@/lib/types";
import { adminDb, credencialDisponivel } from "./firebaseAdmin";

/**
 * As duas leituras do cardápio público (spec 031, `DECISOES.md#d158`): a
 * página e a foto. Sem login: quem decide o que sai é `montarCardapio` e
 * `entraNoCardapio`, e nada daqui escreve.
 *
 * O `Timestamp` do Admin SDK tem o mesmo `toMillis()` do cliente, que é tudo o
 * que o domínio chama; por isso os `as` abaixo.
 */

/**
 * O id vem da URL. Um `/` ou um `..` viraria outro caminho no `db.doc`; os ids
 * do projeto são `mycookies`, UUID sem traço (027) e o id automático do
 * Firestore, todos dentro disto.
 */
const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** O cardápio pronto para a página, ou `null` para qualquer "não está aberto". */
export async function lerCardapio(contaId: string): Promise<Cardapio | null> {
  if (!credencialDisponivel() || !ID.test(contaId)) return null;

  const db = adminDb();
  const [contaSnap, configuracaoSnap] = await Promise.all([
    db.doc(caminhos.conta(contaId)).get(),
    db.doc(caminhos.configuracaoGeral(contaId)).get(),
  ]);
  if (!contaSnap.exists) return null;

  const configuracao = configuracaoSnap.exists
    ? (configuracaoSnap.data() as ConfiguracaoGeral)
    : null;
  const ids = (
    configuracao?.cardapio?.aberto ? configuracao.cardapio.fichaIds : []
  )
    .filter((id) => ID.test(id))
    .slice(0, LIMITE_DO_CARDAPIO);

  const fichasSnap = ids.length
    ? await db.getAll(
        ...ids.map((id) => db.collection(caminhos.fichas(contaId)).doc(id)),
      )
    : [];

  return montarCardapio({
    conta: { id: contaId, ...contaSnap.data() } as Conta,
    configuracao,
    fichas: fichasSnap
      .filter((snap) => snap.exists)
      .map((snap) => ({ id: snap.id, ...snap.data() }) as FichaTecnica),
    agoraMs: Date.now(),
  });
}

/** Os bytes da foto de um produto do cardápio aberto, ou `null` (404). */
export async function lerFotoDoCardapio(
  contaId: string,
  fichaId: string,
): Promise<{ tipo: string; bytes: Buffer } | null> {
  if (!credencialDisponivel() || !ID.test(contaId) || !ID.test(fichaId)) {
    return null;
  }

  const db = adminDb();
  const configuracao = (
    await db.doc(caminhos.configuracaoGeral(contaId)).get()
  ).data() as ConfiguracaoGeral | undefined;
  const cardapio = configuracao?.cardapio;
  if (!cardapio?.aberto || !cardapio.fichaIds.includes(fichaId)) return null;

  const snap = await db.collection(caminhos.fichas(contaId)).doc(fichaId).get();
  if (!snap.exists) return null;
  const ficha = { id: snap.id, ...snap.data() } as FichaTecnica;

  const tipo = tipoDaFoto(ficha.fotoUrl);
  if (!entraNoCardapio(ficha) || !tipo) return null;

  const base64 = ficha.fotoUrl!.slice(ficha.fotoUrl!.indexOf(",") + 1);
  return { tipo, bytes: Buffer.from(base64, "base64") };
}
