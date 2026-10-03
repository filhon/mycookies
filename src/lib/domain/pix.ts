import type { Centavos } from "@/lib/types";

/**
 * O Pix copia e cola com o valor (spec 080, `DECISOES.md#d278`).
 *
 * É o BR Code estático do Banco Central, montado aqui por regra pública
 * (Manual de Padrões para Iniciação do Pix, conferido na v2.10.0): sem
 * servidor, sem gateway, sem internet. A cliente cola no banco e a chave, o
 * nome, o valor e o código do pedido já vêm preenchidos.
 */

/** O que a forma Pix guarda para montar o código (`FormaPagamento.pix`). */
export interface DadosPix {
  chave: string;
  nome: string;
  cidade: string;
}

/** Os limites do EMV para `59` (nome), `60` (cidade) e `62-05` (identificador). */
const MAX_NOME = 25;
const MAX_CIDADE = 15;
const MAX_IDENTIFICADOR = 25;

/**
 * 'São João' → 'Sao Joao'. O tamanho de cada campo é contado em caracteres, e
 * o código só vale em ASCII: banco que recebe acento ou recusa o código ou
 * conta o tamanho errado e quebra o CRC.
 */
function emAscii(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function cortado(texto: string, maximo: number): string {
  return emAscii(texto).slice(0, maximo).trim();
}

/** Identificador, tamanho com dois dígitos, valor. */
function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** 6800 → '68.00'. Dos centavos direto para o texto, sem float no meio. */
function valorEmTexto(centavos: Centavos): string {
  const reais = Math.trunc(centavos / 100);
  const resto = centavos % 100;
  return `${reais}.${String(resto).padStart(2, "0")}`;
}

/** CRC16-CCITT, polinômio 0x1021, início 0xFFFF, em hexadecimal maiúsculo. */
function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * A chave do jeito que o banco procura. Ela escreve o telefone como telefone,
 * '(81) 99679-6370', e o banco só acha '+5581996796370'.
 *
 * Só o que não é ambíguo: onze dígitos sem pontuação podem ser um CPF ou um
 * celular, e ficam como estão. A conferência na Configuração mostra a chave
 * já arrumada, e o Pix de R$ 1,00 tira a dúvida.
 */
export function chavePix(texto: string): string {
  const chave = texto.trim();
  if (chave.includes("@")) return chave.toLowerCase();
  if (/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(chave)) {
    return chave.toLowerCase();
  }
  const digitos = chave.replace(/\D/g, "");
  if (/^\+[\d\s().-]+$/.test(chave)) return `+${digitos}`;
  // Parêntese ou espaço é jeito de escrever telefone, nunca CPF ou CNPJ.
  if (
    /^[\d\s().-]+$/.test(chave) &&
    /[()\s]/.test(chave) &&
    (digitos.length === 10 || digitos.length === 11)
  ) {
    return `+55${digitos}`;
  }
  // CPF e CNPJ com pontos, traço e barra.
  if (/^[\d./-]+$/.test(chave)) return digitos;
  return chave;
}

/**
 * O texto EMV do Pix copia e cola.
 *
 * `valor` em centavos; sem valor (zero), o campo `54` some e o banco pergunta
 * quanto. `identificador` é o código do pedido: fica só `[A-Za-z0-9]`, até 25,
 * e vazio vira `***`, o "sem identificador" do manual.
 */
export function brCodePix({
  chave,
  nome,
  cidade,
  valor,
  identificador,
}: DadosPix & { valor: Centavos; identificador: string }): string {
  const txid =
    identificador.replace(/[^A-Za-z0-9]/g, "").slice(0, MAX_IDENTIFICADOR) ||
    "***";

  const semCrc = [
    campo("00", "01"),
    campo("26", campo("00", "br.gov.bcb.pix") + campo("01", emAscii(chave))),
    campo("52", "0000"),
    campo("53", "986"),
    valor > 0 ? campo("54", valorEmTexto(valor)) : "",
    campo("58", "BR"),
    campo("59", cortado(nome, MAX_NOME)),
    campo("60", cortado(cidade, MAX_CIDADE)),
    campo("62", campo("05", txid)),
    "6304",
  ].join("");

  return semCrc + crc16(semCrc);
}
