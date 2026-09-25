import { randomUUID } from "node:crypto";
import { after, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  esquemaCadastro,
  fimDoTeste,
  nomeDoNegocio,
  type Cadastro,
  type FalhaCadastro,
} from "@/lib/domain/cadastro";
import { hojeEmBrasilia } from "@/lib/domain/datas";
import { boasVindas } from "@/lib/email/pecas";
import { enviarEmail } from "@/lib/server/email";
import {
  adminAuth,
  adminDb,
  conferirToken,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";
import { caminhos, VERSAO_SCHEMA, type PapelNaConta } from "@/lib/types";

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

  const contaId = await garantirConta(quem.uid, corpo.data);
  return NextResponse.json({ contaId });
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
    await referencia.set({
      nome: nomeDoNegocio(cadastro),
      proprietaria: cadastro.nome,
      criadaEm: agora,
      plano: "TRIAL",
      status: "ATIVA",
      trialAte,
      termosAceitosEm: agora,
      ...(cadastro.origem && { origem: cadastro.origem }),
      v: VERSAO_SCHEMA,
    });
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
