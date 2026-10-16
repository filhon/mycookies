import { randomUUID } from "node:crypto";
import { after, NextResponse } from "next/server";
import {
  Timestamp,
  type DocumentReference,
  type Transaction,
} from "firebase-admin/firestore";
import {
  esquemaCadastro,
  fimDoTeste,
  nomeDoNegocio,
  type Cadastro,
  type FalhaCadastro,
} from "@/lib/domain/cadastro";
import { CONVITES_POR_FUNDADORA, lerCodigo } from "@/lib/domain/convite";
import { hojeEmBrasilia } from "@/lib/domain/datas";
import { VERSAO_DO_ACEITE } from "@/lib/domain/textoLegal";
import { boasVindas } from "@/lib/email/pecas";
import { comoEstadoDoBeta, lerBeta } from "@/lib/server/beta";
import { enviarEmail } from "@/lib/server/email";
import {
  adminAuth,
  adminDb,
  conferirToken,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";
import {
  caminhos,
  VERSAO_SCHEMA,
  type Convite,
  type EstadoDoBeta,
  type PapelNaConta,
} from "@/lib/types";

/**
 * O handler que `DECISOES.md#d16` prometeu: `scripts/conceder-acesso.mjs` na
 * forma de rota. O corpo é o do script, copiado e não importado — o script roda
 * com `node` fora do app e não resolve `@/`. Se mudar aqui, muda lá.
 *
 * Para o `uid` do token, **garante** que existe uma conta e uma claim, em vez
 * de criar (`#d141`): o login nasce no aparelho antes deste POST, e o POST
 * pode cair no meio. Toda volta bate na mesma rota, e a rota faz só o que
 * faltou. Duas chamadas produzem uma conta; a resposta é sempre `{ contaId }`.
 *
 * Sem `abreAConta`: é a única rota em que quem chama, por definição, ainda não
 * abre conta nenhuma. O `uid` verificado é a autorização inteira, e o que ele
 * autoriza é a própria conta.
 *
 * Desde a spec 028, a mesma `setCustomUserClaims` também escreve
 * `acessoAte[contaId] = trialAte` (`DECISOES.md#d144`): é o relógio que
 * `firestore.rules` lê para recusar escrita de conta vencida.
 *
 * Desde a spec 181, na fase `BETA`, a conta só nasce trocando um convite de
 * fundadora pela vaga (`trocarConvite`). O script não passa por aqui: é a mão
 * de quem conduz o projeto, e não conta vaga sozinho.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quem se cadastra é dona. A ajudante entra por `/api/conta/membros`. */
const PAPEL: PapelNaConta = "DONA";

function falha(codigo: FalhaCadastro, status: number) {
  return NextResponse.json({ erro: codigo }, { status });
}

async function comoJson(requisicao: Request): Promise<unknown> {
  try {
    return await requisicao.json();
  } catch {
    // Vira falha de forma logo adiante.
    return null;
  }
}

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const corpo = esquemaCadastro.safeParse(await comoJson(requisicao));
  if (!corpo.success) return falha("fora-de-forma", 400);

  try {
    const contaId = await garantirConta(quem.uid, corpo.data);
    return NextResponse.json({ contaId });
  } catch (erro) {
    if (erro instanceof Recusa) return falha(erro.codigo, 403);
    throw erro;
  }
}

/** O portão do beta disse não; nenhuma conta nasceu (spec 181). */
class Recusa extends Error {
  constructor(readonly codigo: FalhaCadastro) {
    super(codigo);
  }
}

async function garantirConta(uid: string, cadastro: Cadastro): Promise<string> {
  const auth = adminAuth();

  // 1. Que conta é a dela? Do servidor, e não do token: o token que ela carrega
  //    pode ter sido cunhado antes da claim.
  const usuario = await auth.getUser(uid);
  const anteriores = (usuario.customClaims?.contas ?? {}) as Record<
    string,
    string
  >;
  // Sem hífens: minúsculas e números, o que `conceder-acesso.mjs` já aceita.
  const contaId = Object.keys(anteriores)[0] ?? randomUUID().replace(/-/g, "");

  // 2. O documento existe? Antes da claim, na ordem do script: a claim é o que
  //    põe ela dentro do app, e só pode existir quando o documento já existe.
  const referencia = adminDb().doc(caminhos.conta(contaId));
  const existente = await referencia.get();
  let trialAte: Timestamp;
  if (!existente.exists) {
    const agora = Timestamp.now();
    trialAte = Timestamp.fromDate(fimDoTeste(agora.toDate()));
    const documento = {
      nome: nomeDoNegocio(cadastro),
      proprietaria: cadastro.nome,
      criadaEm: agora,
      plano: "TRIAL",
      status: "ATIVA",
      trialAte,
      termosAceitosEm: agora,
      termosVersao: VERSAO_DO_ACEITE,
      ...(cadastro.origem && { origem: cadastro.origem }),
      v: VERSAO_SCHEMA,
    };
    // O portão do beta (spec 181): só aqui, onde a conta ainda não existe, e
    // por isso repetir o POST nunca gasta outro convite nem outra vaga.
    const publico = (await lerBeta()).fase === "PUBLICO";
    if (publico && !cadastro.convite) {
      await referencia.set(documento);
    } else {
      await trocarConvite(referencia, documento, cadastro, agora, publico);
    }
    // Só quando a conta nasce, e depois da resposta: o cadastro não espera o
    // e-mail (spec 044, `#d202`). A chave segura a volta que repete o POST.
    const para = usuario.email;
    if (para) {
      const peca = boasVindas({
        nome: cadastro.nome,
        email: para,
        acabaEmISO: hojeEmBrasilia(trialAte.toDate()),
        origem: cadastro.origem,
      });
      after(() => enviarEmail({ para, peca, chave: `boas-vindas/${contaId}` }));
    }
  } else {
    trialAte = existente.get("trialAte") as Timestamp;
  }

  // 3. A claim aponta? Preservando o que já havia, como o script — e junto
  //    dela, `acessoAte[contaId]` com o `trialAte` do documento, nunca
  //    recalculado, para que a claim e o documento nunca discordem por um
  //    segundo de diferença (`#d144`, `#d145`).
  if (anteriores[contaId] == null) {
    await auth.setCustomUserClaims(uid, {
      ...usuario.customClaims,
      contas: { ...anteriores, [contaId]: PAPEL },
      acessoAte: {
        ...(usuario.customClaims?.acessoAte as
          Record<string, number> | undefined),
        [contaId]: trialAte.toMillis(),
      },
    });
  }

  return contaId;
}

/**
 * O convite vira a vaga, numa transação do Admin SDK (spec 181). A proibição
 * de `runTransaction` do `CLAUDE.md` é do cliente offline; o cadastro já exige
 * rede, e sem a transação dois cadastros com o mesmo convite, ou na última
 * vaga, abririam duas contas. A consulta por grupo de coleção dentro dela
 * trava os documentos lidos como um `get` comum.
 *
 * Recusa antes de escrever qualquer coisa: o convite que não existe, o
 * cancelado e o de conta encerrada dão a mesma resposta, `convite-invalido`.
 *
 * Depois do lançamento (`publico`, spec 186) o convite não é mais porta: o
 * que vale grava `origem: "convite"` e `beta.convidadaPor`, sem vaga nem cota,
 * e é marcado `USADO`; o que não vale, ou o teto, só não conta, e a conta nasce
 * como qualquer outra (`#d411`).
 */
async function trocarConvite(
  conta: DocumentReference,
  documento: Record<string, unknown>,
  cadastro: Cadastro,
  agora: Timestamp,
  publico: boolean,
): Promise<void> {
  const codigo = cadastro.convite && lerCodigo(cadastro.convite);
  if (!codigo) {
    if (publico) return void (await conta.set(documento));
    throw new Recusa(cadastro.convite ? "convite-invalido" : "sem-convite");
  }

  const db = adminDb();
  const plataforma = db.doc(caminhos.plataformaBeta);
  await db.runTransaction(async (tx) => {
    try {
      await trocarNaTransacao(tx, codigo);
    } catch (erro) {
      if (!(publico && erro instanceof Recusa)) throw erro;
      tx.create(conta, documento);
    }
  });

  async function trocarNaTransacao(tx: Transaction, codigo: string) {
    const estado = comoEstadoDoBeta(
      (await tx.get(plataforma)).data() as Partial<EstadoDoBeta> | undefined,
    );
    const achados = await tx.get(
      db
        .collectionGroup(caminhos.grupoConvites)
        .where("codigo", "==", codigo)
        .limit(1),
    );
    const convite = achados.docs[0];
    const status = convite?.get("status") as Convite["status"] | undefined;
    // `contas/{dona}/convites/{codigo}`: o avô do convite é a conta dela.
    const dona = convite?.ref.parent.parent;
    if (!convite || !dona || (status !== "ABERTO" && status !== "USADO")) {
      throw new Recusa("convite-invalido");
    }
    if ((await tx.get(dona)).get("status") === "ENCERRADA") {
      throw new Recusa("convite-invalido");
    }
    if (status === "USADO") throw new Recusa("convite-usado");
    if (!publico && estado.ocupadas >= estado.vagas) {
      throw new Recusa("sem-vaga");
    }

    tx.create(conta, {
      ...documento,
      // O rascunho da calculadora ganha (`#d317`): a biblioteca e a
      // boas-vindas dependem dele.
      origem: cadastro.origem === "calculadora" ? "calculadora" : "convite",
      beta: publico
        ? { convidadaPor: dona.id }
        : {
            fundadora: estado.ocupadas + 1,
            convites: CONVITES_POR_FUNDADORA,
            convidadaPor: dona.id,
          },
    });
    tx.update(convite.ref, {
      status: "USADO",
      usadoEm: agora,
      usadoPor: conta.id,
      nomeDaConvidada: cadastro.nome,
      v: VERSAO_SCHEMA,
    });
    if (!publico) {
      tx.set(
        plataforma,
        { ...estado, ocupadas: estado.ocupadas + 1, v: VERSAO_SCHEMA },
        { merge: true },
      );
    }
  }
}
