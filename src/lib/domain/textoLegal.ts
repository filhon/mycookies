/**
 * As referências dos termos e da privacidade viram link no render (spec 165),
 * sem JSX dentro das cláusulas: o texto continua string, e esta função o
 * corta em pedaços. "seção N" aponta para `#secao-N`; os demais trechos são
 * literais que a página passa (o e-mail, os sites, o outro documento).
 */
export type PedacoDeTexto =
  | { tipo: "texto"; texto: string }
  | { tipo: "link"; texto: string; href: string; novaAba: boolean };

export interface TrechoComLink {
  trecho: string;
  href: string;
  novaAba?: boolean;
}

const SECAO = /^seção (\d+)$/;

function escapar(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function fatiarReferencias(
  texto: string,
  trechos: readonly TrechoComLink[] = [],
): PedacoDeTexto[] {
  // O mais longo primeiro: um trecho contido em outro não rouba o casamento.
  const literais = [...trechos].sort(
    (a, b) => b.trecho.length - a.trecho.length,
  );
  const padrao = new RegExp(
    ["seção \\d+", ...literais.map((t) => escapar(t.trecho))].join("|"),
    "g",
  );

  const pedacos: PedacoDeTexto[] = [];
  let desde = 0;
  for (const casamento of texto.matchAll(padrao)) {
    const achado = casamento[0];
    const inicio = casamento.index;
    if (inicio > desde) {
      pedacos.push({ tipo: "texto", texto: texto.slice(desde, inicio) });
    }
    const secao = SECAO.exec(achado);
    const literal = literais.find((t) => t.trecho === achado);
    pedacos.push({
      tipo: "link",
      texto: achado,
      href: secao ? `#secao-${secao[1]}` : literal!.href,
      novaAba: secao ? false : (literal!.novaAba ?? false),
    });
    desde = inicio + achado.length;
  }
  if (desde < texto.length) {
    pedacos.push({ tipo: "texto", texto: texto.slice(desde) });
  }
  return pedacos;
}
