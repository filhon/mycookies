import Link from "next/link";
import type { Route } from "next";
import { Calculator, ChevronRight, PenLine } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Quem faz cada elo: a linha que o `PRODUCT.md` traça entre o trabalho dela e
 * o trabalho do sistema. É o que responde, antes de qualquer tela, por que
 * cadastrar o pacote de farinha resolve um problema de preço.
 */
type Autor = "VOCE" | "SISTEMA";

interface Elo {
  titulo: string;
  /** Uma frase, e nenhum número: número de exemplo numa página de ajuda
      envelhece e passa a contradizer a tela. */
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
    tela: "Insumos",
    href: "/insumos",
  },
  {
    titulo: "Quanto custa cada grama",
    frase:
      "O preço do pacote sozinho não calcula nada. Dividido pelo que vem dentro, ele vira o número que todo o resto usa.",
    autor: "SISTEMA",
    papel: "O sistema calcula",
    tela: "Insumos",
    href: "/insumos",
  },
  {
    titulo: "Quanto custa o doce pronto",
    frase:
      "A receita diz o que entra e quanto rende. O custo do lote se divide pelo rendimento, e cada unidade passa a ter um número atrás dela.",
    autor: "SISTEMA",
    papel: "O sistema calcula",
    tela: "Fichas",
    href: "/fichas",
  },
  {
    titulo: "Por quanto vale a pena vender",
    frase:
      "Com o custo na mão, o preço deixa de ser chute: você escolhe quanto quer que sobre, e vê quanto sobra de verdade.",
    autor: "VOCE",
    papel: "Você decide",
    tela: "Fichas",
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

/**
 * A resposta para "por que preciso cadastrar tudo isso".
 *
 * Seis elos em fio vertical, e nunca em fileira horizontal: em 360px seis
 * caixas lado a lado ou rolam para o lado ou viram seis palavras cortadas.
 * O fio é o argumento — cada elo só existe porque o de cima existe —, e a
 * ordem é a mesma dos cinco passos, vista pelo lado do dinheiro em vez de
 * pelo lado das telas.
 */
export function CadeiaDoDinheiro() {
  return (
    <ol className="overflow-hidden rounded-lg border border-line bg-surface">
      {ELOS.map((elo, indice) => {
        const ultimo = indice === ELOS.length - 1;
        const Icone = elo.autor === "VOCE" ? PenLine : Calculator;

        return (
          <li key={elo.titulo}>
            {/* A linha inteira é o alvo: mirar numa palavra em pé, com uma mão
                só, é o que o `PRODUCT.md` diz para não pedir. */}
            <Link
              href={elo.href}
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
                      : "bg-wine-100 text-wine-700 dark:text-wine-300",
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

                {/* Quem faz e onde mora, na mesma linha. O papel é texto e não
                    só o ícone do disco: cor e desenho não carregam significado
                    sozinhos. */}
                <span className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-micro font-medium text-ink-subtle">
                    {elo.papel}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-label font-medium text-wine-700 dark:text-wine-300">
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
