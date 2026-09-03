"use client";

import { useMemo, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo, Seletor } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Painel } from "@/components/ui/Painel";
import { ResumoCusto } from "./ResumoCusto";
import {
  calcularCustoInsumo,
  CATEGORIAS_INSUMO,
} from "@/lib/domain/custoInsumo";
import { parseParaNumero } from "@/lib/domain/money";
import { errosPorCampo, esquemaInsumo } from "@/lib/domain/schemas";
import { GRUPOS_UNIDADE, ROTULO_UNIDADE_COMPRA } from "@/lib/domain/unidades";
import { Archive } from "lucide-react";
import {
  arquivarInsumo,
  atualizarInsumo,
  criarInsumo,
  type DadosInsumo,
} from "@/lib/firebase/mutations/insumos";
import type { CategoriaInsumo, Insumo, UnidadeCompra } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";

interface EstadoFormulario {
  nome: string;
  categoria: CategoriaInsumo;
  precoCompra: number;
  quantidadeCompra: string;
  unidadeCompra: UnidadeCompra;
  perdaPercentual: string;
  marca: string;
  fornecedor: string;
  estoqueAtual: string;
}

const VAZIO: EstadoFormulario = {
  nome: "",
  categoria: "INGREDIENTE",
  precoCompra: 0,
  quantidadeCompra: "",
  unidadeCompra: "kg",
  perdaPercentual: "0",
  marca: "",
  fornecedor: "",
  estoqueAtual: "",
};

function doInsumo(insumo: Insumo): EstadoFormulario {
  return {
    nome: insumo.nome,
    categoria: insumo.categoria,
    precoCompra: insumo.precoCompra,
    quantidadeCompra: String(insumo.quantidadeCompra),
    unidadeCompra: insumo.unidadeCompra,
    perdaPercentual: String(insumo.perdaPercentual),
    marca: insumo.marca ?? "",
    fornecedor: insumo.fornecedor ?? "",
    estoqueAtual:
      insumo.estoqueAtual !== undefined ? String(insumo.estoqueAtual) : "",
  };
}

export function FormularioInsumo({
  aberto,
  aoFechar,
  insumo,
}: {
  aberto: boolean;
  aoFechar: () => void;
  /** Ausente = novo cadastro. */
  insumo?: Insumo;
}) {
  const contaId = useContaId();
  const [estado, setEstado] = useState<EstadoFormulario>(
    insumo ? doInsumo(insumo) : VAZIO,
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [confirmandoArquivo, setConfirmandoArquivo] = useState(false);

  // Reinicia o formulário quando o painel abre em outro insumo.
  const [chave, setChave] = useState(insumo?.id ?? "novo");
  const chaveAtual = insumo?.id ?? "novo";
  if (chave !== chaveAtual) {
    setChave(chaveAtual);
    setEstado(insumo ? doInsumo(insumo) : VAZIO);
    setErros({});
    setFalha(null);
    setConfirmandoArquivo(false);
  }

  const definir = <C extends keyof EstadoFormulario>(
    campo: C,
    valor: EstadoFormulario[C],
  ) => setEstado((anterior) => ({ ...anterior, [campo]: valor }));

  const quantidade = parseParaNumero(estado.quantidadeCompra);
  const perda = parseParaNumero(estado.perdaPercentual);

  const custo = useMemo(
    () =>
      calcularCustoInsumo({
        precoCompra: estado.precoCompra,
        quantidadeCompra: quantidade,
        unidadeCompra: estado.unidadeCompra,
        perdaPercentual: perda,
      }),
    [estado.precoCompra, estado.unidadeCompra, quantidade, perda],
  );

  const podeCalcular = estado.precoCompra > 0 && quantidade > 0;

  async function salvar() {
    setFalha(null);

    const resultado = esquemaInsumo.safeParse({
      nome: estado.nome,
      categoria: estado.categoria,
      precoCompra: estado.precoCompra,
      quantidadeCompra: quantidade,
      unidadeCompra: estado.unidadeCompra,
      perdaPercentual: perda,
      marca: estado.marca || undefined,
      fornecedor: estado.fornecedor || undefined,
      estoqueAtual: estado.estoqueAtual
        ? parseParaNumero(estado.estoqueAtual)
        : undefined,
    });

    if (!resultado.success) {
      setErros(errosPorCampo(resultado.error));
      return;
    }

    setErros({});
    setSalvando(true);

    try {
      // A data da contagem é carregada adiante, e não redatada: este formulário
      // fala de preço e de embalagem, e quem conta a despensa é a tela de
      // contagem. Sem isto, editar o preço aqui apagaria a idade do estoque.
      const dados: DadosInsumo = {
        ...resultado.data,
        ...(insumo?.estoqueContadoEmISO
          ? { estoqueContadoEmISO: insumo.estoqueContadoEmISO }
          : {}),
      };
      if (insumo) {
        await atualizarInsumo(contaId, insumo, dados);
      } else {
        await criarInsumo(contaId, dados);
      }
      aoFechar();
    } catch {
      setFalha("Não foi possível salvar agora. Tente de novo em instantes.");
    } finally {
      setSalvando(false);
    }
  }

  async function arquivar() {
    if (!insumo) return;
    setFalha(null);
    setSalvando(true);
    try {
      await arquivarInsumo(contaId, insumo.id);
      aoFechar();
    } catch {
      setFalha("Não foi possível arquivar agora. Tente de novo em instantes.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Painel
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={insumo ? "Editar insumo" : "Novo insumo"}
      descricao={
        insumo
          ? "Mudar o preço aqui marca todas as fichas que usam este insumo para recálculo."
          : "Cadastre como você compra. O custo por grama o sistema calcula."
      }
      rodape={
        <div className="flex gap-3">
          <Botao onClick={aoFechar} className="flex-1" disabled={salvando}>
            Cancelar
          </Botao>
          <Botao
            variante="primaria"
            onClick={() => void salvar()}
            carregando={salvando}
            className="flex-[1.6]"
          >
            {insumo ? "Salvar alterações" : "Cadastrar insumo"}
          </Botao>
        </div>
      }
    >
      <div className="space-y-5">
        <Campo
          rotulo="Nome"
          required
          autoFocus={!insumo}
          placeholder="Farinha de trigo"
          value={estado.nome}
          erro={erros.nome}
          onChange={(evento) => definir("nome", evento.target.value)}
        />

        <Seletor
          rotulo="Categoria"
          value={estado.categoria}
          onChange={(evento) =>
            definir("categoria", evento.target.value as CategoriaInsumo)
          }
        >
          {CATEGORIAS_INSUMO.map((categoria) => (
            <option key={categoria.valor} value={categoria.valor}>
              {categoria.rotulo}
            </option>
          ))}
        </Seletor>

        <div className="rounded-lg border border-line bg-surface p-4">
          <h3 className="text-subheading font-semibold text-ink">
            Como você compra
          </h3>
          <p className="mt-1 text-label text-ink-muted">
            O preço da embalagem inteira e o que vem dentro dela.
          </p>

          <div className="mt-4 space-y-4">
            <CampoMoeda
              rotulo="Preço pago"
              obrigatorio
              valor={estado.precoCompra}
              aoMudar={(centavos) => definir("precoCompra", centavos)}
              erro={erros.precoCompra}
            />

            <div className="grid grid-cols-[1fr_7.5rem] gap-3">
              <Campo
                rotulo="Quantidade"
                required
                inputMode="decimal"
                placeholder="1"
                value={estado.quantidadeCompra}
                erro={erros.quantidadeCompra}
                onChange={(evento) =>
                  definir("quantidadeCompra", evento.target.value)
                }
              />
              <Seletor
                rotulo="Unidade"
                value={estado.unidadeCompra}
                onChange={(evento) =>
                  definir("unidadeCompra", evento.target.value as UnidadeCompra)
                }
              >
                {GRUPOS_UNIDADE.map((grupo) => (
                  <optgroup key={grupo.grandeza} label={grupo.grandeza}>
                    {grupo.unidades.map((unidade) => (
                      <option key={unidade} value={unidade}>
                        {unidade} · {ROTULO_UNIDADE_COMPRA[unidade]}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Seletor>
            </div>

            <Campo
              rotulo="Perda"
              inputMode="decimal"
              sufixo="%"
              value={estado.perdaPercentual}
              erro={erros.perdaPercentual}
              dica="O que se perde entre comprar e usar: casca, aparas, o que fica na tigela."
              onChange={(evento) =>
                definir("perdaPercentual", evento.target.value)
              }
            />
          </div>
        </div>

        {podeCalcular && <ResumoCusto custo={custo} perdaPercentual={perda} />}

        <details className="group rounded-lg border border-line bg-surface">
          <summary className="toque flex cursor-pointer list-none items-center justify-between px-4 py-3 text-subheading font-semibold text-ink">
            Detalhes opcionais
            <span
              aria-hidden
              className="text-label font-normal text-ink-muted group-open:hidden"
            >
              marca, fornecedor, estoque
            </span>
          </summary>

          <div className="space-y-4 border-t border-line px-4 py-4">
            <Campo
              rotulo="Marca"
              value={estado.marca}
              onChange={(evento) => definir("marca", evento.target.value)}
            />
            <Campo
              rotulo="Onde compra"
              value={estado.fornecedor}
              onChange={(evento) => definir("fornecedor", evento.target.value)}
            />
            <Campo
              rotulo="Estoque atual"
              inputMode="decimal"
              sufixo={custo.unidadeBase}
              value={estado.estoqueAtual}
              erro={erros.estoqueAtual}
              dica="Usado pela lista de compras para não mandar comprar o que já tem. Para contar a despensa inteira de uma vez, use Contar a despensa, em Compras."
              onChange={(evento) =>
                definir("estoqueAtual", evento.target.value)
              }
            />
          </div>
        </details>

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}

        {insumo &&
          (confirmandoArquivo ? (
            // Confirmação de dois passos no lugar de um modal: no celular, uma
            // caixa de diálogo empilhada sobre a folha inferior é pior de ler
            // e pior de tocar do que a pergunta feita onde a ação está.
            <div className="rounded-lg border border-negative/30 bg-negative-soft p-4">
              <p className="text-label text-ink">
                Arquivar{" "}
                <strong className="font-semibold">{insumo.nome}</strong>? Ele
                sai das listas e da busca, mas continua nas fichas e nos pedidos
                antigos, para o histórico de custo não se perder.
              </p>
              <div className="mt-3 flex gap-2">
                <Botao
                  tamanho="sm"
                  onClick={() => setConfirmandoArquivo(false)}
                  disabled={salvando}
                >
                  Cancelar
                </Botao>
                <Botao
                  tamanho="sm"
                  variante="perigo"
                  carregando={salvando}
                  onClick={() => void arquivar()}
                >
                  Arquivar mesmo assim
                </Botao>
              </div>
            </div>
          ) : (
            <div className="border-t border-line pt-5">
              <Botao
                variante="perigo"
                tamanho="sm"
                onClick={() => setConfirmandoArquivo(true)}
                iconeInicial={
                  <Archive aria-hidden className="size-4" strokeWidth={1.75} />
                }
              >
                Arquivar insumo
              </Botao>
            </div>
          ))}
      </div>
    </Painel>
  );
}
