import type { ReactNode } from "react";
import Link from "next/link";
import {
  Check,
  CircleHelp,
  CookingPot,
  PackageOpen,
  TriangleAlert,
} from "lucide-react";
import { rotuloDaQuantidade } from "@/lib/domain/custoFicha";
import { rotuloDeIdade } from "@/lib/domain/estoque";
import {
  faltaPara,
  prontosLivres,
  type CapacidadeDaFicha,
  type ProjecaoDoPronto,
} from "@/lib/domain/producao";
import { formatarQuantidade } from "@/lib/domain/unidades";
import type { UnidadeRendimento } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * "13 unidades prontas", "300 gramas prontos": o adjetivo segue a unidade, e
 * no singular perde o "s" ("1 unidade pronta").
 */
const PRONTO: Record<UnidadeRendimento, string> = {
  un: "prontas",
  porcao: "prontas",
  g: "prontos",
  ml: "prontos",
};

function prontas(quantidade: number, unidade: UnidadeRendimento): string {
  const rotulo = rotuloDaQuantidade(quantidade, unidade);
  const adjetivo = rotulo.startsWith("1 ")
    ? PRONTO[unidade].slice(0, -1)
    : PRONTO[unidade];
  return `${rotulo} ${adjetivo}`;
}

/**
 * A forma da lista: "7 prontas". Só a unidade e a porção perdem o nome, que é
 * o que a linha do produto já diz; "300 gramas prontos" continua inteiro.
 */
function prontasCurto(quantidade: number, unidade: UnidadeRendimento): string {
  if (unidade !== "un" && unidade !== "porcao")
    return prontas(quantidade, unidade);
  const adjetivo =
    texto(quantidade) === "1" ? PRONTO[unidade].slice(0, -1) : PRONTO[unidade];
  return `${texto(quantidade)} ${adjetivo}`;
}

/**
 * O que está pronto, numa linha: a contagem projetada, sem o que já tem dono.
 * Some sem contagem que valha: não há o que dizer, e a capacidade continua
 * falando pela despensa.
 *
 * `curta` é a da lista de produtos (`#d231`): só o número, sem a idade da
 * contagem, que mora no painel e no editor.
 */
export function FraseDoPronto({
  projecao,
  unidade,
  reservado = 0,
  curta = false,
  className,
}: {
  projecao: ProjecaoDoPronto;
  unidade: UnidadeRendimento;
  /** O que dos prontos já é de pedido aberto. */
  reservado?: number;
  curta?: boolean;
  className?: string;
}) {
  const livres = prontosLivres(projecao, reservado);
  if (livres === null) return null;

  if (curta) {
    return (
      <Frase icone={PackageOpen} curta className={className}>
        {livres === 0 ? "nada pronto" : prontasCurto(livres, unidade)}
      </Frase>
    );
  }

  return (
    <Frase icone={PackageOpen} className={className}>
      {livres === 0 ? "nada pronto" : prontas(livres, unidade)}
      {reservado > 0 && " além dos pedidos"}
      <Separador />
      {rotuloDeIdade(projecao.contagem)}
      {projecao.fornadas > 0 && (
        <>
          <Separador />
          massa para {texto(projecao.feitas)} desde então
        </>
      )}
    </Frase>
  );
}

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
 * precisa ver antes de prometer, e a cor sozinha nunca decide.
 *
 * `curta` é a da lista de produtos (`#d231`): "dá 1 fornada", "falta Oreo",
 * numa linha. As unidades, o "acaba primeiro" e o que não tem contagem ficam
 * no painel; na falta, o triângulo leva a atenção e o texto fica calmo,
 * porque a faixa acima da lista já carrega o peso.
 */
export function FraseDaCapacidade({
  capacidade,
  curta = false,
  className,
}: {
  capacidade: CapacidadeDaFicha;
  curta?: boolean;
  className?: string;
}) {
  const { leitura, fornadas, unidades, gargalo, semContagem } = capacidade;

  if (curta) {
    if (leitura === "DESCONHECIDA" || fornadas === null) {
      return (
        <Frase icone={CircleHelp} curta className={className}>
          não dá para saber
        </Frase>
      );
    }
    if (fornadas === 0) {
      return (
        <Frase icone={TriangleAlert} curta iconeAtencao className={className}>
          {gargalo ? `falta ${gargalo.nome}` : "não dá nem uma fornada"}
        </Frase>
      );
    }
    const quantas = `${texto(fornadas)} ${fornadas === 1 ? "fornada" : "fornadas"}`;
    return (
      <Frase icone={CookingPot} curta className={className}>
        {leitura === "PISO" ? `dá pelo menos ${quantas}` : `dá ${quantas}`}
      </Frase>
    );
  }

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
      {rotuloDaQuantidade(unidades, capacidade.unidadeRendimento)}
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
  rotulo,
  curta = false,
  iconeAtencao = false,
  className,
  children,
}: {
  icone: typeof CookingPot;
  tom?: "neutro" | "atencao" | "positivo";
  /** Numa linha, sem quebra: a forma da lista de produtos. */
  curta?: boolean;
  /** Só o ícone em atenção, com o texto no tom da frase. */
  iconeAtencao?: boolean;
  /** De quem é a frase, quando há mais de uma na mesma linha (o combo). */
  rotulo?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "num flex items-start gap-1.5 text-label",
        TOM[tom],
        curta && "min-w-0 whitespace-nowrap",
        className,
      )}
    >
      <Icone
        aria-hidden
        className={cn("mt-0.75 size-3.5 shrink-0", iconeAtencao && TOM.atencao)}
        strokeWidth={tom === "neutro" && !iconeAtencao ? 1.75 : 2}
      />
      <span className={cn(curta && "truncate")}>
        {rotulo && (
          <>
            <span className="font-medium">{rotulo}</span>
            <Separador />
          </>
        )}
        {children}
      </span>
    </p>
  );
}

/** O ícone acompanha a cor: a cor sozinha nunca decide. */
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
 *
 * Com o que está pronto contado, a resposta completa é `prontos + despensa −
 * prometido` (13D): o que já virou massa para **este** pedido sai dos prontos
 * antes, porque é dele e não está livre.
 *
 * Na linha de um combo à escolha há uma frase por receita escolhida
 * (`#d103`), e `nome` diz de qual é.
 */
export function FraseCabeNoPedido({
  capacidade,
  unidades,
  jaFeitas = 0,
  prontos = null,
  nome,
}: {
  capacidade: CapacidadeDaFicha;
  /** O que a linha do pedido pede. */
  unidades: number;
  /** O que já virou massa para este pedido e esta ficha. */
  jaFeitas?: number;
  /** Os prontos livres dos outros pedidos. `null` sem contagem que valha. */
  prontos?: number | null;
  /** A receita, quando a linha tem mais de uma frase. */
  nome?: string;
}) {
  const unidade = capacidade.unidadeRendimento;
  const precisa = unidades - jaFeitas;
  const livres =
    prontos === null ? 0 : Math.max(0, prontos - Math.min(unidades, jaFeitas));
  const prontosFrase = livres > 0 ? prontas(livres, unidade) : null;
  const semContagemFrase =
    capacidade.semContagem.length > 0
      ? `${listarNomes(capacidade.semContagem)} sem contagem`
      : null;

  if (!(unidades > 0)) return null;

  if (precisa <= 0) {
    return (
      <Frase icone={CookingPot} rotulo={nome}>
        A massa para este item já está feita:{" "}
        {rotuloDaQuantidade(jaFeitas, unidade)}.
      </Frase>
    );
  }

  if (livres >= precisa && prontosFrase) {
    return (
      <Frase icone={Check} tom="positivo" rotulo={nome}>
        Dá: {prontosFrase} hoje, sem fazer massa
      </Frase>
    );
  }

  if (capacidade.unidades === null) {
    return (
      <Frase icone={CircleHelp} rotulo={nome}>
        {prontosFrase && (
          <>
            {prontosFrase}
            <Separador />
          </>
        )}
        Não dá para saber se a despensa dá
        {prontosFrase && " o resto"}
        {semContagemFrase && (
          <>
            <Separador />
            {semContagemFrase}
          </>
        )}
        <Separador />
        <Link
          href="/insumos/contagem"
          className="font-medium text-brand-ink underline underline-offset-2"
        >
          Contar a despensa
        </Link>
      </Frase>
    );
  }

  const outros = capacidade.descontaPedidos
    ? ", já tirando os outros pedidos"
    : "";
  const disponivel = livres + capacidade.unidades;

  if (disponivel >= precisa) {
    return (
      <Frase icone={Check} tom="positivo" rotulo={nome}>
        Dá:{" "}
        {prontosFrase
          ? `${prontosFrase}, e a despensa faz mais ${texto(capacidade.unidades)} hoje`
          : `a despensa tem para ${rotuloDaQuantidade(capacidade.unidades, unidade)} hoje`}
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

  const falta = faltaPara(capacidade, precisa - livres);
  const compras = listarNomes(
    falta.map(
      (linha) =>
        `${formatarQuantidade(linha.falta, linha.unidadeBase)} de ${linha.nome}`,
    ),
    3,
  );

  return (
    <Frase icone={TriangleAlert} tom="atencao" rotulo={nome}>
      Falta massa para {rotuloDaQuantidade(precisa - disponivel, unidade)}
      {prontosFrase && ` (${prontosFrase})`}
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
