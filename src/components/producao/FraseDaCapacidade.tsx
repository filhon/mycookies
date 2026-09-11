import type { ReactNode } from "react";
import Link from "next/link";
import { Check, CircleHelp, CookingPot, TriangleAlert } from "lucide-react";
import { ROTULO_UNIDADE_RENDIMENTO } from "@/lib/domain/custoFicha";
import { faltaPara, type CapacidadeDaFicha } from "@/lib/domain/producao";
import { formatarQuantidade } from "@/lib/domain/unidades";
import { cn } from "@/lib/utils/cn";

/** "Chocolate", "Chocolate e Farinha", "Chocolate, Farinha e mais 2". */
export function listarNomes(nomes: string[], maximo = 2): string {
  if (nomes.length <= maximo) {
    return nomes.length <= 1
      ? (nomes[0] ?? "")
      : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
  }
  const resto = nomes.length - maximo;
  return `${nomes.slice(0, maximo).join(", ")} e mais ${resto}`;
}

export function texto(numero: number): string {
  return numero.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

/**
 * Quantas fornadas dá, numa linha, com o quanto isso vale (`DECISOES.md#d94`).
 *
 * A leitura decide a frase, e nunca o contrário: `MEDIDA` diz o número,
 * `PISO` diz "pelo menos" e nomeia o que falta contar, `DESCONHECIDA` diz que
 * não dá para saber. Zero é dito com ícone, porque zero é o número que ela
 * precisa ver antes de prometer, e vinho e vermelho são vizinhos.
 */
export function FraseDaCapacidade({
  capacidade,
  className,
}: {
  capacidade: CapacidadeDaFicha;
  className?: string;
}) {
  const { leitura, fornadas, unidades, gargalo, semContagem } = capacidade;
  const semContagemFrase =
    semContagem.length > 0 ? `${listarNomes(semContagem)} sem contagem` : null;

  if (leitura === "DESCONHECIDA" || fornadas === null || unidades === null) {
    return (
      <Frase icone={CircleHelp} className={className}>
        não dá para saber quantas fornadas
        {semContagemFrase && (
          <>
            <Separador />
            {semContagemFrase}
          </>
        )}
      </Frase>
    );
  }

  if (fornadas === 0) {
    return (
      <Frase icone={TriangleAlert} tom="atencao" className={className}>
        não dá nem uma fornada
        {gargalo && (
          <>
            <Separador />
            falta {gargalo.nome}
          </>
        )}
        {semContagemFrase && (
          <>
            <Separador />
            {semContagemFrase}
          </>
        )}
      </Frase>
    );
  }

  const quantas = `${texto(fornadas)} ${fornadas === 1 ? "fornada" : "fornadas"}`;
  const alem = capacidade.descontaPedidos ? " além dos pedidos" : "";

  return (
    <Frase icone={CookingPot} className={className}>
      {leitura === "PISO" ? `pelo menos ${quantas}` : `dá para ${quantas}`}
      {alem}
      <Separador />
      {texto(unidades)}{" "}
      {ROTULO_UNIDADE_RENDIMENTO[capacidade.unidadeRendimento]}
      {gargalo && (
        <>
          <Separador />
          {gargalo.nome} acaba primeiro
        </>
      )}
      {semContagemFrase && (
        <>
          <Separador />
          {semContagemFrase}
        </>
      )}
    </Frase>
  );
}

function Separador() {
  return <span className="mx-1.5 text-ink-subtle">·</span>;
}

function Frase({
  icone: Icone,
  tom = "neutro",
  className,
  children,
}: {
  icone: typeof CookingPot;
  tom?: "neutro" | "atencao" | "positivo";
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "num flex items-start gap-1.5 text-label",
        TOM[tom],
        className,
      )}
    >
      <Icone
        aria-hidden
        className="mt-0.75 size-3.5 shrink-0"
        strokeWidth={tom === "neutro" ? 1.75 : 2}
      />
      <span>{children}</span>
    </p>
  );
}

/** O ícone acompanha a cor: vinho e vermelho são vizinhos de matiz. */
const TOM = {
  neutro: "text-ink-muted",
  atencao: "text-attention",
  positivo: "text-positive",
};

/**
 * A resposta na linha do pedido: dá, ou o que falta para dar.
 *
 * É onde a pergunta é feita de verdade, com o WhatsApp aberto e a cliente
 * esperando. A capacidade é sobre **hoje** e já desconta os outros pedidos
 * fechados; quando não dá, a frase diz qual insumo e quanto comprar resolve.
 */
export function FraseCabeNoPedido({
  capacidade,
  unidades,
  jaFeitas = 0,
}: {
  capacidade: CapacidadeDaFicha;
  /** O que a linha do pedido pede. */
  unidades: number;
  /** O que já virou massa para este pedido e esta ficha. */
  jaFeitas?: number;
}) {
  const rotulo = ROTULO_UNIDADE_RENDIMENTO[capacidade.unidadeRendimento];
  const precisa = unidades - jaFeitas;
  const semContagemFrase =
    capacidade.semContagem.length > 0
      ? `${listarNomes(capacidade.semContagem)} sem contagem`
      : null;

  if (!(unidades > 0)) return null;

  if (precisa <= 0) {
    return (
      <Frase icone={CookingPot}>
        A massa para este item já está feita: {texto(jaFeitas)} {rotulo}.
      </Frase>
    );
  }

  if (capacidade.unidades === null) {
    return (
      <Frase icone={CircleHelp}>
        Não dá para saber se a despensa dá
        {semContagemFrase && (
          <>
            <Separador />
            {semContagemFrase}
          </>
        )}
        <Separador />
        <Link
          href="/insumos/contagem"
          className="font-medium text-wine-700 underline underline-offset-2 dark:text-wine-300"
        >
          Contar a despensa
        </Link>
      </Frase>
    );
  }

  const outros = capacidade.descontaPedidos
    ? ", já tirando os outros pedidos"
    : "";

  if (capacidade.unidades >= precisa) {
    return (
      <Frase icone={Check} tom="positivo">
        Dá: a despensa tem para {texto(capacidade.unidades)} {rotulo} hoje
        {outros}
        {semContagemFrase && (
          <>
            <Separador />
            {semContagemFrase}
          </>
        )}
      </Frase>
    );
  }

  const falta = faltaPara(capacidade, precisa);
  const compras = listarNomes(
    falta.map(
      (linha) =>
        `${formatarQuantidade(linha.falta, linha.unidadeBase)} de ${linha.nome}`,
    ),
    3,
  );

  return (
    <Frase icone={TriangleAlert} tom="atencao">
      Falta massa para {texto(precisa - capacidade.unidades)} {rotulo}
      {outros}.{compras && ` Comprar ${compras} resolve.`}
      {semContagemFrase && (
        <>
          <Separador />
          {semContagemFrase}
        </>
      )}
    </Frase>
  );
}
