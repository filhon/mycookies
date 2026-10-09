"use client";

import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { EfeitoDoPrecoDigitado } from "@/components/insumos/EfeitoDoPreco";
import { formatarReferencia } from "@/components/insumos/FichaDoMaterial";
import { Botao } from "@/components/ui/Botao";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { classesBotao } from "@/components/ui/estilosBotao";
import { Painel } from "@/components/ui/Painel";
import { fraseDaContagem } from "./LinhaCompra";
import { pedirAcao } from "@/lib/acaoPedida";
import { calcularCustoInsumo, comprasDoInsumo } from "@/lib/domain/custoInsumo";
import { dataISODe, rotuloDia, rotuloDiaCurto } from "@/lib/domain/datas";
import { contagemDoInsumo, rotuloDeIdade } from "@/lib/domain/estoque";
import { demandaPorPedido, quantidadeFisica } from "@/lib/domain/listaCompras";
import { formatarMoeda } from "@/lib/domain/money";
import type { ReservaDoInsumo } from "@/lib/domain/producao";
import { custoDeReferencia, formatarQuantidade } from "@/lib/domain/unidades";
import type {
  Centavos,
  DataISO,
  FichaTecnica,
  Insumo,
  ItemListaCompras,
  Pedido,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/** Folga de ponto flutuante, a mesma da montagem. */
const FOLGA = 1e-6;

/**
 * O porquê de um item do carrinho (`#d303`): a conta, de onde vem, o preço e o
 * que o preço novo faz nos produtos. A linha diz o que pôr no carrinho; isto é
 * para quando ela quer entender, e por isso cabe inteiro, sem cortar frase.
 *
 * Um só por tela, montado sempre (o `Painel` dirige a transição): `item` é o
 * último aberto, para a folha sair com o conteúdo dentro.
 */
export function PorqueDoItem({
  aberto,
  aoFechar,
  item,
  insumo,
  pedidos,
  fichas,
  materiais,
  reservaPara,
  hoje,
  aoSalvarPreco,
}: {
  aberto: boolean;
  aoFechar: () => void;
  item: ItemListaCompras | undefined;
  insumo: Insumo | undefined;
  /** Os pedidos que entraram na lista gravada. */
  pedidos: Pedido[];
  fichas: FichaTecnica[];
  materiais: Insumo[];
  reservaPara: ReservaDoInsumo["fichas"] | undefined;
  hoje: DataISO;
  aoSalvarPreco: (insumo: Insumo, preco: Centavos) => void;
}) {
  const [preco, setPreco] = useState(insumo?.precoCompra ?? 0);
  // Cada abertura nasce com o preço gravado: o digitado e não salvo não volta.
  const [abertoAntes, setAbertoAntes] = useState(aberto);
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto);
    if (aberto) setPreco(insumo?.precoCompra ?? 0);
  }

  const mudou = !!insumo && preco > 0 && preco !== insumo.precoCompra;

  return (
    <Painel
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={item?.nome ?? ""}
      descricao={item ? descricaoDoItem(item, insumo) : undefined}
      rodape={
        insumo && (
          <Botao
            variante="primaria"
            tamanho="lg"
            larguraTotal
            disabled={!mudou}
            onClick={() => {
              aoSalvarPreco(insumo, preco);
              aoFechar();
            }}
          >
            Salvar preço
          </Botao>
        )
      }
    >
      {item && (
        <div className="space-y-8">
          <AConta item={item} insumo={insumo} hoje={hoje} />
          <DeOndeVem
            item={item}
            pedidos={pedidos}
            fichas={fichas}
            reservaPara={reservaPara}
          />
          {insumo && (
            <OPreco
              insumo={insumo}
              pacotes={item.quantidadePacotes}
              preco={preco}
              aoMudar={setPreco}
              mudou={mudou}
              fichas={fichas}
              materiais={materiais}
            />
          )}
          {insumo && (
            <Link
              href="/insumos"
              onClick={() => pedirAcao("abrir-material", insumo)}
              className={classesBotao({
                variante: "terciaria",
                tamanho: "sm",
                className: "-ml-3",
              })}
            >
              Abrir o material
            </Link>
          )}
        </div>
      )}
    </Painel>
  );
}

function tamanhoDoPacote(insumo: Insumo | undefined): string | null {
  return insumo
    ? `${insumo.quantidadeCompra.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${insumo.unidadeCompra}`
    : null;
}

function descricaoDoItem(item: ItemListaCompras, insumo?: Insumo): string {
  const n = item.quantidadePacotes;
  const tamanho = tamanhoDoPacote(insumo);
  return `${n} ${n === 1 ? "pacote" : "pacotes"}${tamanho ? ` de ${tamanho}` : ""} · ${formatarMoeda(item.custoEstimado)}`;
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo}>
      <h3 className="text-subheading font-semibold text-ink">{titulo}</h3>
      {children}
    </section>
  );
}

/** Uma linha da conta: o nome à esquerda, o número tabular à direita. */
function Parcela({
  rotulo,
  valor,
  nota,
  forte = false,
  dentro = false,
}: {
  rotulo: string;
  valor: string;
  nota?: string | null;
  forte?: boolean;
  /** Parte de "precisa": recuada e em tinta baixa. */
  dentro?: boolean;
}) {
  return (
    <div className={cn("py-2", dentro && "py-1 pl-4")}>
      <div className="flex items-baseline justify-between gap-4">
        <dt
          className={cn(
            "min-w-0",
            dentro ? "text-label text-ink-muted" : "text-body text-ink",
            forte && "font-semibold",
          )}
        >
          {rotulo}
        </dt>
        <dd
          className={cn(
            "num shrink-0 text-right",
            dentro
              ? "text-label text-ink-muted"
              : "text-body font-semibold text-ink",
          )}
        >
          {valor}
        </dd>
      </div>
      {nota && <p className="mt-0.5 text-label text-ink-muted">{nota}</p>}
    </div>
  );
}

/**
 * A conta, com o número exato (`#d303`): precisa − tem = falta, e os pacotes
 * cobrem a falta com a sobra dita.
 *
 * A linha gravada não guarda a quantidade física; ela sai de `falta + tem`, que
 * é a conta de `montarLista` lida de trás para a frente, e fecha por
 * construção. A perda é o que sobra entre isso e o útil, depois de devolver o
 * que já virou massa.
 */
function AConta({
  item,
  insumo,
  hoje,
}: {
  item: ItemListaCompras;
  insumo: Insumo | undefined;
  hoje: DataISO;
}) {
  const q = (valor: number) => formatarQuantidade(valor, item.unidadeBase);
  const consumo = item.consumoDeFornadas ?? 0;
  const tem = Math.max(0, item.estoqueAtual - consumo);
  const precisa = item.quantidadeComprar + tem;

  const daReserva = item.quantidadeDeReserva ?? 0;
  const dosPedidos = Math.max(0, item.quantidadeNecessaria - daReserva);
  const massa = Math.min(
    item.quantidadeJaProduzida ?? 0,
    quantidadeFisica(dosPedidos, insumo?.perdaPercentual ?? 0),
  );
  const perda = precisa + massa - item.quantidadeNecessaria;

  const partes = [
    dosPedidos > FOLGA && { rotulo: "Os pedidos", valor: q(dosPedidos) },
    daReserva > FOLGA && { rotulo: "A reserva", valor: q(daReserva) },
    perda > FOLGA && { rotulo: "A perda", valor: `+ ${q(perda)}` },
    massa > FOLGA && { rotulo: "Já virou massa", valor: `− ${q(massa)}` },
  ].filter((parte) => !!parte);

  const contagem = insumo ? contagemDoInsumo(insumo, hoje) : null;
  const notaDoTem =
    item.estoqueAtual > 0
      ? [
          `${q(item.estoqueAtual)} ${contagem ? rotuloDeIdade(contagem) : "contados"}`,
          consumo > 0 && `menos ${q(consumo)} que foram para a massa`,
        ]
          .filter(Boolean)
          .join(", ")
      : (fraseDaContagem(insumo, item.unidadeBase, hoje)?.frase ??
        (contagem ? rotuloDeIdade(contagem) : null));

  const base = insumo?.quantidadeBase ?? 0;
  const comprado = item.quantidadePacotes * base;
  const tamanho = tamanhoDoPacote(insumo);

  return (
    <Secao titulo="A conta">
      <dl className="mt-2">
        <Parcela rotulo="Precisa" valor={q(precisa)} />
        {partes.length > 1 &&
          partes.map((parte) => (
            <Parcela key={parte.rotulo} dentro {...parte} />
          ))}
        <Parcela rotulo="Você tem" valor={`− ${q(tem)}`} nota={notaDoTem} />
        <div className="border-t border-line">
          <Parcela rotulo="Falta" valor={q(item.quantidadeComprar)} forte />
        </div>
        {base > 0 && (
          <>
            <Parcela
              rotulo={`${item.quantidadePacotes} ${item.quantidadePacotes === 1 ? "pacote" : "pacotes"} de ${tamanho}`}
              valor={q(comprado)}
            />
            <Parcela
              rotulo="Sobra na despensa"
              valor={q(Math.max(0, comprado - item.quantidadeComprar))}
              nota="Além do que os pedidos e a reserva pedem."
            />
          </>
        )}
      </dl>
    </Secao>
  );
}

/** Os pedidos pelo nome da cliente e o dia, e a reserva por produto. */
function DeOndeVem({
  item,
  pedidos,
  fichas,
  reservaPara,
}: {
  item: ItemListaCompras;
  pedidos: Pedido[];
  fichas: FichaTecnica[];
  reservaPara: ReservaDoInsumo["fichas"] | undefined;
}) {
  const q = (valor: number) => formatarQuantidade(valor, item.unidadeBase);
  const porPedido = useMemo(
    () => demandaPorPedido(item.insumoId, pedidos, fichas),
    [item.insumoId, pedidos, fichas],
  );
  const reserva = (item.quantidadeDeReserva ?? 0) > FOLGA ? reservaPara : [];

  if (porPedido.length === 0 && !reserva?.length) return null;

  return (
    <Secao titulo="De onde vem">
      <ul className="mt-1 divide-y divide-line">
        {porPedido.map(({ pedido, quantidade }) => (
          <Origem
            key={pedido.id}
            nome={pedido.clienteNome}
            detalhe={rotuloDiaCurto(pedido.dataEntregaISO)}
            valor={q(quantidade)}
          />
        ))}
        {reserva?.map((ficha) => (
          <Origem
            key={ficha.fichaId}
            nome={ficha.nome}
            detalhe={`${ficha.fornadas} ${ficha.fornadas === 1 ? "fornada" : "fornadas"} de reserva`}
            valor={q(ficha.quantidade)}
          />
        ))}
      </ul>
    </Secao>
  );
}

function Origem({
  nome,
  detalhe,
  valor,
}: {
  nome: string;
  detalhe: string;
  valor: string;
}) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-4 py-2">
      <span className="min-w-0">
        <span className="block truncate text-body text-ink">{nome}</span>
        <span className="num block text-label text-ink-muted">{detalhe}</span>
      </span>
      <span className="num shrink-0 text-body font-semibold text-ink">
        {valor}
      </span>
    </li>
  );
}

/**
 * O preço do pacote e do quilo, a última compra e a anterior, e o campo. O
 * efeito nos produtos aparece enquanto ela digita (`EfeitoDoPrecoDigitado`, da
 * 051): é a consequência do número, antes de salvar.
 */
function OPreco({
  insumo,
  pacotes,
  preco,
  aoMudar,
  mudou,
  fichas,
  materiais,
}: {
  insumo: Insumo;
  pacotes: number;
  preco: Centavos;
  aoMudar: (preco: Centavos) => void;
  mudou: boolean;
  fichas: FichaTecnica[];
  materiais: Insumo[];
}) {
  const tamanho = tamanhoDoPacote(insumo);
  // Sem a perda: é o número da etiqueta da gôndola (`#d220`).
  const referencia = custoDeReferencia(
    insumo.custoUnidadeBase,
    insumo.unidadeBase,
  );
  const [ultima, anterior] = comprasDoInsumo(insumo).compras.filter(
    (compra) => !compra.daBiblioteca,
  );

  const custo = useMemo(
    () =>
      calcularCustoInsumo({
        precoCompra: preco,
        quantidadeCompra: insumo.quantidadeCompra,
        unidadeCompra: insumo.unidadeCompra,
        perdaPercentual: insumo.perdaPercentual,
      }),
    [
      preco,
      insumo.quantidadeCompra,
      insumo.unidadeCompra,
      insumo.perdaPercentual,
    ],
  );

  return (
    <Secao titulo="O preço">
      <p className="num mt-2 text-body text-ink-muted">
        <span className="font-semibold text-ink">
          {formatarMoeda(insumo.precoCompra)}
        </span>{" "}
        o pacote de {tamanho}
        <span className="mx-1.5 text-ink-subtle">·</span>
        <span className="font-semibold text-ink">
          {formatarReferencia(referencia.centavos, insumo.unidadeBase)}
        </span>{" "}
        {referencia.rotulo}
      </p>

      {ultima && (
        <p className="num mt-1 text-body text-ink-muted">
          Última compra:{" "}
          <span className="font-semibold text-ink">
            {formatarMoeda(ultima.precoCompra)}
          </span>{" "}
          em {rotuloDia(dataISODe(new Date(ultima.dataMs)))}
          {anterior && (
            <>
              <span className="mx-1.5 text-ink-subtle">·</span>
              <Variacao
                ultima={ultima}
                anterior={anterior}
                unidadeBase={insumo.unidadeBase}
                rotulo={referencia.rotulo}
              />
            </>
          )}
        </p>
      )}

      <CampoMoeda
        className="mt-4"
        rotulo={`Preço do pacote de ${tamanho} hoje`}
        valor={preco}
        aoMudar={aoMudar}
        dica={
          pacotes > 1
            ? `${pacotes} pacotes na lista: ${formatarMoeda(pacotes * preco)} no total.`
            : "O que a etiqueta da prateleira está pedindo."
        }
      />

      {mudou && (
        <div className="mt-4">
          <EfeitoDoPrecoDigitado
            insumo={insumo}
            custo={custo}
            fichas={fichas}
            materiais={materiais}
          />
        </div>
      )}
    </Secao>
  );
}

/**
 * A última compra contra a anterior: em reais do pacote quando o pacote é o
 * mesmo, e no quilo quando mudou, porque pacotes diferentes não se comparam.
 */
function Variacao({
  ultima,
  anterior,
  unidadeBase,
  rotulo,
}: {
  ultima: ReturnType<typeof comprasDoInsumo>["compras"][number];
  anterior: ReturnType<typeof comprasDoInsumo>["compras"][number];
  unidadeBase: Insumo["unidadeBase"];
  rotulo: string;
}) {
  const mesmoPacote =
    ultima.quantidadeCompra === anterior.quantidadeCompra &&
    ultima.unidadeCompra === anterior.unidadeCompra;
  const diferenca = mesmoPacote
    ? ultima.precoCompra - anterior.precoCompra
    : ultima.referencia - anterior.referencia;
  const desde = rotuloDia(dataISODe(new Date(anterior.dataMs)));

  if (Math.round(diferenca) === 0) return <>o mesmo preço de {desde}</>;

  const Seta = diferenca > 0 ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1">
      <Seta aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
      {diferenca > 0 ? "subiu" : "caiu"}{" "}
      {mesmoPacote
        ? formatarMoeda(Math.abs(diferenca))
        : `${formatarReferencia(Math.abs(diferenca), unidadeBase)} ${rotulo}`}{" "}
      desde {desde}
    </span>
  );
}
