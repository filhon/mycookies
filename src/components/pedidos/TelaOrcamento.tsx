"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { query, where } from "firebase/firestore";
import { ArrowLeft, Printer, TriangleAlert } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { classesBotao } from "@/components/ui/estilosBotao";
import { PedidoNaoEncontrado } from "./EditorPedido";
import { FolhaOrcamento } from "./FolhaOrcamento";
import { dataISODe, rotuloDataCompleta } from "@/lib/domain/datas";
import { montarOrcamento, situacaoDaValidade } from "@/lib/domain/orcamento";
import { colFichas, docConfiguracao, docPedido } from "@/lib/firebase/colecoes";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import type { ConfiguracaoGeral, FichaTecnica, Pedido } from "@/lib/types";
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

  const fichas = useColecao<FichaTecnica>(consultaFichas);
  const configuracao = useDocumento<ConfiguracaoGeral>(referenciaConfiguracao);
  const pedido = useDocumento<Pedido>(referenciaPedido);

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

  const orcamento = montarOrcamento({
    pedido: pedido.dado,
    fichas: fichas.dados,
    conta,
    configuracao: configuracao.dado,
    hojeISO: hoje,
  });
  const situacao = situacaoDaValidade(orcamento.validoAteISO, hoje);

  return (
    <div className="pt-4 lg:pt-6 print:pt-0">
      <div className="print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/pedidos/${id}`}
            className={classesBotao({ variante: "secundaria", tamanho: "lg" })}
          >
            <ArrowLeft aria-hidden className="size-5" strokeWidth={1.75} />
            Voltar ao pedido
          </Link>
          <Botao
            variante="primaria"
            tamanho="lg"
            onClick={() => window.print()}
            iconeInicial={
              <Printer aria-hidden className="size-5" strokeWidth={1.75} />
            }
          >
            Salvar em PDF
          </Botao>
        </div>
        <p className="mt-2 text-label text-ink-muted">
          Abre a impressão do aparelho. Escolha &ldquo;Salvar como PDF&rdquo;.
        </p>

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
