import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { UserRecord } from "firebase-admin/auth";
import {
  esquemaConvite,
  LIMITE_DE_AJUDANTES,
  type FalhaConvite,
} from "@/lib/domain/ajudante";
import { paraSituar, permite, situacaoDaConta } from "@/lib/domain/assinatura";
import {
  adminAuth,
  adminDb,
  conferirToken,
  credencialDisponivel,
  ehDona,
  tirarContaDaClaim,
} from "@/lib/server/firebaseAdmin";
import {
  caminhos,
  VERSAO_SCHEMA,
  type Conta,
  type PapelNaConta,
} from "@/lib/types";

/**
 * Convidar e tirar a ajudante (spec 030). O convite é `conceder-acesso.mjs` com
 * um `if` a mais: cria o login sem senha, e o recado de "Esqueci minha senha"
 * é da dona, pelo WhatsApp (`DECISOES.md#d119`).
 *
 * A claim é a verdade; `contas/{id}/membros/{uid}` é o espelho que a tela lista
 * e que o webhook e o encerrar percorrem, escrito só daqui (`#d155`).
 * Idempotente nos dois verbos, como `/api/conta` (`#d141`): repetir faz só o
 * que faltou.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAPEL: PapelNaConta = "AJUDANTE";

function falha(codigo: FalhaConvite, status: number) {
  return NextResponse.json({ erro: codigo }, { status });
}

async function comoJson(requisicao: Request): Promise<unknown> {
  try {
    return await requisicao.json();
  } catch {
    return null;
  }
}

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const corpo = esquemaConvite.safeParse(await comoJson(requisicao));
  if (!corpo.success) return falha("fora-de-forma", 400);
  const { contaId, email } = corpo.data;

  // 1. Ajudante não convida ajudante.
  if (!ehDona(quem, contaId)) return falha("sem-acesso", 401);

  // 2. Dois papéis na mesma conta para o mesmo login é um bug esperando.
  if (email === quem.email?.toLowerCase()) return falha("fora-de-forma", 400);

  const db = adminDb();
  const conta = (await db.doc(caminhos.conta(contaId)).get()).data() as
    Conta | undefined;
  if (!conta) return falha("fora-de-forma", 400);

  // 2b. O pacote (`#d167`): o essencial não tem ajudante. Tirar não tem portão.
  const situacao = situacaoDaConta(paraSituar(conta), Date.now());
  if (!permite(situacao, "ajudante")) return falha("sem-pacote", 403);

  // 3. O freio. Quem já é membro ativa não conta contra o próprio convite.
  const membros = await db.collection(caminhos.membros(contaId)).get();
  const outras = membros.docs.filter(
    (d) => !d.get("removidaEm") && d.get("email") !== email,
  );
  if (outras.length >= LIMITE_DE_AJUDANTES) return falha("cheio", 409);

  // 4. O login, sem senha quando não existe.
  const auth = adminAuth();
  let usuario: UserRecord;
  let criouLogin = false;
  try {
    usuario = await auth.getUserByEmail(email);
  } catch (erro) {
    if ((erro as { code?: string }).code !== "auth/user-not-found") throw erro;
    usuario = await auth.createUser({ email });
    criouLogin = true;
  }

  const referencia = db.doc(caminhos.membro(contaId, usuario.uid));
  const claims = usuario.customClaims ?? {};
  const contas = (claims.contas ?? {}) as Record<string, string>;

  // 5. Já abre esta conta: não reescreve papel nenhum — não é esta rota que
  //    rebaixa uma dona. Se é ajudante, garante o espelho (o POST anterior
  //    pode ter caído entre a claim e o documento).
  if (contas[contaId] != null) {
    if (contas[contaId] === PAPEL && !(await referencia.get()).exists) {
      await referencia.set({
        email,
        papel: PAPEL,
        convidadaEm: Timestamp.now(),
        convidadaPor: quem.uid,
        v: VERSAO_SCHEMA,
      });
    }
    return falha("ja-convidada", 409);
  }

  // 6. A claim, preservando o que não é desta conta. `acessoAte` é copiado do
  //    documento, nunca recalculado (`#d144`); sem prazo na conta, sem chave:
  //    quem a dona convida herda o prazo dela, inclusive a ausência dele.
  const prazo = conta.assinaturaAte ?? conta.trialAte;
  const acessoAte = {
    ...(claims.acessoAte as Record<string, number> | undefined),
  };
  if (prazo) acessoAte[contaId] = prazo.toMillis();
  else delete acessoAte[contaId];
  await auth.setCustomUserClaims(usuario.uid, {
    ...claims,
    contas: { ...contas, [contaId]: PAPEL },
    acessoAte,
  });

  // 7. O espelho. Reconvidar quem foi tirada é o mesmo POST.
  await referencia.set(
    {
      email,
      papel: PAPEL,
      convidadaEm: Timestamp.now(),
      convidadaPor: quem.uid,
      removidaEm: FieldValue.delete(),
      v: VERSAO_SCHEMA,
    },
    { merge: true },
  );

  return NextResponse.json({ uid: usuario.uid, criouLogin });
}

export async function DELETE(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const parametros = new URL(requisicao.url).searchParams;
  const contaId = parametros.get("contaId") ?? "";
  const uid = parametros.get("uid") ?? "";
  if (!contaId || !uid) return falha("fora-de-forma", 400);

  if (!ehDona(quem, contaId)) return falha("sem-acesso", 401);

  // 1. Só se tira quem o espelho diz que é ajudante — nunca uma dona,
  //    inclusive quem chama.
  const referencia = adminDb().doc(caminhos.membro(contaId, uid));
  const membro = await referencia.get();
  if (membro.get("papel") !== PAPEL) return falha("fora-de-forma", 400);

  // 2. A claim, antes do espelho: a claim é o que dá acesso.
  await tirarContaDaClaim(uid, contaId);

  // 3. O documento fica, com a data: "quem teve acesso, e até quando".
  if (!membro.get("removidaEm")) {
    await referencia.set(
      { removidaEm: Timestamp.now(), v: VERSAO_SCHEMA },
      { merge: true },
    );
  }

  return NextResponse.json({});
}
