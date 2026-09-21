"use client";

import { Plus, ScanLine } from "lucide-react";
import { orderBy, query, where } from "firebase/firestore";
import { useMemo, useState } from "react";
import { BotaoBiblioteca } from "@/components/biblioteca/BotaoBiblioteca";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { FormularioInsumo } from "@/components/insumos/FormularioInsumo";
import { LinhaInsumo } from "@/components/insumos/LinhaInsumo";
import {
  AvisoLeituraSemRede,
  EntradaLeitura,
} from "@/components/notas/EntradaLeitura";
import { Botao } from "@/components/ui/Botao";
import { BotaoMais } from "@/components/ui/BotaoMais";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { Pilulas, type OpcaoPilula } from "@/components/ui/Pilulas";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { dataISODe } from "@/lib/domain/datas";
import { MENSAGEM_FALHA } from "@/lib/domain/notaFiscal";
import { colInsumos } from "@/lib/firebase/colecoes";
import { consultaFornadas } from "@/lib/firebase/mutations/fornadas";
import { useColecao } from "@/lib/hooks/useColecao";
import { useConexao } from "@/lib/hooks/useDispositivo";
import type { CategoriaInsumo, Fornada, Insumo } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";

const FILTROS: OpcaoPilula<CategoriaInsumo | "TODOS">[] = [
  { valor: "TODOS", rotulo: "Todos" },
  { valor: "INGREDIENTE", rotulo: "Ingredientes" },
  { valor: "EMBALAGEM", rotulo: "Embalagens" },
  { valor: "ETIQUETA", rotulo: "Etiquetas" },
  { valor: "ARMAZENAMENTO", rotulo: "Armazenamento" },
  { valor: "OUTRO", rotulo: "Outros" },
];

export default function PaginaInsumos() {
  const contaId = useContaId();
  // O dia congela na abertura: é contra ele que a idade de cada contagem é
  // medida, e uma tela que o relesse a cada render mediria contra outro relógio.
  const [hoje] = useState(() => dataISODe(new Date()));
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<CategoriaInsumo | "TODOS">("TODOS");
  const [emEdicao, setEmEdicao] = useState<Insumo | undefined>();
  const [painelAberto, setPainelAberto] = useState(false);
  // O mesmo sinal de `EntradaLeitura`: sem rede, "Ler uma nota" na bandeja
  // nasce desabilitada e diz por quê.
  const online = useConexao();

  /**
   * Uma consulta só, ordenada, e todo o resto filtrado em memória.
   * A coleção de insumos de uma confeitaria artesanal tem dezenas de itens: o
   * cache do Firestore já os tem, e cada filtro no servidor seria leitura paga
   * para reordenar o que já está no aparelho.
   */
  const consulta = useMemo(
    () =>
      query(
        colInsumos(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );

  const { dados, carregando, erro, pendente } = useColecao<Insumo>(consulta);

  // O que o forno levou desde a contagem de cada um: a linha diz a projeção.
  const consultaProducao = useMemo(
    () => consultaFornadas(contaId, hoje),
    [contaId, hoje],
  );
  const { dados: fornadas } = useColecao<Fornada>(consultaProducao);

  const visiveis = useMemo(() => {
    const termo = chaveDeBusca(busca);
    return dados.filter((insumo) => {
      const combinaCategoria =
        filtro === "TODOS" || insumo.categoria === filtro;
      const combinaBusca = !termo || insumo.nomeBusca.includes(termo);
      return combinaCategoria && combinaBusca;
    });
  }, [dados, busca, filtro]);

  function abrirNovo() {
    setEmEdicao(undefined);
    setPainelAberto(true);
  }

  function abrirEdicao(insumo: Insumo) {
    setEmEdicao(insumo);
    setPainelAberto(true);
  }

  // Um botão primário por tela: enquanto o estado vazio ensina a tela, a ação
  // é dele (a biblioteca), e o botão do cabeçalho e o "+" saem.
  const estadoVazioNaTela = !carregando && !erro && dados.length === 0;

  return (
    <>
      <CabecalhoPagina
        titulo="Materiais"
        descricao="Ingredientes e embalagens. É daqui que sai o custo de todo produto."
        acao={
          // No desktop as duas ações moram no cabeçalho; no celular só o "+",
          // e a bandeja é o único lugar delas (`DECISOES.md#d151`).
          <div className="flex items-start gap-2">
            <EntradaLeitura className="hidden lg:inline-flex" />
            {!estadoVazioNaTela && (
              <>
                <Botao
                  variante="primaria"
                  onClick={abrirNovo}
                  iconeInicial={
                    <Plus aria-hidden className="size-5" strokeWidth={2} />
                  }
                  className="hidden lg:inline-flex"
                >
                  Novo material
                </Botao>
                <BotaoMais
                  rotulo="Adicionar"
                  opcoes={[
                    {
                      rotulo: "Novo material",
                      icone: Plus,
                      onClick: abrirNovo,
                    },
                    {
                      rotulo: "Ler uma nota",
                      icone: ScanLine,
                      href: "/insumos/nota",
                      desabilitada: !online,
                      dica: MENSAGEM_FALHA["sem-rede"],
                    },
                  ]}
                />
              </>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          {/* A frase da entrada desabilitada vai aqui, e não embaixo do botão:
              é a faixa que tem a largura da página. No celular ela mora ao
              lado da opção que explica, na bandeja. */}
          <AvisoLeituraSemRede className="hidden lg:flex" />

          <CampoBusca
            rotulo="Buscar material"
            placeholder="Buscar material"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />

          <Pilulas
            rotulo="Categoria"
            opcoes={FILTROS}
            valor={filtro}
            aoMudar={setFiltro}
          />
        </div>
      </CabecalhoPagina>

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
        <p className="text-label text-ink-muted" aria-live="polite">
          {carregando
            ? "Carregando"
            : `${visiveis.length} ${visiveis.length === 1 ? "material" : "materiais"}`}
        </p>
        <SeloSincronizacao pendente={pendente} />
      </div>

      <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
        {erro ? (
          <EstadoVazio
            titulo="Não deu para carregar seus materiais"
            descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
          />
        ) : carregando ? (
          <EsqueletoLista />
        ) : visiveis.length === 0 ? (
          dados.length === 0 ? (
            <EstadoVazio
              titulo="Sua despensa começa aqui."
              descricao="Cadastre o que você compra: farinha, saquinho, caixa. O custo de cada doce sai sozinho."
              acao={
                <div className="flex flex-col items-center gap-4">
                  <BotaoBiblioteca />
                  <div className="flex items-center gap-3">
                    <Botao variante="terciaria" onClick={abrirNovo}>
                      Cadastrar material
                    </Botao>
                    <EntradaLeitura tamanho="sm" />
                  </div>
                  <AvisoLeituraSemRede centralizado />
                </div>
              }
            />
          ) : (
            <EstadoVazio
              titulo="Nada com esse filtro"
              descricao="Tente outro termo de busca ou volte para todas as categorias."
              acao={
                <Botao
                  onClick={() => {
                    setBusca("");
                    setFiltro("TODOS");
                  }}
                >
                  Limpar filtros
                </Botao>
              }
            />
          )
        ) : (
          <ul className="divide-y divide-line">
            {visiveis.map((insumo) => (
              <LinhaInsumo
                key={insumo.id}
                insumo={insumo}
                fornadas={fornadas}
                hoje={hoje}
                aoAbrir={abrirEdicao}
              />
            ))}
          </ul>
        )}
      </div>

      <FormularioInsumo
        aberto={painelAberto}
        aoFechar={() => setPainelAberto(false)}
        insumo={emEdicao}
      />
    </>
  );
}
