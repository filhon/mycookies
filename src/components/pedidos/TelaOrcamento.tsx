"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { query, where } from "firebase/firestore";
import { ArrowLeft, MessageCircle, Printer, TriangleAlert } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { classesBotao } from "@/components/ui/estilosBotao";
import { PedidoNaoEncontrado } from "./EditorPedido";
import { FolhaOrcamento } from "./FolhaOrcamento";
import { useLinkDoAcompanhamento } from "./useLinkDoAcompanhamento";
import { dataISODe, rotuloDataCompleta } from "@/lib/domain/datas";
import { montarOrcamento, situacaoDaValidade } from "@/lib/domain/orcamento";
import {
  linkDoWhatsApp,
  mensagemDoPedido,
  telefoneParaWhatsApp,
} from "@/lib/domain/whatsapp";
import {
  colFichas,
  docConfiguracao,
  docPedido,
  docVitrine,
} from "@/lib/firebase/colecoes";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import type {
  ConfiguracaoGeral,
  FichaTecnica,
  Pedido,
  VitrineDoCardapio,
} from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/** 210 mm a 96 dpi: a largura da folha sem encolher. */
const LARGURA_DA_FOLHA_PX = 794;

/**
 * A prévia da folha, e o caminho até o PDF.
 *
 * O PDF é o navegador imprimindo esta rota (`DECISOES.md#d106`): nada aqui
 * exige rede, e salvar o arquivo é ação do aparelho. A folha lê o documento
 * gravado, e não o formulário (`#d107`): não há tela de edição ao lado.
 *
 * Em tela estreita a folha encolhe para caber, por `zoom`: uma prévia com
 * rolagem horizontal mentiria sobre o que vai sair.
 */
export function TelaOrcamento({ id }: { id: string }) {
  const contaId = useContaId();
  const { conta } = useAuth();
  const [hoje] = useState(() => dataISODe(new Date()));

  // Sem `orderBy`: a ordem das linhas é a do pedido, e a ficha só entra para
  // dar a unidade (e, na 17B, a foto e a descrição). Recorte pelo arquivo.
  const consultaFichas = useMemo(
    () => query(colFichas(contaId), where("arquivado", "==", false)),
    [contaId],
  );
  const referenciaConfiguracao = useMemo(
    () => docConfiguracao(contaId),
    [contaId],
  );
  const referenciaPedido = useMemo(() => docPedido(contaId, id), [contaId, id]);
  // O logo da folha é o da vitrine (`#d356`); quem tem cardápio já o tem no cache.
  const referenciaVitrine = useMemo(() => docVitrine(contaId), [contaId]);

  const fichas = useColecao<FichaTecnica>(consultaFichas);
  const configuracao = useDocumento<ConfiguracaoGeral>(referenciaConfiguracao);
  const vitrine = useDocumento<VitrineDoCardapio>(referenciaVitrine);
  const pedido = useDocumento<Pedido>(referenciaPedido);
  const acompanhamento = useLinkDoAcompanhamento(pedido.dado);

  // `zoom` da folha pela largura do contêiner sobre os 794 px do A4, medido
  // por `ResizeObserver`. Nunca passa de 1: em tela larga a folha é do tamanho
  // do papel. É ref de função, e não `useRef` mais efeito: o contêiner só
  // existe depois do carregamento, e um efeito de montagem o veria como `null`.
  //
  // ponytail: `zoom` é propriedade de todo navegador desde 2024. Se ficar
  // borrada num aparelho, o plano B é `transform: scale` com a altura do
  // contêiner ajustada à mão.
  const [zoom, setZoom] = useState(1);
  const medirFolha = useCallback((elemento: HTMLDivElement | null) => {
    if (!elemento) return;
    const observador = new ResizeObserver((entradas) => {
      const largura = entradas[0]?.contentRect.width ?? LARGURA_DA_FOLHA_PX;
      setZoom(Math.min(1, largura / LARGURA_DA_FOLHA_PX));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  if (
    fichas.carregando ||
    configuracao.carregando ||
    vitrine.carregando ||
    pedido.carregando ||
    !conta
  ) {
    return (
      <div role="status" aria-label="Carregando" className="space-y-4 pt-4">
        <Esqueleto className="h-13 w-2/3 rounded-md" />
        <Esqueleto className="mx-auto h-105 w-full max-w-198.5 rounded-lg" />
      </div>
    );
  }

  if (!pedido.dado) return <PedidoNaoEncontrado />;

  const voltar = (
    <Link
      href={`/pedidos/${id}`}
      className={classesBotao({ variante: "secundaria", tamanho: "lg" })}
    >
      <ArrowLeft aria-hidden className="size-5" strokeWidth={1.75} />
      Voltar ao pedido
    </Link>
  );

  // Uma folha de pedido cancelado circulando é o defeito (spec 147).
  if (pedido.dado.status === "CANCELADO") {
    return (
      <div className="pt-4 lg:pt-6">
        <p className="max-w-[60ch] text-body">
          Este pedido foi cancelado. A folha não sai de pedido cancelado.
        </p>
        <div className="mt-4">{voltar}</div>
      </div>
    );
  }

  const salvo = pedido.dado;
  const orcamento = montarOrcamento({
    pedido: salvo,
    fichas: fichas.dados,
    conta,
    configuracao: configuracao.dado,
    vitrine: vitrine.dado,
    hojeISO: hoje,
  });
  const situacao = situacaoDaValidade(orcamento.validoAteISO, hoje);
  const proposta = salvo.status === "ORCAMENTO";
  const forma = configuracao.dado?.formasPagamento.find(
    (item) => item.id === salvo.formaPagamentoId,
  );
  // O mesmo resumo da ficha do pedido, do documento gravado.
  const mensagem = mensagemDoPedido(
    {
      negocio: configuracao.dado?.nomeNegocio ?? "",
      codigo: salvo.codigo,
      clienteNome: salvo.clienteNome,
      itens: salvo.itens,
      subtotal: salvo.subtotal,
      desconto: salvo.desconto,
      taxaEntrega: salvo.entrega.taxa,
      total: salvo.total,
      entrega: {
        tipo: salvo.entrega.tipo,
        dataISO: salvo.dataEntregaISO,
        hora: salvo.horaEntrega,
        endereco: salvo.entrega.endereco ?? undefined,
      },
      formaNome: forma?.nome,
      formaInstrucoes: forma?.instrucoes,
      formaPix: forma?.pix,
      pago: salvo.pago,
      sinal: salvo.sinal?.valor,
    },
    acompanhamento.link,
  );
  const imprimir = () => window.print();
  const iconeImprimir = (
    <Printer aria-hidden className="size-5" strokeWidth={1.75} />
  );

  return (
    <div className="pt-4 lg:pt-6 print:pt-0">
      {/* A barra no eixo da folha: a mesma largura máxima e a mesma margem. */}
      <div className="mx-auto max-w-[210mm] print:hidden">
        {/* No celular a folha a 45% não se lê: o primário é mandar o resumo
            com o link; no desktop, a ordem de sempre (spec 147). */}
        <div className="flex flex-wrap items-center gap-3">
          {voltar}
          <a
            href={linkDoWhatsApp(
              telefoneParaWhatsApp(salvo.clienteTelefone),
              mensagem,
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={acompanhamento.garantir}
            className={classesBotao({
              variante: "primaria",
              tamanho: "lg",
              className: "md:hidden",
            })}
          >
            <MessageCircle aria-hidden className="size-5" strokeWidth={1.75} />
            Mandar pra cliente
          </a>
          <Botao
            variante="secundaria"
            tamanho="lg"
            onClick={imprimir}
            iconeInicial={iconeImprimir}
            className="md:hidden"
          >
            Salvar em PDF
          </Botao>
          <Botao
            variante="primaria"
            tamanho="lg"
            onClick={imprimir}
            iconeInicial={iconeImprimir}
            className="hidden md:inline-flex"
          >
            Salvar em PDF
          </Botao>
        </div>
        <p className="mt-2 hidden text-label text-ink-muted md:block">
          Abre a impressão do aparelho. Escolha &ldquo;Salvar como PDF&rdquo;.
        </p>

        {/* Para ela, e não para a cliente: a folha não diz nada. */}
        {proposta && !orcamento.validoAteISO && (
          <p className="mt-3 max-w-[60ch] text-label text-ink-muted">
            Sem data de validade: o preço vale até você mudar.{" "}
            <Link
              href={`/pedidos/${id}`}
              className="font-medium text-brand-ink underline underline-offset-2"
            >
              Pôr uma data
            </Link>
          </p>
        )}

        {/* O aviso é para ela, e não para a empresa: a folha não muda. */}
        {situacao === "vencido" && orcamento.validoAteISO && (
          <p className="mt-3 flex max-w-[60ch] items-start gap-2 text-label text-attention">
            <TriangleAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={1.75}
            />
            <span>
              Este orçamento venceu em{" "}
              {rotuloDataCompleta(orcamento.validoAteISO)}. Atualize a validade
              no pedido antes de mandar.
            </span>
          </p>
        )}
      </div>

      <div
        ref={medirFolha}
        style={{ "--folha-zoom": zoom } as CSSProperties}
        className="mt-6 print:mt-0"
      >
        <FolhaOrcamento orcamento={orcamento} />
      </div>
    </div>
  );
}
