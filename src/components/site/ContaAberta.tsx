import {
  FaixaDeComposicao,
  Parcela,
} from "@/components/fichas/FaixaDeComposicao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { composicaoDoLote } from "@/lib/domain/custoFicha";
import { EXEMPLO } from "@/lib/domain/exemplo";
import { formatarMoeda } from "@/lib/domain/money";
import {
  calcularPrecoSugerido,
  somaTaxas,
  verificarPreco,
} from "@/lib/domain/precificacao";
import { cn } from "@/lib/utils/cn";

/**
 * O bloco "O custo do lote" do editor, com o cookie da página de venda
 * (`DECISOES.md#d173`). Todo número sai das funções do app sobre `EXEMPLO`;
 * nenhum é escrito aqui. A faixa e o ponto convivem porque é a reprodução do
 * editor, o único lugar em que o `MARCA.md` § 2.4 deixa (`#d126`).
 */
export function ContaAberta({
  className,
  parada = false,
}: {
  className?: string;
  /** Sem o movimento da `.conta-que-abre`: onde a conta é ilustração, e não abertura de página. */
  parada?: boolean;
}) {
  const { custo, parametros, rende, precoPraticado } = EXEMPLO;
  const segmentos = composicaoDoLote(custo);
  const sugerido = calcularPrecoSugerido(custo.custoUnitario, parametros);
  const { lucroUnitario } = verificarPreco(
    precoPraticado,
    custo.custoUnitario,
    somaTaxas(parametros),
  );

  return (
    <section
      id="conta"
      aria-labelledby="conta-titulo"
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-surface shadow-raised",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
        <h2
          id="conta-titulo"
          className="text-subheading font-semibold text-ink"
        >
          Exemplo · {EXEMPLO.nome}
        </h2>
        <p className="shrink-0 text-label text-ink-muted">
          rende {rende} unidades
        </p>
      </div>

      <div className="px-5 py-4">
        <dl className="flex flex-col gap-2 text-body">
          {segmentos.map((s) => (
            <Parcela
              key={s.rotulo}
              rotulo={s.rotulo}
              valor={Math.round(s.centavos / rende)}
              destaque={s.destaque}
            />
          ))}
        </dl>

        <FaixaDeComposicao
          segmentos={segmentos}
          className={cn("mt-4", !parada && "conta-que-abre")}
        />

        <div className="mt-4 flex items-baseline justify-between gap-4">
          <p className="text-label font-medium text-ink-muted">
            Custo por unidade
          </p>
          <Dinheiro centavos={custo.custoUnitario} tamanho="xl" />
        </div>
      </div>

      {sugerido.ok && (
        <div className="sobre-marca bg-brand-700 px-5 py-5 text-on-brand">
          <p className="text-label font-medium text-ink-muted">
            Preço sugerido · margem {parametros.margemDesejada}% + maquininha{" "}
            {parametros.taxaCartaoConsiderada}%
          </p>
          <div className="mt-1 flex items-center gap-3">
            <Dinheiro centavos={sugerido.precoArredondado} tamanho="xl" />
            {/* O ponto marca o número que decide, como no painel do editor. */}
            <span
              aria-hidden
              className={cn(
                "size-3 shrink-0 rounded-full bg-accent-500",
                !parada && "conta-que-abre-ponto",
              )}
            />
          </div>
          <p className="mt-3 max-w-[48ch] text-label text-ink-muted">
            No preço praticado de{" "}
            <span className="num font-semibold text-ink">
              {formatarMoeda(precoPraticado)}
            </span>{" "}
            sobram{" "}
            <span className="num font-semibold text-ink">
              {formatarMoeda(lucroUnitario)}
            </span>{" "}
            pra você, por unidade, depois da maquininha.
          </p>
        </div>
      )}
    </section>
  );
}
