/**
 * Uma linha por conta, para leitura semanal durante o beta
 * (`docs/saas/ROADMAP.md`, seção 6). Só lê e imprime: nenhum agregado novo,
 * nenhuma rota, nenhum componente.
 *
 *   npm run metricas
 */
import { Timestamp } from "firebase-admin/firestore";
import Stripe from "stripe";
import { auth, db, semCredencial } from "./admin.mjs";

/** Repetido de `src/lib/domain/biblioteca.ts:14`: o script roda fora do app e
 * não importa TypeScript. */
const PREFIXO_BIBLIOTECA = "biblioteca-";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const diasEntre = (inicio, fim) =>
  Math.round((fim.getTime() - inicio.getTime()) / MS_POR_DIA);
const paraISO = (timestamp) => timestamp.toDate().toISOString().slice(0, 10);

/** contaId → o maior `lastSignInTime` entre os logins vinculados a ela. */
async function ultimoLoginPorConta() {
  const mapa = new Map();
  let proximo;
  do {
    const pagina = await auth.listUsers(1000, proximo);
    for (const usuario of pagina.users) {
      const contas = usuario.customClaims?.contas;
      const login = usuario.metadata.lastSignInTime
        ? new Date(usuario.metadata.lastSignInTime)
        : null;
      if (!contas || !login) continue;
      for (const contaId of Object.keys(contas)) {
        const atual = mapa.get(contaId);
        if (!atual || login > atual) mapa.set(contaId, login);
      }
    }
    proximo = pagina.pageToken;
  } while (proximo);
  return mapa;
}

async function linhaDaConta(contaSnap, ultimoLogin, hoje) {
  const contaId = contaSnap.id;
  const conta = contaSnap.data();
  const criada = conta.criadaEm.toDate();
  const trintaDiasAtras = Timestamp.fromMillis(
    hoje.getTime() - 30 * MS_POR_DIA,
  );

  const [materiais, produtos, pedidos30d, fichasOrdenadas] = await Promise.all([
    db
      .collection(`contas/${contaId}/insumos`)
      .where("arquivado", "==", false)
      .count()
      .get(),
    db
      .collection(`contas/${contaId}/fichas`)
      .where("arquivado", "==", false)
      .count()
      .get(),
    // Arquivado conta: foi atividade, mesmo que o pedido não tenha sobrevivido.
    db
      .collection(`contas/${contaId}/pedidos`)
      .where("criadoEm", ">=", trintaDiasAtras)
      .count()
      .get(),
    db
      .collection(`contas/${contaId}/fichas`)
      .orderBy("criadoEm")
      .select("criadoEm")
      .get(),
  ]);

  const primeiraFicha = fichasOrdenadas.docs[0] ?? null;
  const primeiraPropria =
    fichasOrdenadas.docs.find(
      (doc) => !doc.id.startsWith(PREFIXO_BIBLIOTECA),
    ) ?? null;

  const idadeDias = diasEntre(criada, hoje);
  const login30d =
    idadeDias <= 30
      ? "—"
      : ultimoLogin && diasEntre(ultimoLogin, hoje) <= 30
        ? "sim"
        : "não";

  return {
    conta: `${contaId} · ${conta.nome}`,
    criada: paraISO(conta.criadaEm),
    "último login": ultimoLogin
      ? paraISO(Timestamp.fromDate(ultimoLogin))
      : "—",
    materiais: materiais.data().count,
    produtos: produtos.data().count,
    "pedidos 30d": pedidos30d.data().count,
    "1º produto": primeiraFicha ? paraISO(primeiraFicha.get("criadoEm")) : "—",
    "1º próprio": primeiraPropria
      ? paraISO(primeiraPropria.get("criadoEm"))
      : "—",
    "dias até o 1º": primeiraPropria
      ? String(diasEntre(criada, primeiraPropria.get("criadoEm").toDate()))
      : "—",
    "login 30d": login30d,
    // Ausente = veio por outro caminho (spec 040-B, `DECISOES.md#d191`).
    origem: conta.origem ?? "—",
  };
}

/**
 * Por que saíram, nos últimos 90 dias (spec 162, `DECISOES.md#d376`): lido do
 * Stripe, nada gravado. `feedback` é a opção que ela escolheu no portal;
 * `reason` diz se foi pedido dela ou cobrança recusada. Conta quem marcou o
 * fim e ainda não desmarcou, e quem já terminou.
 */
async function motivosDoCancelamento(chave) {
  const desde = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
  const contagem = {};
  for await (const assinatura of new Stripe(chave).subscriptions.list({
    status: "all",
    limit: 100,
  })) {
    const saindo =
      assinatura.status === "canceled" ||
      assinatura.cancel_at_period_end ||
      assinatura.cancel_at != null;
    if (!saindo || (assinatura.canceled_at ?? 0) < desde) continue;
    const { reason, feedback } = assinatura.cancellation_details ?? {};
    const motivo = `${feedback ?? "sem resposta"} · ${reason ?? "—"}`;
    contagem[motivo] = (contagem[motivo] ?? 0) + 1;
  }
  return contagem;
}

try {
  const [contas, logins] = await Promise.all([
    db.collection("contas").orderBy("criadaEm").get(),
    ultimoLoginPorConta(),
  ]);

  const hoje = new Date();
  const linhas = await Promise.all(
    contas.docs.map((snap) =>
      linhaDaConta(snap, logins.get(snap.id) ?? null, hoje),
    ),
  );

  console.table(linhas);

  const chave = process.env.STRIPE_SECRET_KEY?.trim();
  if (chave) {
    const motivos = await motivosDoCancelamento(chave);
    console.log("\nCancelamentos nos últimos 90 dias (motivo · origem):");
    if (Object.keys(motivos).length === 0) console.log("nenhum");
    else console.table(motivos);
  } else {
    console.log("\nSem STRIPE_SECRET_KEY no .env.local: motivos de fora.");
  }
} catch (erro) {
  console.error("Não foi possível ler as métricas:", erro.message);

  if (semCredencial) {
    console.error(
      "\nNenhuma credencial encontrada. Preencha GOOGLE_APPLICATION_CREDENTIALS\n" +
        "no .env.local, ou rode `gcloud auth application-default login`.",
    );
  }

  process.exit(1);
}
