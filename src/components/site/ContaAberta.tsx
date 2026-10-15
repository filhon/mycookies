import {
  FaixaDeComposicao,
  Parcela,
} from "@/components/fichas/FaixaDeComposicao";
import { Porcao } from "@/components/marca/Marca";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { composicaoDoLote } from "@/lib/domain/custoFicha";
import { EXEMPLO, type ExemploDePagina } from "@/lib/domain/exemplo";
import { formatarMoeda } from "@/lib/domain/money";
import {
  calcularPrecoSugerido,
  somaTaxas,
  verificarPreco,
} from "@/lib/domain/precificacao";
import { cn } from "@/lib/utils/cn";

/**
 * O bloco "O custo do lote" do editor, com o cookie da página de venda
 * (`DECISOES.md#d173`) ou o doce de uma página do preço (spec 068). Todo
 * número sai das funções do app sobre o exemplo; nenhum é escrito aqui. A
 * faixa e a porção rosa convivem porque é a reprodução do editor, o único
 * lugar em que o `MARCA.md` § 2.4 deixa (`#d126`).
 */
export function ContaAberta({
  className,
  parada = false,
  exemplo = EXEMPLO,
  dela = false,
  unidade = { singular: "unidade", plural: "unidades" },
}: {
  className?: string;
  exemplo?: ExemploDePagina;
  /** O cookie que ela calculou, e não o exemplo (spec 155, `#d364`). */
  dela?: boolean;
  /** A unidade em que o doce se vende: o cento, o quilo, o pote. */
  unidade?: { singular: string; plural: string };
  /** Sem o movimento da `.conta-que-abre`: onde a conta é ilustração, e não abertura de página. */
  parada?: boolean;
}) {
  const { custo, parametros, rende, precoPraticado } = exemplo;
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
          {dela
            ? `O seu ${exemplo.nome.toLocaleLowerCase("pt-BR")}`
            : `Exemplo · ${exemplo.nome}`}
        </h2>
        <p className="shrink-0 text-label text-ink-muted">
          rende {rende}
          {` ${rende === 1 ? unidade.singular : unidade.plural}`}
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
            {`Custo por ${unidade.singular}`}
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
          <div className="mt-1">
            <Dinheiro centavos={sugerido.precoArredondado} tamanho="xl" />
          </div>
          <p className="mt-3 max-w-[48ch] text-label text-ink-muted">
            {/* Sem preço de hoje no rascunho, o praticado é o sugerido. */}
            {dela && precoPraticado === sugerido.precoArredondado ? (
              "No preço sugerido"
            ) : (
              <>
                No preço praticado de{" "}
                <span className="num font-semibold text-ink">
                  {formatarMoeda(precoPraticado)}
                </span>
              </>
            )}{" "}
            sobram{" "}
            {/* A porção rosa, como no painel do editor; prejuízo não leva. */}
            {lucroUnitario > 0 ? (
              <Porcao>
                <span className="num font-semibold text-ink">
                  {formatarMoeda(lucroUnitario)}
                </span>
              </Porcao>
            ) : (
              <span className="num font-semibold text-ink">
                {formatarMoeda(lucroUnitario)}
              </span>
            )}{" "}
            {`pra você, por ${unidade.singular}, depois da maquininha.`}
          </p>
        </div>
      )}
    </section>
  );
}
