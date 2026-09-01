import type { Centavos } from "@/lib/types";
import type { RegraArredondamento } from "@/lib/types";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatadorNumero = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1250 → "R$ 12,50" */
export function formatarMoeda(centavos: Centavos): string {
  return formatadorMoeda.format(centavos / 100);
}

/** 1250 → "12,50". Para quando o "R$" é renderizado como elemento separado. */
export function formatarValor(centavos: Centavos): string {
  return formatadorNumero.format(centavos / 100);
}

/**
 * Formata custos que são frações de centavo sem virar "R$ 0,00".
 * 1.25 centavo/g → "R$ 0,0125".
 */
export function formatarCustoUnitario(centavos: number): string {
  const reais = centavos / 100;
  const casas = Math.abs(reais) < 0.01 ? 4 : 2;
  return `R$ ${reais.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}`;
}

/**
 * Lê o que a usuária digitou e devolve centavos.
 *
 * Aceita "12,50", "12.50", "R$ 12,50", "1.234,56" e "1250" (digitação corrida
 * de campo monetário). Descarta tudo que não for dígito ou separador.
 */
export function parseParaCentavos(entrada: string): Centavos {
  const limpo = entrada.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return 0;

  const negativo = limpo.startsWith("-");
  const semSinal = limpo.replace(/-/g, "");

  // Último separador presente é o decimal; os anteriores são de milhar.
  const ultimaVirgula = semSinal.lastIndexOf(",");
  const ultimoPonto = semSinal.lastIndexOf(".");
  const posDecimal = Math.max(ultimaVirgula, ultimoPonto);

  let valor: number;
  if (posDecimal === -1) {
    valor = Number(semSinal);
  } else {
    const inteiro = semSinal.slice(0, posDecimal).replace(/[.,]/g, "");
    const decimal = semSinal.slice(posDecimal + 1).replace(/[.,]/g, "");
    valor = Number(`${inteiro || "0"}.${decimal}`);
  }

  if (!Number.isFinite(valor)) return 0;
  const centavos = Math.round(valor * 100);
  return negativo ? -centavos : centavos;
}

/**
 * Máscara de digitação: cada tecla empurra o valor uma casa à esquerda.
 * "1" → 0,01 · "12" → 0,12 · "1250" → 12,50. É como o app bancário se comporta,
 * e evita que a Maynara erre a vírgula com o dedo sujo de massa.
 */
export function digitosParaCentavos(digitos: string): Centavos {
  const apenasDigitos = digitos.replace(/\D/g, "");
  if (!apenasDigitos) return 0;
  return Number(apenasDigitos.slice(0, 11));
}

/**
 * Lê um número comum (não monetário) digitado em teclado brasileiro.
 * "1,5" e "1.5" valem o mesmo; o que não for número vira zero.
 */
export function parseParaNumero(texto: string): number {
  const valor = Number(texto.replace(",", "."));
  return Number.isFinite(valor) ? valor : 0;
}

export function arredondarPreco(
  centavos: Centavos,
  regra: RegraArredondamento,
): Centavos {
  if (centavos <= 0) return 0;

  switch (regra) {
    case "REAL_INTEIRO":
      return Math.ceil(centavos / 100) * 100;
    case "MEIO_REAL":
      return Math.ceil(centavos / 50) * 50;
    case "CENTAVO_90": {
      // Sobe para o próximo X,90 (1234 → 1290; 1290 fica 1290; 1291 → 1390).
      const base = Math.floor(centavos / 100) * 100 + 90;
      return base >= centavos ? base : base + 100;
    }
    case "NENHUM":
    default:
      return Math.round(centavos);
  }
}

/** Divide centavos entre N partes sem perder resto (o resto vai nas primeiras). */
export function ratear(total: Centavos, partes: number): Centavos[] {
  if (partes <= 0) return [];
  const base = Math.floor(total / partes);
  const resto = total - base * partes;
  return Array.from({ length: partes }, (_, i) => base + (i < resto ? 1 : 0));
}

export function percentualDe(valor: Centavos, percentual: number): Centavos {
  return Math.round(valor * (percentual / 100));
}
