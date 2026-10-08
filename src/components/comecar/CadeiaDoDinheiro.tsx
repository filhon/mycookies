import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import {
  Calculator,
  ChevronRight,
  PenLine,
  TrendingDown,
  TriangleAlert,
} from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { rotuloDaQuantidade } from "@/lib/domain/custoFicha";
import { rotuloMes } from "@/lib/domain/datas";
import { formatarCustoUnitario } from "@/lib/domain/money";
import { custoDeReferencia, formatarQuantidade } from "@/lib/domain/unidades";
import type { DadosDaCadeia } from "@/lib/hooks/useCadeia";
import { cn } from "@/lib/utils/cn";

/**
 * Quem faz cada elo: a linha que o `PRODUCT.md` traça entre o trabalho dela e
 * o trabalho do sistema. É o que responde, antes de qualquer tela, por que
 * cadastrar o pacote de farinha resolve um problema de preço.
 */
type Autor = "VOCE" | "SISTEMA";

interface Elo {
  titulo: string;
  /** Uma frase, e nenhum número de exemplo: ele envelhece e passa a
      contradizer a tela. O número dela vem embaixo, lido da conta (`#d296`). */
  frase: string;
  autor: Autor;
  /** O verbo específico deste elo. O ícone diz o autor; isto diz o quê. */
  papel: string;
  tela: string;
  href: Route;
}

const ELOS: readonly Elo[] = [
  {
    titulo: "O que você compra",
    frase:
      "O pacote de farinha, a barra de chocolate, o saquinho da embalagem: o que vem dentro de cada um e o que você pagou.",
    autor: "VOCE",
    papel: "Você preenche",
    tela: "Materiais",
    href: "/insumos",
  },
  {
    titulo: "Quanto custa cada grama",
    frase:
      "O preço do pacote sozinho não calcula nada. Dividido pelo que vem dentro, ele vira o número que todo o resto usa.",
    autor: "SISTEMA",
    papel: "O sistema calcula",
    tela: "Materiais",
    href: "/insumos",
  },
  {
    titulo: "Quanto custa o doce pronto",
    frase:
      "O produto diz o que entra e quanto rende. O custo do lote se divide pelo rendimento, e cada unidade passa a ter um número atrás dela.",
    autor: "SISTEMA",
    papel: "O sistema calcula",
    tela: "Produtos",
    href: "/fichas",
  },
  {
    titulo: "Por quanto vale a pena vender",
    frase:
      "Com o custo na mão, o preço deixa de ser chute: você escolhe quanto quer que sobre, e vê quanto sobra de verdade.",
    autor: "VOCE",
    papel: "Você decide",
    tela: "Produtos",
    href: "/fichas",
  },
  {
    titulo: "O que foi combinado com a cliente",
    frase:
      "A encomenda guarda o preço do dia em que vocês combinaram. Se a farinha subir na semana seguinte, o que foi prometido continua valendo.",
    autor: "VOCE",
    papel: "Você registra",
    tela: "Pedidos",
    href: "/pedidos",
  },
  {
    titulo: "O que de fato entrou no mês",
    frase:
      "Vendido não é recebido. O valor entra no caixa no dia em que você diz que o dinheiro caiu, e não no dia da entrega.",
    autor: "SISTEMA",
    papel: "O sistema fecha",
    tela: "Caixa",
    href: "/financeiro",
  },
];

function Forte({ children }: { children: ReactNode }) {
  return <strong className="font-semibold">{children}</strong>;
}

/**
 * A linha do número de cada elo, na ordem de `ELOS` (`#d296`). Elo sem dado
 * fica `null`, e a cadeia mostra só a frase: nunca um "R$ 0,00" inventado.
 */
function linhasDaCadeia({
  resumo,
  ficha,
  material,
}: DadosDaCadeia): ReactNode[] {
  const mes = resumo && rotuloMes(resumo.competencia);
  const vendidos = ficha && resumo?.produtos[ficha.id]?.quantidade;
  const preco = ficha?.precificacao;

  const referencia =
    material &&
    custoDeReferencia(material.custoUnidadeBaseCorrigido, material.unidadeBase);
  const valorReferencia =
    referencia &&
    (referencia.rotulo === "a unidade" ? (
      // Fracionário (luva a R$ 0,0875): o `Dinheiro` arredondaria ao centavo.
      <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
        <span className="text-micro font-medium text-ink-muted">R$</span>
        <span className="num font-semibold">
          {formatarCustoUnitario(referencia.centavos).slice(3)}
        </span>
      </span>
    ) : (
      <Dinheiro centavos={referencia.centavos} />
    ));

  return [
    material && material.precoCompra > 0 && (
      <>
        Você paga <Dinheiro centavos={material.precoCompra} /> no pacote de{" "}
        <span className="num">
          {formatarQuantidade(material.quantidadeBase, material.unidadeBase)}
        </span>{" "}
        de <Forte>{material.nome}</Forte>.
      </>
    ),
    referencia && referencia.centavos > 0 && (
      <>
        Sai a {valorReferencia} {referencia.rotulo}
        {material.perdaPercentual > 0 && ", já contando a perda"}.
      </>
    ),
    ficha && ficha.custoUnitario > 0 && (
      <>
        {ficha.unidadeRendimento === "un" ? (
          <>
            Um <Forte>{ficha.nome}</Forte> custa{" "}
            <Dinheiro centavos={ficha.custoUnitario} />, num lote de{" "}
            <span className="num">{ficha.rendimento}</span>.
          </>
        ) : (
          // Em grama ou porção, "um" não é a unidade: o lote é que se conta.
          <>
            Um lote de <Forte>{ficha.nome}</Forte> custa{" "}
            <Dinheiro centavos={ficha.custoTotalLote} /> e rende{" "}
            <span className="num">
              {rotuloDaQuantidade(ficha.rendimento, ficha.unidadeRendimento)}
            </span>
            .
          </>
        )}
        {ficha.custoDesatualizado && (
          <span className="mt-1 flex items-center gap-1 text-label font-medium text-attention">
            <TriangleAlert
              aria-hidden
              className="size-4 shrink-0"
              strokeWidth={1.75}
            />
            Custo por refazer
          </span>
        )}
      </>
    ),
    preco && preco.precoVenda > 0 && (
      <>
        Você vende por <Dinheiro centavos={preco.precoVenda} />
        {preco.lucroUnitario < 0 ? (
          <>
            , e falta{" "}
            <span className="inline-flex items-baseline gap-1 text-negative">
              <TrendingDown
                aria-hidden
                className="size-4 shrink-0 self-center"
                strokeWidth={1.75}
              />
              <Dinheiro centavos={preco.lucroUnitario} comSinal />
            </span>{" "}
            pra cobrir o custo.
          </>
        ) : (
          <>
            , e sobram{" "}
            {/* O número que decide, e o único âmbar da seção (`DESIGN.md`,
                Signature). */}
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-2.5 shrink-0 rounded-full bg-accent-500"
              />
              <Dinheiro centavos={preco.lucroUnitario} />
            </span>{" "}
            pra você.
          </>
        )}
      </>
    ),
    resumo && resumo.qtdPedidos > 0 && (
      <>
        Em {mes}: <span className="num">{resumo.qtdPedidos}</span>{" "}
        {resumo.qtdPedidos === 1 ? "encomenda paga" : "encomendas pagas"}
        {vendidos ? (
          <>
            , com{" "}
            <span className="num">{vendidos.toLocaleString("pt-BR")}</span>{" "}
            <Forte>{ficha.nome}</Forte>
          </>
        ) : null}
        .
      </>
    ),
    resumo && resumo.entradas > 0 && (
      <>
        Entraram <Dinheiro centavos={resumo.entradas} /> no caixa em {mes}.
      </>
    ),
  ];
}

/**
 * A resposta para "por que preciso cadastrar tudo isso".
 *
 * Seis elos em fio vertical, e nunca em fileira horizontal: em 360px seis
 * caixas lado a lado ou rolam para o lado ou viram seis palavras cortadas.
 * O fio é o argumento — cada elo só existe porque o de cima existe —, e a
 * ordem é a mesma dos cinco passos, vista pelo lado do dinheiro em vez de
 * pelo lado das telas.
 *
 * Com a conta lida, cada elo ganha embaixo da frase o número dela, seguindo
 * um produto do pacote ao caixa (`#d296`). A frase chega pronta; o esqueleto
 * fica só na linha do número.
 */
export function CadeiaDoDinheiro({ dados }: { dados: DadosDaCadeia }) {
  const linhas = dados.carregando ? null : linhasDaCadeia(dados);
  const { ficha } = dados;

  return (
    <ol className="overflow-hidden rounded-lg border border-line bg-surface">
      {ELOS.map((elo, indice) => {
        const ultimo = indice === ELOS.length - 1;
        const Icone = elo.autor === "VOCE" ? PenLine : Calculator;
        const linha = linhas?.[indice];
        // Os dois elos do produto abrem o produto. Materiais não abre um item
        // pela URL, e os do material continuam na lista.
        const href =
          ficha && elo.tela === "Produtos"
            ? (`/fichas/${ficha.id}` as Route)
            : elo.href;

        return (
          <li key={elo.titulo}>
            {/* A linha inteira é o alvo: mirar numa palavra em pé, com uma mão
                só, é o que o `PRODUCT.md` diz para não pedir. */}
            <Link
              href={href}
              className="flex gap-3 px-4 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
            >
              {/* O fio nasce embaixo do disco e vai até o pé da linha, onde
                  encosta no disco seguinte: o padding vertical mora na coluna
                  do texto justamente para não abrir buraco no fio. */}
              <span className="flex w-7 shrink-0 flex-col items-center pt-4">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full",
                    elo.autor === "VOCE"
                      ? "border border-line-strong text-ink-muted"
                      : "bg-brand-100 text-brand-ink",
                  )}
                >
                  <Icone aria-hidden className="size-3.5" strokeWidth={1.75} />
                </span>
                {!ultimo && (
                  <span aria-hidden className="mt-1 w-px flex-1 bg-line" />
                )}
              </span>

              <span className="min-w-0 flex-1 py-4">
                <span className="block text-body font-semibold text-ink">
                  {elo.titulo}
                </span>
                <span className="mt-1 block max-w-[56ch] text-label text-ink-muted">
                  {elo.frase}
                </span>

                {linhas === null ? (
                  <Esqueleto className="mt-2 h-5 w-3/4" />
                ) : (
                  linha && (
                    <span className="mt-2 block max-w-[56ch] text-body text-ink">
                      {linha}
                    </span>
                  )
                )}

                {/* Quem faz e onde mora, na mesma linha. O papel é texto e não
                    só o ícone do disco: cor e desenho não carregam significado
                    sozinhos. */}
                <span className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-micro font-medium text-ink-subtle">
                    {elo.papel}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-label font-medium text-brand-ink">
                    {elo.tela}
                    <ChevronRight
                      aria-hidden
                      className="size-4"
                      strokeWidth={2}
                    />
                  </span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
