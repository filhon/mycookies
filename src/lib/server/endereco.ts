import { unstable_cache } from "next/cache";
import type { Coordenadas, EnderecoDoCep } from "@/lib/domain/entrega";

/**
 * O CEP, pelos dois serviços da taxa de entrega (spec 118, `DECISOES.md#d322`).
 * Recebem o CEP já limpo (`limparCep`), 8 dígitos. Falha, tempo esgotado ou
 * cota estourada viram `null`, e a regra cai em "a combinar": a taxa nunca
 * impede um pedido por falha do Rende.
 *
 * Cache de 30 dias, o que os termos do Google permitem guardar de coordenada:
 * o mesmo CEP, de qualquer conta, é uma chamada por mês.
 */

const TRINTA_DIAS_S = 30 * 24 * 60 * 60;
const TEMPO_LIMITE_MS = 5000;

/** ViaCEP: grátis, sem chave. CEP que não existe volta `{ erro: true }`, com 200. */
export async function buscarCep(cep: string): Promise<EnderecoDoCep | null> {
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      next: { revalidate: TRINTA_DIAS_S },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (!resposta.ok) return null;
    const json = (await resposta.json()) as {
      erro?: unknown;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (json.erro) return null;
    return {
      logradouro: json.logradouro ?? "",
      bairro: json.bairro ?? "",
      cidade: json.localidade ?? "",
      uf: json.uf ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * O Google responde 200 até para chave recusada e cota estourada, e o cache do
 * `fetch` guardaria a recusa por 30 dias. Por isso `unstable_cache`, que não
 * guarda o que lança: só o achado e o "não existe" ficam.
 */
const perguntarAoGoogle = unstable_cache(
  async (cep: string): Promise<Coordenadas | null> => {
    const chave = process.env.GOOGLE_MAPS_API_KEY?.trim();
    if (!chave) throw new Error("sem-chave");
    const parametros = new URLSearchParams({
      components: `postal_code:${cep.slice(0, 5)}-${cep.slice(5)}|country:BR`,
      key: chave,
    });
    const resposta = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${parametros}`,
      { cache: "no-store", signal: AbortSignal.timeout(TEMPO_LIMITE_MS) },
    );
    if (!resposta.ok) throw new Error(`http-${resposta.status}`);
    const json = (await resposta.json()) as {
      status: string;
      results?: { geometry?: { location?: Coordenadas } }[];
    };
    if (json.status === "ZERO_RESULTS") return null;
    const local = json.results?.[0]?.geometry?.location;
    if (json.status !== "OK" || !local) throw new Error(json.status);
    return { lat: local.lat, lng: local.lng };
  },
  ["coordenadas-do-cep"],
  { revalidate: TRINTA_DIAS_S },
);

/**
 * As coordenadas do CEP, e não do número: no Brasil o CEP urbano é um trecho
 * de rua, e o número da casa da cliente não sai do Rende.
 *
 * `achado: false` é o Google dizendo que o CEP não existe; `null` é não ter
 * conseguido perguntar.
 */
export async function coordenadasDoCep(
  cep: string,
): Promise<
  { achado: false } | { achado: true; coordenadas: Coordenadas } | null
> {
  try {
    const coordenadas = await perguntarAoGoogle(cep);
    return coordenadas ? { achado: true, coordenadas } : { achado: false };
  } catch (erro) {
    console.error("[endereco] Geocoding:", (erro as Error).message);
    return null;
  }
}
