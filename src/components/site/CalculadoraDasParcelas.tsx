"use client";

import { TrendingDown, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { FaixaDeComposicao } from "@/components/fichas/FaixaDeComposicao";
import { Porcao } from "@/components/marca/Marca";
import { Anuncio } from "@/components/site/CalculadoraDaPorta";
import { Campo } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Pilulas } from "@/components/ui/Pilulas";
import {
  contaDasParcelas,
  entradaDasParcelas,
  EXEMPLOS_DAS_PARCELAS,
  type ContaDasParcelas,
  type DoceDasParcelas,
  type EntradaDasParcelas,
  type ParcelasDoCusto,
  type UnidadeDeVenda,
} from "@/lib/domain/calculadora";
import { formatarMoeda, formatarPercentual } from "@/lib/domain/money";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * A conta sem receita da página de doces (spec 176): as cinco parcelas em
 * reais, na unidade em que ela vende, mais margem, taxas e o preço de hoje. A
 * conta é `contaDasParcelas`; aqui só se desenha. Nada é guardado: o rascunho
 * da porta (`#d189`) tem forma de receita, e esta conta não tem.
 */

const UNIDADES: { valor: UnidadeDeVenda; rotulo: string }[] = [
  { valor: "unidade", rotulo: "Unidade" },
  { valor: "cento", rotulo: "Cento" },
  { valor: "quilo", rotulo: "Quilo" },
  { valor: "pote", rotulo: "Pote" },
];

const CAMPOS: { chave: keyof ParcelasDoCusto; rotulo: string; dica: string }[] =
  [
    {
      chave: "custoInsumos",
      rotulo: "Ingredientes",
      dica: "O que a receita leva, dividido pelo que ela rende.",
    },
    {
      chave: "custoEmbalagem",
      rotulo: "Embalagem",
      dica: "Tudo que sai junto: forminha, pote, caixa, etiqueta.",
    },
    {
      chave: "custoMaoDeObra",
      rotulo: "Sua hora",
      dica: "O tempo de fazer, vezes o valor da sua hora.",
    },
    {
      chave: "custoEnergiaGas",
      rotulo: "Gás e energia",
      dica: "O forno e o fogão pelo tempo da receita.",
    },
    {
      chave: "custoIndireto",
      rotulo: "Despesas fixas",
      dica: "O mês dividido pelo que você vende nele.",
    },
  ];

/** "40" e "4,5" como ela digita; a vírgula pode ficar no fim enquanto digita. */
const textoDe = (n: number) => n.toLocaleString("pt-BR");
const limpar = (texto: string) =>
  texto
    .replace(".", ",")
    .replace(/[^\d,]/g, "")
    .replace(/,(?=.*,)/g, "");
const numeroDe = (texto: string) => Number(texto.replace(",", ".")) || 0;

/**
 * Com `doce` (spec 178), a página já é daquele doce: a conta começa no exemplo
 * dele, na unidade dele, e as pílulas de doce e de unidade não aparecem.
 */
export function CalculadoraDasParcelas({
  doce,
  className,
}: {
  doce?: DoceDasParcelas;
  className?: string;
}) {
  const [entrada, setEntrada] = useState(() => entradaDasParcelas(doce));
  const [exemplo, setExemplo] = useState<string>(
    doce ?? EXEMPLOS_DAS_PARCELAS[0].valor,
  );
  const [unidade, setUnidade] = useState<UnidadeDeVenda>(
    () =>
      EXEMPLOS_DAS_PARCELAS.find((e) => e.valor === doce)?.unidade ?? "unidade",
  );
  const [margem, setMargem] = useState(() => textoDe(entrada.margemDesejada));
  const [taxas, setTaxas] = useState(() => textoDe(entrada.taxas));
  const conta = contaDasParcelas(entrada);

  const mudar = (parcial: Partial<EntradaDasParcelas>) =>
    setEntrada((atual) => ({ ...atual, ...parcial }));

  const comecarPelo = (valor: string) => {
    const e = EXEMPLOS_DAS_PARCELAS.find((x) => x.valor === valor);
    if (!e) return;
    setExemplo(valor);
    setUnidade(e.unidade);
    setTaxas(textoDe(e.taxas));
    mudar({ ...e.parcelas, taxas: e.taxas });
  };

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {!doce && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p aria-hidden className="text-label font-medium text-ink">
              Começar pelo exemplo do
            </p>
            <Pilulas
              rotulo="Começar pelo exemplo do"
              opcoes={EXEMPLOS_DAS_PARCELAS}
              valor={exemplo}
              aoMudar={comecarPelo}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p aria-hidden className="text-label font-medium text-ink">
              Você vende por
            </p>
            <Pilulas
              rotulo="Você vende por"
              opcoes={UNIDADES}
              valor={unidade}
              aoMudar={setUnidade}
            />
            <p className="text-label text-ink-muted">
              Só muda as palavras: os valores são do que você vende.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-4">
        {CAMPOS.map((c) => (
          <CampoMoeda
            key={c.chave}
            rotulo={c.rotulo}
            valor={entrada[c.chave]}
            aoMudar={(centavos) => mudar({ [c.chave]: centavos })}
            dica={c.dica}
          />
        ))}
      </div>

      <div className="grid gap-5 border-t border-line pt-7 sm:grid-cols-2 sm:gap-x-4">
        <Campo
          rotulo="Margem"
          inputMode="decimal"
          autoComplete="off"
          maxLength={5}
          sufixo="%"
          value={margem}
          onChange={(e) => {
            const texto = limpar(e.target.value);
            setMargem(texto);
            mudar({ margemDesejada: numeroDe(texto) });
          }}
          dica="O que você quer que sobre do preço."
          className="num"
        />
        <Campo
          rotulo="Taxas"
          inputMode="decimal"
          autoComplete="off"
          maxLength={5}
          sufixo="%"
          value={taxas}
          onChange={(e) => {
            const texto = limpar(e.target.value);
            setTaxas(texto);
            mudar({ taxas: numeroDe(texto) });
          }}
          dica="Maquininha, aplicativo, pagamento online, somados."
          className="num"
        />
        <CampoMoeda
          rotulo={`Quanto cobra hoje, por ${unidade}`}
          valor={entrada.precoHoje ?? 0}
          aoMudar={(preco) => mudar({ precoHoje: preco > 0 ? preco : null })}
          dica="Opcional. A conta diz quanto ele deixa."
          className="sm:col-span-2"
        />
      </div>

      <Resultado conta={conta} unidade={unidade} />
    </div>
  );
}

function Valor({
  centavos,
  className,
}: {
  centavos: Centavos;
  className?: string;
}) {
  return (
    <span
      className={cn("num font-semibold whitespace-nowrap text-ink", className)}
    >
      {formatarMoeda(centavos)}
    </span>
  );
}

function Resultado({
  conta,
  unidade,
}: {
  conta: ContaDasParcelas;
  unidade: UnidadeDeVenda;
}) {
  const { custo, segmentos, preco, sugerido, hoje } = conta;

  const anuncio =
    custo === 0
      ? "Falta o custo das parcelas."
      : preco.ok
        ? `Custa ${formatarMoeda(custo)} por ${unidade}. Cobre ${formatarMoeda(preco.precoArredondado)}.`
        : "Margem e taxas passam de 100% do preço.";

  return (
    <section
      aria-labelledby="parcelas-resultado"
      className="overflow-hidden rounded-lg border border-line bg-surface shadow-raised"
    >
      <Anuncio frase={anuncio} />
      <h3 id="parcelas-resultado" className="sr-only">
        Sua conta
      </h3>

      {custo === 0 ? (
        <p className="flex items-start gap-2 px-5 py-6 text-body text-ink">
          <TriangleAlert
            aria-hidden
            strokeWidth={1.75}
            className="mt-0.5 size-5 shrink-0 text-attention"
          />
          Ponha o custo de cada parcela e a conta aparece aqui.
        </p>
      ) : (
        <>
          <div className="px-5 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-label font-medium text-ink-muted">
                Custa, por {unidade}
              </p>
              <Dinheiro centavos={custo} tamanho="lg" />
            </div>
            <FaixaDeComposicao segmentos={segmentos} className="mt-3" />
          </div>

          {preco.ok && sugerido ? (
            <div className="sobre-marca bg-brand-700 px-5 py-5 text-on-brand">
              <p className="text-label font-medium text-ink-muted">Cobre</p>
              <div className="mt-1">
                <Dinheiro centavos={preco.precoArredondado} tamanho="xl" />
              </div>
              <p className="mt-3 text-label text-ink-muted">
                {/* A porção rosa, a única da página (`#d381`). */}
                sobram{" "}
                <Porcao>
                  <Valor centavos={sugerido.lucroUnitario} />
                </Porcao>{" "}
                pra você, por {unidade}, depois das taxas.
              </p>
            </div>
          ) : (
            <p className="flex items-start gap-2 border-t border-line px-5 py-5 text-body text-ink">
              <TriangleAlert
                aria-hidden
                strokeWidth={1.75}
                className="mt-0.5 size-5 shrink-0 text-attention"
              />
              O que você quer que sobre mais as taxas passam de 100% do preço.
              Não existe preço que caiba nisso: diminua um dos dois.
            </p>
          )}

          {hoje && (
            <PrecoDeHoje
              hoje={hoje}
              abaixo={!sugerido || hoje.lucroUnitario < sugerido.lucroUnitario}
            />
          )}
        </>
      )}
    </section>
  );
}

/** Perder ou ficar abaixo leva o ícone; nunca só a cor (`#d188`). */
function PrecoDeHoje({
  hoje,
  abaixo,
}: {
  hoje: NonNullable<ContaDasParcelas["hoje"]>;
  abaixo: boolean;
}) {
  const perde = hoje.lucroUnitario < 0;
  return (
    <p className="flex items-start gap-2 px-5 py-4 text-body text-ink">
      {(perde || abaixo) && (
        <TrendingDown
          aria-hidden
          strokeWidth={1.75}
          className="mt-1 size-4 shrink-0 text-negative"
        />
      )}
      {perde ? (
        <span>
          No seu preço de hoje, cada venda tira{" "}
          <Valor centavos={-hoje.lucroUnitario} className="text-negative" /> do
          seu bolso.
        </span>
      ) : (
        <span>
          No seu preço de hoje sobram <Valor centavos={hoje.lucroUnitario} />,{" "}
          {formatarPercentual(hoje.margemReal, 0)} do preço.
        </span>
      )}
    </p>
  );
}
