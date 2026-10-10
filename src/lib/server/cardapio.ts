import { timingSafeEqual } from "node:crypto";
import {
  acompanhamentoDoPedido,
  type Acompanhamento,
} from "@/lib/domain/acompanhamento";
import { paraSituar, permite, situacaoDaConta } from "@/lib/domain/assinatura";
import {
  entraNoCardapio,
  LIMITE_DO_CARDAPIO,
  limitadasComContagem,
  montarCardapio,
  restamNoPote,
  tipoDaFoto,
  type Cardapio,
} from "@/lib/domain/cardapio";
import { temEscolhas } from "@/lib/domain/custoFicha";
import {
  competenciaDeISO,
  competenciaVizinha,
  hojeEmBrasilia,
} from "@/lib/domain/datas";
import { telefoneParaWhatsApp } from "@/lib/domain/whatsapp";
import {
  caminhos,
  type ConfiguracaoGeral,
  type Conta,
  type DataISO,
  type FichaTecnica,
  type Fornada,
  type Pedido,
  type ResumoMensal,
  type VitrineDoCardapio,
} from "@/lib/types";
import { adminDb, credencialDisponivel } from "./firebaseAdmin";

/**
 * As leituras do cardápio público (spec 031, `DECISOES.md#d158`): a página, o
 * pedido e a foto, e o pedido que a cliente acompanha (spec 117, `#d320`). Sem
 * login: quem decide o que sai é `montarCardapio`, `entraNoCardapio` e
 * `acompanhamentoDoPedido`, e nada daqui escreve.
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

/**
 * O que vem em `/c/{endereco}` vira `contaId` (spec 116, `#d319`):
 * `apelidos/{endereco}` primeiro, arquivado ou não; sem ele, o endereço é o
 * próprio `contaId`, como antes da 116. Uma leitura a mais por página, que o
 * `revalidate` segura. O apelido é só a porta: o resto continua pelo id.
 */
async function contaDoEndereco(endereco: string): Promise<string | null> {
  if (!credencialDisponivel() || !ID.test(endereco)) return null;
  const snap = await adminDb().doc(caminhos.apelido(endereco)).get();
  return (snap.get("contaId") as string | undefined) ?? endereco;
}

/**
 * O cardápio pronto para a página, com o `contaId` que as rotas da foto, da
 * vitrine e do pedido usam e o apelido atual, para a página redirecionar o
 * endereço velho. `null` para qualquer "não está aberto".
 */
export async function lerCardapio(endereco: string): Promise<{
  contaId: string;
  apelido?: string;
  cardapio: Cardapio;
} | null> {
  const contaId = await contaDoEndereco(endereco);
  if (!contaId) return null;
  const lido = await lerContaDoCardapio(contaId);
  if (!lido) return null;
  // A vitrine é lida aqui e não em `lerContaDoCardapio`: o pedido não precisa
  // das imagens, e elas são o documento mais pesado da conta (`#d166`).
  const hojeISO = hojeEmBrasilia(new Date());
  const [restam, vitrine, vendidos] = await Promise.all([
    lerRestam(contaId, lido, hojeISO),
    lerVitrine(contaId),
    lerVendidos(contaId, hojeISO),
  ]);
  const cardapio = montarCardapio({
    ...lido,
    restam,
    vitrine,
    vendidos,
    agoraMs: Date.now(),
  });
  return cardapio && { contaId, apelido: lido.conta.apelido, cardapio };
}

/**
 * Os mais pedidos (`#d316`): os agregados deste mês e do anterior, por id, e
 * só `produtos[id].quantidade` sai daqui. Mês sem documento conta zero.
 */
async function lerVendidos(
  contaId: string,
  hojeISO: DataISO,
): Promise<Map<string, number>[]> {
  const atual = competenciaDeISO(hojeISO);
  const db = adminDb();
  const snaps = await db.getAll(
    db.doc(caminhos.resumoMensal(contaId, atual)),
    db.doc(caminhos.resumoMensal(contaId, competenciaVizinha(atual, -1))),
  );
  return snaps.map(
    (snap) =>
      new Map(
        Object.entries(
          (snap.data() as Pick<ResumoMensal, "produtos"> | undefined)
            ?.produtos ?? {},
        ).map(([id, produto]) => [id, produto.quantidade]),
      ),
  );
}

async function lerVitrine(contaId: string): Promise<VitrineDoCardapio | null> {
  const snap = await adminDb().doc(caminhos.vitrine(contaId)).get();
  return snap.exists ? (snap.data() as VitrineDoCardapio) : null;
}

/**
 * Quantas restam dos limitados (`#d164`). Sem limitado com contagem que vale,
 * nenhuma leitura. Com, duas consultas de intervalo em campo único desde a
 * contagem mais antiga, sem índice composto; o resto filtra em memória.
 */
export async function lerRestam(
  contaId: string,
  lido: { configuracao: ConfiguracaoGeral | null; fichas: FichaTecnica[] },
  hojeISO: DataISO,
): Promise<Map<string, number>> {
  const limitadas = limitadasComContagem(
    lido.fichas,
    lido.configuracao?.cardapio,
    hojeISO,
  );
  if (limitadas.length === 0) return new Map();

  const desde = limitadas
    .map((ficha) => ficha.estoqueProntoContadoEmISO!)
    .sort()[0]!;
  const db = adminDb();
  const [fornadas, pedidos] = await Promise.all([
    db
      .collection(caminhos.fornadas(contaId))
      .where("dataISO", ">", desde)
      .get(),
    db
      .collection(caminhos.pedidos(contaId))
      .where("dataEntregaISO", ">", desde)
      .get(),
  ]);

  return restamNoPote({
    limitadas,
    // Os kits que a página conhece: os da lista (`ponytail:` em `restamNoPote`).
    kits: lido.fichas.filter((ficha) => ficha.tipo === "KIT"),
    fornadas: fornadas.docs.map((doc) => doc.data() as Fornada),
    pedidos: pedidos.docs.map((doc) => doc.data() as Pedido),
    hojeISO,
  });
}

/**
 * O que `montarCardapio` recebe, cru: a página monta com isso, e o handler do
 * pedido também, porque precisa das fichas inteiras para o preço e o custo.
 * `null` para conta que não existe ou id que não é id.
 */
export async function lerContaDoCardapio(contaId: string): Promise<{
  conta: Conta;
  configuracao: ConfiguracaoGeral | null;
  fichas: FichaTecnica[];
  opcoes: FichaTecnica[];
} | null> {
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

  const colecao = db.collection(caminhos.fichas(contaId));
  const fichasSnap = ids.length
    ? await db.getAll(...ids.map((id) => colecao.doc(id)))
    : [];
  const fichas = fichasSnap
    .filter((snap) => snap.exists)
    .map((snap) => ({ id: snap.id, ...snap.data() }) as FichaTecnica);

  // As opções dos combos à escolha (`#d163`): uma igualdade por categoria,
  // sem índice; `montarCardapio` filtra as que servem.
  const categorias = new Set(
    fichas
      .filter((ficha) => !ficha.arquivado && temEscolhas(ficha))
      .flatMap((ficha) => (ficha.escolhas ?? []).map((e) => e.categoria)),
  );
  const opcoes = (
    await Promise.all(
      [...categorias].map((categoria) =>
        colecao.where("categoria", "==", categoria).get(),
      ),
    )
  ).flatMap((consulta) =>
    consulta.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FichaTecnica),
  );

  return {
    conta: { id: contaId, ...contaSnap.data() } as Conta,
    configuracao,
    fichas,
    opcoes,
  };
}

/**
 * O pedido que a cliente acompanha (spec 117, `#d320`): o pedido, a conta e a
 * configuração, e só sai o que `acompanhamentoDoPedido` deixa passar. Chave
 * errada, pedido arquivado, conta encerrada ou sem o cardápio no pacote: `null`,
 * o mesmo não encontrado, que não diz se o pedido existe.
 */
export async function lerAcompanhamento(
  endereco: string,
  pedidoId: string,
  chave: string,
): Promise<Acompanhamento | null> {
  const contaId = await contaDoEndereco(endereco);
  if (!contaId || !ID.test(pedidoId) || !ID.test(chave)) return null;

  const db = adminDb();
  const [contaSnap, configuracaoSnap, pedidoSnap] = await db.getAll(
    db.doc(caminhos.conta(contaId)),
    db.doc(caminhos.configuracaoGeral(contaId)),
    db.collection(caminhos.pedidos(contaId)).doc(pedidoId),
  );
  if (!contaSnap?.exists || !pedidoSnap?.exists) return null;

  const pedido = pedidoSnap.data() as Pedido;
  const gravada = Buffer.from(pedido.chavePublica ?? "");
  const dada = Buffer.from(chave);
  if (
    pedido.arquivado ||
    gravada.length !== dada.length ||
    !timingSafeEqual(gravada, dada)
  ) {
    return null;
  }

  const conta = contaSnap.data() as Conta;
  if (conta.status === "ENCERRADA") return null;
  if (!permite(situacaoDaConta(paraSituar(conta), Date.now()), "cardapio")) {
    return null;
  }

  const configuracao = configuracaoSnap?.data() as
    ConfiguracaoGeral | undefined;
  const whatsapp = telefoneParaWhatsApp(configuracao?.contato?.telefone);
  return acompanhamentoDoPedido(
    pedido,
    {
      nome: conta.nome,
      quem: conta.proprietaria.trim().split(/\s+/)[0] ?? "",
      ...(whatsapp ? { whatsapp } : {}),
    },
    configuracao?.formasPagamento ?? [],
    hojeEmBrasilia(new Date()),
  );
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

  if (!entraNoCardapio(ficha)) return null;
  return bytesDe(ficha.fotoUrl);
}

/** A capa ou o logo do cardápio aberto, ou `null` (404). Como a foto (`#d162`). */
export async function lerImagemDaVitrine(
  contaId: string,
  qual: "capa" | "logo",
): Promise<{ tipo: string; bytes: Buffer } | null> {
  if (!credencialDisponivel() || !ID.test(contaId)) return null;

  const db = adminDb();
  const [configuracaoSnap, vitrine] = await Promise.all([
    db.doc(caminhos.configuracaoGeral(contaId)).get(),
    lerVitrine(contaId),
  ]);
  const configuracao = configuracaoSnap.data() as ConfiguracaoGeral | undefined;
  if (!configuracao?.cardapio?.aberto) return null;
  return bytesDe(vitrine?.[qual]);
}

function bytesDe(
  dataUrl: string | undefined,
): { tipo: string; bytes: Buffer } | null {
  const tipo = tipoDaFoto(dataUrl);
  if (!tipo) return null;
  const base64 = dataUrl!.slice(dataUrl!.indexOf(",") + 1);
  return { tipo, bytes: Buffer.from(base64, "base64") };
}
