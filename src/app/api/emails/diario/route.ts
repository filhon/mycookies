import { NextResponse } from "next/server";
import type { DocumentData, Timestamp } from "firebase-admin/firestore";
import { avisosDoDia, diaEmQueBateu, type Aviso } from "@/lib/domain/avisos";
import { custosDeHoje, type MaterialDeHoje } from "@/lib/domain/custoFicha";
import {
  competenciaDeISO,
  competenciaVizinha,
  diaDeISO,
  diasEntre,
  diaVizinho,
  hojeEmBrasilia,
} from "@/lib/domain/datas";
import { calcularPrecoSugerido } from "@/lib/domain/precificacao";
import {
  mesFechado,
  metaBatida,
  testeAcabando,
  type DadosTesteAcabando,
  type Peca,
} from "@/lib/email/pecas";
import { enviarEmail } from "@/lib/server/email";
import {
  adminAuth,
  adminDb,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";
import { lerPrecos, stripeDisponivel } from "@/lib/server/stripe";
import {
  caminhos,
  type CompetenciaMensal,
  type Conta,
  type DataISO,
  type FichaTecnica,
  type ResumoMensal,
} from "@/lib/types";

/**
 * O cron diário dos três avisos (spec 044-B, `DECISOES.md#d205` a `#d207`),
 * chamado pela Vercel às 9h de São Paulo (`vercel.json`).
 *
 * `?hoje=AAAA-MM-DD` troca o dia; `?simular=1` devolve o que sairia, sem
 * mandar; `?so={contaId}` roda uma conta só, e é obrigatório fora de produção:
 * o projeto do Firebase é um só, e uma prévia sem ele mandaria e-mail a todas
 * as contas de verdade.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Dados = DocumentData;

export async function GET(requisicao: Request) {
  const segredo = process.env.CRON_SECRET?.trim();
  if (
    !segredo ||
    requisicao.headers.get("authorization") !== `Bearer ${segredo}`
  ) {
    return new NextResponse(null, { status: 401 });
  }
  if (!credencialDisponivel()) {
    return NextResponse.json({ erro: "sem-configuracao" }, { status: 500 });
  }

  const url = new URL(requisicao.url);
  const so = url.searchParams.get("so");
  if (process.env.VERCEL_ENV !== "production" && !so) {
    return NextResponse.json({ erro: "falta ?so=" }, { status: 400 });
  }
  const hoje = url.searchParams.get("hoje") ?? hojeEmBrasilia(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hoje)) {
    return NextResponse.json({ erro: "hoje=AAAA-MM-DD" }, { status: 400 });
  }
  const simular = url.searchParams.get("simular") === "1";

  const donas = await donaDeCadaConta();
  const db = adminDb();
  // ponytail: lê toda conta todo dia, uma a uma. Com centenas de contas, uma
  // consulta por `trialAte` e outra pelos agregados do mês (spec 044).
  const contas = so
    ? [await db.doc(caminhos.conta(so)).get()]
    : (await db.collection("contas").get()).docs;

  let precos: Promise<DadosTesteAcabando["precos"]> | undefined;
  const lerPrecosUmaVez = () =>
    (precos ??= stripeDisponivel()
      ? lerPrecos().catch(() => null)
      : Promise.resolve(null));

  const total = { enviados: 0, repetidos: 0, falhas: 0 };
  const simulado: { contaId: string; aviso: Aviso; assunto: string }[] = [];

  for (const snap of contas) {
    const conta = snap.data();
    const para = donas.get(snap.id);
    if (!conta || !para) continue;
    try {
      for (const { aviso, chave, peca } of await pecasDoDia(
        snap.id,
        conta,
        hoje,
        lerPrecosUmaVez,
      )) {
        if (simular) {
          simulado.push({ contaId: snap.id, aviso, assunto: peca.assunto });
          continue;
        }
        const resultado = await enviarEmail({ para, peca, chave });
        if (resultado === "enviado") total.enviados++;
        else if (resultado === "repetido") total.repetidos++;
        else {
          total.falhas++;
          console.warn(`[diario] ${aviso} não saiu para ${snap.id}.`);
        }
      }
    } catch (erro) {
      total.falhas++;
      console.warn(`[diario] a conta ${snap.id} falhou:`, erro);
    }
  }

  console.log(`[diario] ${hoje}`, total);
  return NextResponse.json(simular ? { hoje, simulado } : total);
}

/** contaId → e-mail da dona, pela claim, como `scripts/metricas.mjs` (`#d206`). */
async function donaDeCadaConta(): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  let proximo: string | undefined;
  do {
    const pagina = await adminAuth().listUsers(1000, proximo);
    for (const usuario of pagina.users) {
      const contas = usuario.customClaims?.contas as
        Record<string, string> | undefined;
      if (!usuario.email || !contas) continue;
      for (const [contaId, papel] of Object.entries(contas)) {
        if (papel === "DONA" && !mapa.has(contaId)) {
          mapa.set(contaId, usuario.email);
        }
      }
    }
    proximo = pagina.pageToken;
  } while (proximo);
  return mapa;
}

async function lerResumo(
  contaId: string,
  competencia: CompetenciaMensal,
): Promise<ResumoMensal | undefined> {
  const snap = await adminDb()
    .doc(caminhos.resumoMensal(contaId, competencia))
    .get();
  return snap.data() as ResumoMensal | undefined;
}

async function pecasDoDia(
  contaId: string,
  conta: Dados,
  hoje: DataISO,
  lerPrecos: () => Promise<DadosTesteAcabando["precos"]>,
): Promise<{ aviso: Aviso; chave: string; peca: Peca }[]> {
  const ontem = diaVizinho(hoje, -1);
  const mesDeOntem = competenciaDeISO(ontem);
  const mesAnterior = competenciaVizinha(competenciaDeISO(hoje), -1);
  const diaDois = diaDeISO(hoje) === "02";

  const [resumoDeOntem, resumoDoMesAnterior] = await Promise.all([
    lerResumo(contaId, mesDeOntem),
    diaDois ? lerResumo(contaId, mesAnterior) : undefined,
  ]);
  const trialAte = (conta.trialAte as Timestamp | undefined)?.toDate();

  const avisos = avisosDoDia({
    conta: {
      plano: conta.plano as Conta["plano"],
      status: conta.status as Conta["status"],
      trialAte,
      avisosPorEmail: conta.avisosPorEmail as boolean | undefined,
    },
    hoje,
    resumoDeOntem,
    resumoDoMesAnterior,
  });

  const pecas = [];
  for (const aviso of avisos) {
    if (aviso === "teste-acabando") {
      const acabaEmISO = hojeEmBrasilia(trialAte!);
      pecas.push({
        aviso,
        chave: `${aviso}/${contaId}/${acabaEmISO}`,
        peca: testeAcabando(
          await dadosDoTeste(contaId, conta, hoje, acabaEmISO, lerPrecos),
        ),
      });
    } else if (aviso === "meta-batida") {
      const r = resumoDeOntem!;
      pecas.push({
        aviso,
        chave: `${aviso}/${contaId}/${mesDeOntem}`,
        peca: metaBatida({
          competencia: mesDeOntem,
          entrou: r.entradas,
          alvo: r.meta!.faturamentoAlvo,
          diaQueBateu: Number(diaDeISO(ontem)),
        }),
      });
    } else {
      const r = resumoDoMesAnterior!;
      const maisVendido = Object.values(r.produtos ?? {}).sort(
        (a, b) => b.quantidade - a.quantidade,
      )[0];
      pecas.push({
        aviso,
        chave: `${aviso}/${contaId}/${mesAnterior}`,
        peca: mesFechado({
          competencia: mesAnterior,
          entrou: r.entradas,
          // A maquininha entra no que saiu: o que sobrou é o `lucro` de
          // `/financeiro` (`#d209`).
          saiu: r.saidas + (r.custoTaxasPagamento ?? 0),
          pedidos: r.qtdPedidos,
          maisVendido: maisVendido && {
            nome: maisVendido.nome,
            unidades: maisVendido.quantidade,
          },
          meta: r.meta && {
            alvo: r.meta.faturamentoAlvo,
            diaQueBateu: diaEmQueBateu(r.porDia ?? {}, r.meta.faturamentoAlvo),
          },
          // No dia 2, o mês de ontem é o mês novo.
          metaDoProximo: !!resumoDeOntem?.meta,
        }),
      });
    }
  }
  return pecas;
}

/** Os números do cartão da 024, lidos do servidor. */
async function dadosDoTeste(
  contaId: string,
  conta: Dados,
  hoje: DataISO,
  acabaEmISO: DataISO,
  lerPrecos: () => Promise<DadosTesteAcabando["precos"]>,
): Promise<DadosTesteAcabando> {
  const db = adminDb();
  const criadaEmISO = hojeEmBrasilia((conta.criadaEm as Timestamp).toDate());

  const meses: CompetenciaMensal[] = [];
  for (
    let mes = competenciaDeISO(criadaEmISO);
    mes <= competenciaDeISO(hoje);
    mes = competenciaVizinha(mes, 1)
  ) {
    meses.push(mes);
  }

  const [fichasSnap, insumosSnap, pedidosSnap, resumos, precos] =
    await Promise.all([
      db
        .collection(caminhos.fichas(contaId))
        .where("arquivado", "==", false)
        .get(),
      db
        .collection(caminhos.insumos(contaId))
        .where("arquivado", "==", false)
        .get(),
      db
        .collection(caminhos.pedidos(contaId))
        .where("arquivado", "==", false)
        .count()
        .get(),
      Promise.all(meses.map((mes) => lerResumo(contaId, mes))),
      lerPrecos(),
    ]);

  const fichas = fichasSnap.docs.map(
    (d) => ({ ...d.data(), id: d.id }) as FichaTecnica,
  );
  const materiais = insumosSnap.docs.map(
    (d) => ({ ...d.data(), id: d.id }) as MaterialDeHoje,
  );
  const hojes = custosDeHoje(fichas, materiais);

  const comPreco = fichas.filter((f) => f.precificacao.precoVenda > 0);
  const noVermelho = comPreco
    .map((ficha) => ({ ficha, hoje: hojes.get(ficha.id)! }))
    .filter(({ hoje }) => hoje.sobra < 0)
    .sort((a, b) => a.hoje.sobra - b.hoje.sobra);

  const pior = noVermelho[0];
  const minimo =
    pior &&
    calcularPrecoSugerido(pior.hoje.custoUnitario, {
      metodo: "MARGEM",
      markup: 0,
      margemDesejada: 0,
      taxaCartaoConsiderada: pior.ficha.precificacao.taxaCartaoConsiderada,
      outrasTaxas: pior.ficha.precificacao.outrasTaxas,
      arredondamento: "NENHUM",
    });

  return {
    nome: conta.proprietaria,
    negocio: conta.nome,
    acabaEmISO,
    faltam: diasEntre(hoje, acabaEmISO),
    diasDeUso: diasEntre(criadaEmISO, hoje),
    produtos: comPreco.length,
    noVermelho: noVermelho.length,
    pior:
      pior && minimo?.ok
        ? {
            nome: pior.ficha.nome,
            perdaPorUnidade: -pior.hoje.sobra,
            minimo: minimo.precoSugerido,
          }
        : undefined,
    pedidos: pedidosSnap.data().count,
    entrou: resumos.reduce((soma, r) => soma + (r?.entradas ?? 0), 0),
    precos,
  };
}
