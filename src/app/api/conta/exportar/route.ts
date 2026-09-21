import { NextResponse } from "next/server";
import {
  FORMATO_EXPORTACAO,
  nomeDoArquivoDeExportacao,
  paraExportavel,
  type FalhaMeusDados,
} from "@/lib/domain/meusDados";
import {
  abreAConta,
  adminDb,
  conferirToken,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";
import { caminhos, type Conta } from "@/lib/types";

/**
 * Baixa a conta inteira: o documento e todas as subcoleções, transmitido por
 * coleção (`DECISOES.md#d149`). Sai do servidor, e não do cache do cliente,
 * porque offline o cliente devolveria o que está no IndexedDB sem avisar.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function falha(codigo: FalhaMeusDados, status: number) {
  return NextResponse.json({ erro: codigo }, { status });
}

export async function GET(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const contaId = new URL(requisicao.url).searchParams.get("contaId") ?? "";
  if (!abreAConta(quem, contaId)) return falha("fora-de-forma", 400);

  const documento = adminDb().doc(caminhos.conta(contaId));
  const conta = (await documento.get()).data() as Conta | undefined;
  if (!conta) return falha("fora-de-forma", 400);

  const agora = new Date();
  const codificar = new TextEncoder();
  const fluxo = new ReadableStream({
    async start(controle) {
      const escrever = (texto: string) =>
        controle.enqueue(codificar.encode(texto));
      try {
        escrever(
          `{"formato":${JSON.stringify(FORMATO_EXPORTACAO)},` +
            `"exportadoEm":${JSON.stringify(agora.toISOString())},` +
            `"conta":${JSON.stringify(paraExportavel({ ...conta, id: contaId }))},` +
            `"colecoes":{`,
        );
        const colecoes = await documento.listCollections();
        for (const [indice, colecao] of colecoes.entries()) {
          const docs = (await colecao.get()).docs.map((d) => ({
            ...d.data(),
            id: d.id,
          }));
          escrever(
            `${indice ? "," : ""}${JSON.stringify(colecao.id)}:` +
              JSON.stringify(paraExportavel(docs)),
          );
        }
        escrever("}}");
        controle.close();
      } catch (erro) {
        // O `fetch` do cliente rejeita: nenhum arquivo pela metade chega ao disco.
        controle.error(erro);
      }
    },
  });

  return new NextResponse(fluxo, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${nomeDoArquivoDeExportacao(
        conta.nome,
        agora.toISOString().slice(0, 10),
      )}"`,
    },
  });
}
