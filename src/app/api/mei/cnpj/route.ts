import { NextResponse } from "next/server";
import { meiDoCnpj } from "@/lib/domain/mei";
import { cnpjValido, digitosDoCnpj } from "@/lib/domain/notaFiscal";
import { perguntarCnpj } from "@/lib/server/cnpj";
import {
  conferirToken,
  credencialDisponivel,
  ehDona,
} from "@/lib/server/firebaseAdmin";

/**
 * O CNPJ do MEI dela preenche o resto da folha (`DECISOES.md#d359`): nome
 * empresarial, abertura e a atividade sugerida pelo CNAE, e nada além
 * (`meiDoCnpj`). Só a dona: o MEI mora em `fiscal`, que é dinheiro.
 *
 * Não escreve no Firestore, como `/api/nota`: quem grava é a tela, offline e
 * com as regras valendo. Sem resposta da consulta, `{}`, e a tela deixa os
 * campos para ela, sem mensagem de erro.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function falha(erro: string, status: number) {
  return NextResponse.json({ erro }, { status });
}

export async function GET(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const parametros = new URL(requisicao.url).searchParams;
  if (!ehDona(quem, parametros.get("contaId") ?? "")) {
    return falha("sem-acesso", 401);
  }

  const cnpj = digitosDoCnpj(parametros.get("cnpj") ?? "");
  if (!cnpjValido(cnpj)) return falha("fora-de-forma", 400);

  return NextResponse.json(meiDoCnpj(await perguntarCnpj(cnpj)));
}
