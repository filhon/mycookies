"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Info } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo, Seletor } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { parseParaNumero } from "@/lib/domain/money";
import {
  arredondarNaBase,
  converterUnidadeDeConta,
  fatorDaConversao,
  formatarQuantidade,
  perguntaDaConversao,
  PLURAL_UNIDADE_BASE,
  ROTULO_UNIDADE_COMPRA,
  unidadesCompativeis,
} from "@/lib/domain/unidades";
import {
  mudarUnidadeDeConta,
  receitasDoMaterial,
} from "@/lib/firebase/mutations/insumos";
import { useConexao } from "@/lib/hooks/useDispositivo";
import type {
  FichaTecnica,
  Insumo,
  UnidadeBase,
  UnidadeCompra,
} from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";

const BASES: UnidadeBase[] = ["g", "ml", "un"];

const SEM_REDE =
  "Mudar a unidade precisa de internet, para achar todas as receitas que usam este material.";

/**
 * Mudar como um material é contado, convertendo junto as receitas e a despensa
 * (spec 191, `DECISOES.md#d422`). Exige rede: as receitas vêm do servidor.
 */
export function PassoDaUnidade({
  insumo,
  aoVoltar,
  aoConcluir,
}: {
  insumo: Insumo;
  aoVoltar: () => void;
  aoConcluir: () => void;
}) {
  const contaId = useContaId();
  const online = useConexao();
  const opcoes = BASES.filter((base) => base !== insumo.unidadeBase);
  const primeira = opcoes[0] ?? "g";
  const [para, setPara] = useState<UnidadeBase>(primeira);
  const [resposta, setResposta] = useState("");
  const [preco, setPreco] = useState(insumo.precoCompra);
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState<UnidadeCompra>(primeira);
  const [receitas, setReceitas] = useState<FichaTecnica[] | null>(null);
  const [semRede, setSemRede] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  // Do servidor, e de novo quando a rede volta: do cache poderia faltar uma.
  useEffect(() => {
    if (!online) return;
    let vivo = true;
    receitasDoMaterial(contaId, insumo.id)
      .then((lidas) => {
        if (!vivo) return;
        setReceitas(lidas);
        setSemRede(false);
      })
      .catch(() => {
        if (vivo) setSemRede(true);
      });
    return () => {
      vivo = false;
    };
  }, [contaId, insumo.id, online]);

  const pergunta = perguntaDaConversao(insumo.unidadeBase, para, insumo.nome);
  const numero = parseParaNumero(resposta);
  const fator = numero > 0 ? fatorDaConversao(para, numero) : null;
  const convertido = fator
    ? converterUnidadeDeConta(fator, insumo, para, receitas ?? [])
    : null;

  // A embalagem nasce da conversão (12 ovos → 600 g) e fica editável.
  function preencher(novoPara: UnidadeBase, novaResposta: string) {
    const valor = parseParaNumero(novaResposta);
    setUnidade(novoPara);
    setQuantidade(
      valor > 0
        ? String(
            arredondarNaBase(
              insumo.quantidadeBase * fatorDaConversao(novoPara, valor),
              novoPara,
            ),
          ).replace(".", ",")
        : "",
    );
  }

  const quantidadeCompra = parseParaNumero(quantidade);
  const indisponivel = !online || semRede;
  const pronto =
    !indisponivel &&
    receitas !== null &&
    !!fator &&
    preco > 0 &&
    quantidadeCompra > 0;

  async function mudar() {
    if (!pronto || !fator || !receitas) return;
    setFalha(null);
    setSalvando(true);
    try {
      await mudarUnidadeDeConta(contaId, insumo, receitas, fator, para, {
        precoCompra: preco,
        quantidadeCompra,
        unidadeCompra: unidade,
      });
      aoConcluir();
    } catch {
      setFalha(SEM_REDE);
    } finally {
      setSalvando(false);
    }
  }

  // Cada linha do material em cada receita, antes e depois.
  const mudancas = (receitas ?? []).flatMap((receita, indice) =>
    receita.itens.flatMap((item, posicao) => {
      const depois = convertido?.itens[indice]?.[posicao];
      if (item.insumoId !== insumo.id || !depois || depois === item) return [];
      return [
        {
          chave: `${receita.id}-${posicao}`,
          nome: receita.arquivado
            ? `${receita.nome} (arquivado)`
            : receita.nome,
          antes: formatarQuantidade(item.quantidade, item.unidadeBase),
          depois: formatarQuantidade(depois.quantidade, depois.unidadeBase),
        },
      ];
    }),
  );
  const estoque =
    insumo.estoqueAtual !== undefined &&
    insumo.estoqueAtual !== null &&
    convertido?.estoqueAtual !== undefined
      ? {
          antes: formatarQuantidade(insumo.estoqueAtual, insumo.unidadeBase),
          depois: formatarQuantidade(convertido.estoqueAtual, para),
        }
      : null;

  return (
    <div className="space-y-6">
      <p className="text-body text-ink-muted">
        Hoje {insumo.nome} é contado em{" "}
        {PLURAL_UNIDADE_BASE[insumo.unidadeBase]}. As receitas, a despensa e a
        embalagem mudam juntas.
      </p>

      {indisponivel && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-info/30 bg-info-soft p-4 text-label text-ink"
        >
          <Info
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-info"
            strokeWidth={1.75}
          />
          <span>{SEM_REDE}</span>
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-label font-semibold text-ink">
          Para qual unidade
        </legend>
        {opcoes.map((base) => (
          <label
            key={base}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-line-strong px-3 py-3"
          >
            <input
              type="radio"
              name="unidade-nova"
              value={base}
              checked={para === base}
              onChange={() => {
                setPara(base);
                preencher(base, resposta);
              }}
              className="size-5 shrink-0"
            />
            <span className="text-label text-ink">
              {PLURAL_UNIDADE_BASE[base].charAt(0).toUpperCase() +
                PLURAL_UNIDADE_BASE[base].slice(1)}
            </span>
          </label>
        ))}
      </fieldset>

      <Campo
        rotulo={pergunta.texto}
        required
        inputMode="decimal"
        sufixo={pergunta.unidade}
        value={resposta}
        onChange={(evento) => {
          setResposta(evento.target.value);
          preencher(para, evento.target.value);
        }}
      />

      {fator && (
        <div className="rounded-lg border border-line bg-surface p-4">
          <h3 className="text-subheading font-semibold text-ink">
            A nova embalagem
          </h3>
          <p className="mt-1 text-label text-ink-muted">
            Já convertida. Confira no pacote.
          </p>
          <div className="mt-4 space-y-4">
            <CampoMoeda
              rotulo="Preço pago"
              obrigatorio
              valor={preco}
              aoMudar={setPreco}
            />
            <div className="grid grid-cols-[1fr_7.5rem] gap-3">
              <Campo
                rotulo="Quantidade"
                required
                inputMode="decimal"
                value={quantidade}
                onChange={(evento) => setQuantidade(evento.target.value)}
              />
              <Seletor
                rotulo="Unidade"
                value={unidade}
                onChange={(evento) =>
                  setUnidade(evento.target.value as UnidadeCompra)
                }
              >
                {unidadesCompativeis(para).map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao} · {ROTULO_UNIDADE_COMPRA[opcao]}
                  </option>
                ))}
              </Seletor>
            </div>
          </div>
        </div>
      )}

      {fator && receitas && (
        <section aria-labelledby="o-que-muda" className="space-y-3">
          <h3
            id="o-que-muda"
            className="text-subheading font-semibold text-ink"
          >
            O que muda
          </h3>
          {mudancas.length === 0 && !estoque ? (
            <p className="text-label text-ink-muted">
              Nenhuma receita usa {insumo.nome}, e a despensa não foi contada.
              Só a embalagem muda.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {mudancas.map((linha) => (
                <LinhaDaMudanca key={linha.chave} {...linha} />
              ))}
              {estoque && (
                <LinhaDaMudanca
                  nome="Despensa, contada de novo a partir de hoje"
                  {...estoque}
                />
              )}
            </ul>
          )}
          <p className="text-label text-ink-muted">
            Os produtos ficam com o custo para recalcular. A conta é a mesma,
            noutra unidade.
          </p>
        </section>
      )}

      {falha && (
        <p role="alert" className="text-label text-negative">
          {falha}
        </p>
      )}

      <div className="flex gap-3 border-t border-line pt-5">
        <Botao onClick={aoVoltar} className="flex-1" disabled={salvando}>
          Voltar
        </Botao>
        <Botao
          variante="primaria"
          onClick={() => void mudar()}
          carregando={salvando}
          disabled={!pronto}
          className="flex-[1.6]"
        >
          Mudar para {PLURAL_UNIDADE_BASE[para]}
        </Botao>
      </div>
    </div>
  );
}

function LinhaDaMudanca({
  nome,
  antes,
  depois,
}: {
  nome: string;
  antes: string;
  depois: string;
}) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-3 px-4 py-3">
      <span className="min-w-0 text-label text-ink">{nome}</span>
      <span className="num flex shrink-0 items-center gap-1.5 text-label font-semibold text-ink">
        {antes}
        <ArrowRight
          aria-label="vira"
          className="size-4 text-ink-subtle"
          strokeWidth={1.75}
        />
        {depois}
      </span>
    </li>
  );
}
