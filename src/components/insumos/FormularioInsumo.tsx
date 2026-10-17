"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo, Seletor } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Painel } from "@/components/ui/Painel";
import { CaixaDoSalto, FraseDoSalto } from "./ConfirmaPreco";
import { EfeitoDoPrecoDigitado } from "./EfeitoDoPreco";
import { PassoDaUnidade } from "./PassoDaUnidade";
import { ResumoCusto } from "./ResumoCusto";
import {
  baseAceita,
  basesDasReceitas,
  calcularCustoInsumo,
  CATEGORIAS_INSUMO,
  ultimaCompraDela,
} from "@/lib/domain/custoInsumo";
import { dataISODe, rotuloDia } from "@/lib/domain/datas";
import { parseParaNumero } from "@/lib/domain/money";
import { saltoDePreco } from "@/lib/domain/notaFiscal";
import { errosPorCampo, esquemaInsumo } from "@/lib/domain/schemas";
import {
  GRUPOS_UNIDADE,
  PLURAL_UNIDADE_BASE,
  ROTULO_UNIDADE_COMPRA,
  unidadesCompativeis,
} from "@/lib/domain/unidades";
import { Archive, ChevronDown, TriangleAlert } from "lucide-react";
import {
  arquivarInsumo,
  atualizarInsumo,
  criarInsumo,
  type DadosInsumo,
  type ModoDaEscrita,
} from "@/lib/firebase/mutations/insumos";
import type {
  CategoriaInsumo,
  FichaTecnica,
  Insumo,
  UnidadeBase,
  UnidadeCompra,
} from "@/lib/types";
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
  leitura,
  aoEditar,
  aoVoltar,
  fichas,
  materiais = [],
}: {
  aberto: boolean;
  aoFechar: () => void;
  /** Ausente = novo cadastro. */
  insumo?: Insumo;
  /**
   * A ficha do material (`#d222`). Presente, o painel mostra ela no lugar dos
   * campos, com "Editar material" no rodapé. O painel é o mesmo nos dois
   * modos: trocar o conteúdo não fecha nem reabre nada.
   */
  leitura?: ReactNode;
  aoEditar?: () => void;
  /** Presente, "Cancelar" volta para a ficha em vez de fechar. */
  aoVoltar?: () => void;
  /**
   * Para "Com esse preço" (`#d224`). Nulo enquanto carrega: o bloco espera, em
   * vez de dizer que nada muda.
   */
  fichas?: FichaTecnica[] | null;
  /** Os materiais vivos, para a sobra de hoje dos produtos. */
  materiais?: Insumo[];
}) {
  const contaId = useContaId();
  const [estado, setEstado] = useState<EstadoFormulario>(
    insumo ? doInsumo(insumo) : VAZIO,
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [confirmandoArquivo, setConfirmandoArquivo] = useState(false);
  /** O custo por unidade base de "O preço é esse mesmo" (spec 188). */
  const [precoConfirmado, setPrecoConfirmado] = useState<number | null>(null);
  /** Registrar ou corrigir (spec 189). "Comprei de novo" é o de sempre. */
  const [modo, setModo] = useState<ModoDaEscrita>("COMPRA");
  /** O passo de "Mudar a unidade de conta", no mesmo painel (spec 191). */
  const [trocandoUnidade, setTrocandoUnidade] = useState(false);

  // Reinicia o formulário quando o painel abre em outro insumo.
  const [chave, setChave] = useState(insumo?.id ?? "novo");
  const chaveAtual = insumo?.id ?? "novo";
  if (chave !== chaveAtual) {
    setChave(chaveAtual);
    setEstado(insumo ? doInsumo(insumo) : VAZIO);
    setErros({});
    setFalha(null);
    setConfirmandoArquivo(false);
    setPrecoConfirmado(null);
    setModo("COMPRA");
    setTrocandoUnidade(false);
  }

  // O botão que trocou o modo sai da tela junto com o modo: o foco vai para o
  // conteúdo do painel, e não para o `body`, fora da armadilha de foco.
  const conteudo = useRef<HTMLDivElement>(null);
  const lendo = leitura ? "leitura" : trocandoUnidade ? "unidade" : "edicao";
  const lendoAntes = useRef(lendo);
  useEffect(() => {
    if (lendoAntes.current === lendo) return;
    lendoAntes.current = lendo;
    if (aberto) conteudo.current?.focus();
  }, [lendo, aberto]);

  function voltar() {
    // O que ela digitou e desistiu não reaparece no próximo "Editar".
    if (insumo) setEstado(doInsumo(insumo));
    setErros({});
    setFalha(null);
    setConfirmandoArquivo(false);
    setModo("COMPRA");
    setTrocandoUnidade(false);
    aoVoltar?.();
  }

  const definir = <C extends keyof EstadoFormulario>(
    campo: C,
    valor: EstadoFormulario[C],
  ) => setEstado((anterior) => ({ ...anterior, [campo]: valor }));

  const quantidade = parseParaNumero(estado.quantidadeCompra);
  const perda = parseParaNumero(estado.perdaPercentual);

  // Abre sobre o que é dela: o que difere do que um insumo novo recebe, ou o
  // que está errado — uma dobra fechada em cima de um erro é um "Salvar" que
  // não faz nada e não diz por quê. Lê o documento salvo, e não o digitado,
  // para não abrir e fechar enquanto ela escreve. A `key` refaz a decisão
  // quando o painel troca de insumo sem desmontar.
  const temMaisDetalhes =
    !!insumo &&
    (insumo.categoria !== "INGREDIENTE" ||
      insumo.perdaPercentual > 0 ||
      !!insumo.marca ||
      !!insumo.fornecedor ||
      insumo.estoqueAtual !== undefined);
  const erroNosDetalhes = !!(
    erros.categoria ||
    erros.perdaPercentual ||
    erros.marca ||
    erros.fornecedor ||
    erros.estoqueAtual
  );

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

  // Usado em receita, o material só é contado na base delas (spec 188). Mudar
  // de base é converter as receitas junto, e esse caminho é outro (191).
  const bases = useMemo(
    () =>
      insumo && fichas
        ? basesDasReceitas(fichas, insumo.id)
        : new Set<UnidadeBase>(),
    [insumo, fichas],
  );
  const baseDasReceitas = [...bases][0];
  const unidades = baseDasReceitas
    ? unidadesCompativeis(baseDasReceitas)
    : null;
  if (unidades && !unidades.includes(estado.unidadeCompra))
    unidades.push(estado.unidadeCompra);
  const baseRecusada =
    !!insumo && !!baseDasReceitas && !baseAceita(custo.unidadeBase, bases);
  // Já gravado na base errada: o painel abre com o cursor na unidade.
  const jaQuebrado =
    !!insumo && !!baseDasReceitas && !baseAceita(insumo.unidadeBase, bases);

  // O salto contra o gravado pede a mesma caixa da nota. Guardar o custo
  // confirmado faz a confirmação cair quando ela mexe no número depois.
  const salto = insumo && podeCalcular ? saltoDePreco(insumo, custo) : null;
  const saltoConfirmado = precoConfirmado === custo.custoUnidadeBase;
  const bloqueado = baseRecusada || (!!salto && !saltoConfirmado);

  // Preço ou embalagem mudou: compra nova ou correção da última dela. Sem
  // compra dela (só o preço médio da biblioteca), só existe comprar.
  const ultima = insumo ? ultimaCompraDela(insumo) : null;
  const escolheModo =
    !!insumo &&
    !!ultima &&
    (estado.precoCompra !== insumo.precoCompra ||
      quantidade !== insumo.quantidadeCompra ||
      estado.unidadeCompra !== insumo.unidadeCompra);

  async function salvar() {
    setFalha(null);
    if (bloqueado) return;

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
        await atualizarInsumo(
          contaId,
          insumo,
          dados,
          escolheModo ? modo : "COMPRA",
        );
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

  if (insumo && leitura) {
    const categoria = CATEGORIAS_INSUMO.find(
      (opcao) => opcao.valor === insumo.categoria,
    )?.rotulo;
    return (
      <Painel
        aberto={aberto}
        aoFechar={aoFechar}
        titulo={insumo.nome}
        descricao={[categoria, insumo.marca].filter(Boolean).join(" · ")}
        rodape={
          <Botao variante="primaria" onClick={aoEditar} className="w-full">
            Editar material
          </Botao>
        }
      >
        <div ref={conteudo} tabIndex={-1} className="outline-none">
          {leitura}
        </div>
      </Painel>
    );
  }

  // O mesmo `Painel` na mesma posição: trocar o conteúdo não fecha nem reabre.
  if (insumo && trocandoUnidade) {
    return (
      <Painel
        aberto={aberto}
        aoFechar={aoFechar}
        titulo="Mudar a unidade de conta"
        descricao={insumo.nome}
      >
        <div ref={conteudo} tabIndex={-1} className="outline-none">
          <PassoDaUnidade
            insumo={insumo}
            aoVoltar={() => setTrocandoUnidade(false)}
            aoConcluir={() => {
              setTrocandoUnidade(false);
              aoFechar();
            }}
          />
        </div>
      </Painel>
    );
  }

  return (
    <Painel
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={insumo ? "Editar material" : "Novo material"}
      // Em edição, "Com esse preço" é a versão concreta da frase que ficava aqui.
      descricao={
        insumo
          ? undefined
          : "Cadastre como você compra. O custo por grama o sistema calcula."
      }
      rodape={
        <div className="space-y-3">
          {salto && insumo && (
            <div className="space-y-2">
              <FraseDoSalto
                anterior={insumo}
                novo={custo}
                confirmado={saltoConfirmado}
              />
              <CaixaDoSalto
                confirmado={saltoConfirmado}
                aoMudar={(sim) =>
                  setPrecoConfirmado(sim ? custo.custoUnidadeBase : null)
                }
              />
            </div>
          )}
          <div className="flex gap-3">
            <Botao
              onClick={aoVoltar ? voltar : aoFechar}
              className="flex-1"
              disabled={salvando}
            >
              Cancelar
            </Botao>
            <Botao
              variante="primaria"
              onClick={() => void salvar()}
              carregando={salvando}
              disabled={bloqueado}
              className="flex-[1.6]"
            >
              {insumo ? "Salvar alterações" : "Cadastrar material"}
            </Botao>
          </div>
        </div>
      }
    >
      <div ref={conteudo} tabIndex={-1} className="space-y-5 outline-none">
        <Campo
          rotulo="Nome"
          required
          autoFocus={!insumo}
          placeholder="Farinha de trigo"
          value={estado.nome}
          erro={erros.nome}
          onChange={(evento) => definir("nome", evento.target.value)}
        />

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
                autoFocus={jaQuebrado}
                value={estado.unidadeCompra}
                onChange={(evento) =>
                  definir("unidadeCompra", evento.target.value as UnidadeCompra)
                }
              >
                {unidades
                  ? unidades.map((unidade) => (
                      <option key={unidade} value={unidade}>
                        {unidade} · {ROTULO_UNIDADE_COMPRA[unidade]}
                      </option>
                    ))
                  : GRUPOS_UNIDADE.map((grupo) => (
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

            {/* Fora da grade: em 7,5rem a frase quebraria palavra a palavra. */}
            {baseDasReceitas && baseRecusada && insumo && (
              <p
                role="alert"
                className="flex items-start gap-1.5 text-label text-attention"
              >
                <TriangleAlert
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={1.75}
                />
                <span>
                  Os produtos medem {insumo.nome} em{" "}
                  {PLURAL_UNIDADE_BASE[baseDasReceitas]}, e esta compra está em{" "}
                  {PLURAL_UNIDADE_BASE[custo.unidadeBase]}. Escolha{" "}
                  {unidadesCompativeis(baseDasReceitas).join(" ou ")}, ou mude a
                  unidade de conta.
                </span>
              </p>
            )}
            {/* Converte receitas e despensa junto; o seletor só troca a compra. */}
            {insumo && (
              <Botao
                variante="terciaria"
                tamanho="sm"
                onClick={() => setTrocandoUnidade(true)}
              >
                Mudar a unidade de conta
              </Botao>
            )}
          </div>
        </div>

        {escolheModo && ultima && (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-label font-semibold text-ink">
              O que aconteceu?
            </legend>
            {(
              [
                {
                  valor: "COMPRA",
                  rotulo: "Comprei de novo, por este preço",
                  dica: "Entra como compra nova, com a data de hoje.",
                },
                {
                  valor: "CORRECAO",
                  rotulo: "Corrigir a última compra",
                  dica: `A de ${rotuloDia(dataISODe(new Date(ultima.dataMs)))} passa a ter este preço, e fica com a data dela.`,
                },
              ] as const
            ).map((opcao) => (
              <label
                key={opcao.valor}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-line-strong px-3 py-3"
              >
                <input
                  type="radio"
                  name="modo-da-escrita"
                  value={opcao.valor}
                  checked={modo === opcao.valor}
                  onChange={() => setModo(opcao.valor)}
                  className="mt-0.5 size-5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-label text-ink">
                    {opcao.rotulo}
                  </span>
                  <span className="block text-label text-ink-muted">
                    {opcao.dica}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {podeCalcular && <ResumoCusto custo={custo} perdaPercentual={perda} />}

        {podeCalcular && insumo && fichas && (
          <EfeitoDoPrecoDigitado
            insumo={insumo}
            custo={custo}
            fichas={fichas}
            materiais={materiais}
          />
        )}

        <details
          key={chaveAtual}
          open={temMaisDetalhes || erroNosDetalhes}
          className="group rounded-lg border border-line bg-surface"
        >
          <summary className="toque flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-subheading font-semibold text-ink">
            Mais detalhes
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="truncate text-label font-normal text-ink-muted group-open:hidden"
              >
                categoria, perda, marca, onde compra, estoque
              </span>
              <ChevronDown
                aria-hidden
                className="size-5 shrink-0 text-ink-muted transition-transform duration-150 ease-quart group-open:rotate-180"
                strokeWidth={1.75}
              />
            </span>
          </summary>

          <div className="space-y-4 border-t border-line px-4 py-4">
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
                sai das listas e da busca, mas continua nos produtos e nos
                pedidos antigos, para o histórico de custo não se perder.
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
                Arquivar material
              </Botao>
            </div>
          ))}
      </div>
    </Painel>
  );
}
