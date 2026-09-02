import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  TriangleAlert,
} from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import type { ParcelasDoAgregado } from "@/lib/domain/caixa";
import { formatarMoeda } from "@/lib/domain/money";

/**
 * O resultado do mês, na ordem em que a pergunta é feita: primeiro o que
 * sobrou, que é o que a Maynara veio saber, e só depois as duas parcelas que
 * produziram esse número.
 *
 * Não são três cartões iguais lado a lado. Entrou e saiu não são irmãos de
 * sobrou: são as contas que levam até ele, e a hierarquia da tela precisa dizer
 * isso antes que ela leia qualquer cifra (`PRODUCT.md`, princípio 5).
 */
export function ResultadoDoMes({ parcelas }: { parcelas: ParcelasDoAgregado }) {
  const { entradas, saidas, lucro, custoTaxasPagamento } = parcelas;
  const noPrejuizo = lucro < 0;

  return (
    <section
      aria-labelledby="resultado-do-mes"
      className="overflow-hidden rounded-lg border border-line bg-surface"
    >
      <div className="px-5 pb-5 pt-5">
        <h2
          id="resultado-do-mes"
          className="text-label font-medium text-ink-muted"
        >
          {noPrejuizo ? "O que faltou no mês" : "O que sobrou no mês"}
        </h2>

        <p className="mt-1 flex items-center gap-2">
          <Dinheiro centavos={lucro} tamanho="xl" comSinal />
          {/* O sinal e a cor não bastam: vinho da marca e vermelho de erro são
              vizinhos de matiz, então o prejuízo carrega ícone também. */}
          {noPrejuizo && (
            <TriangleAlert
              aria-hidden
              className="size-5 shrink-0 text-negative"
              strokeWidth={2}
            />
          )}
        </p>

        <p className="mt-1.5 max-w-[46ch] text-label text-ink-muted">
          {noPrejuizo
            ? "Saiu mais do que entrou. A conta já desconta a taxa da maquininha."
            : "É o que ficou depois de tudo que saiu e da taxa da maquininha."}
        </p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
        <Parcela
          rotulo="Entrou"
          valor={entradas}
          icone={
            <ArrowDownLeft
              aria-hidden
              className="size-4 text-positive"
              strokeWidth={2}
            />
          }
        />
        <Parcela
          rotulo="Saiu"
          valor={saidas}
          icone={
            <ArrowUpRight
              aria-hidden
              className="size-4 text-negative"
              strokeWidth={2}
            />
          }
        />
      </div>

      <MaquininhaComeu valor={custoTaxasPagamento} houveVenda={entradas > 0} />
    </section>
  );
}

function Parcela({
  rotulo,
  valor,
  icone,
}: {
  rotulo: string;
  valor: number;
  icone: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <p className="flex items-center gap-1.5 text-label font-medium text-ink-muted">
        {icone}
        {rotulo}
      </p>
      <p className="mt-0.5">
        <Dinheiro centavos={valor} tamanho="lg" />
      </p>
    </div>
  );
}

/**
 * O número que ninguém calcula sozinha.
 *
 * O Módulo 2 inteiro existe para tornar essa taxa visível na hora de dar o
 * preço; aqui ela aparece somada no mês, com linha própria em vez de dissolvida
 * entre aluguel e farinha (`DECISOES.md#d24`).
 */
function MaquininhaComeu({
  valor,
  houveVenda,
}: {
  valor: number;
  houveVenda: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-t border-line bg-sunken px-5 py-4">
      <CreditCard
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-ink-muted"
        strokeWidth={1.75}
      />
      <div className="min-w-0">
        <h3 className="text-label font-medium text-ink-muted">
          O que a maquininha comeu
        </h3>

        {valor > 0 ? (
          <>
            <p className="num mt-0.5 text-heading font-semibold text-ink">
              {formatarMoeda(valor)}
            </p>
            <p className="mt-1 max-w-[52ch] text-label text-ink-muted">
              Sai da taxa de cada forma de pagamento e já está descontada do
              resultado acima. É por isso que ela entra no preço das suas
              fichas.{" "}
              <Link
                href="/configuracao"
                className="font-medium text-wine-700 underline underline-offset-2 dark:text-wine-300"
              >
                Ver minhas taxas
              </Link>
            </p>
          </>
        ) : (
          <p className="mt-1 max-w-[52ch] text-label text-ink-muted">
            {houveVenda
              ? "Nenhuma venda deste mês passou por cartão, então a maquininha não ficou com nada."
              : "Assim que você lançar uma venda no cartão, o que a maquininha fica aparece aqui."}
          </p>
        )}
      </div>
    </div>
  );
}
