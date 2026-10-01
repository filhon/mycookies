import type { MetadataRoute } from "next";
import { PAGINAS_DO_PRECO, URL_DO_SITE } from "./site";

/**
 * As páginas públicas do Rende, e só elas (`DECISOES.md#d177`). `/`, `/termos`
 * e `/privacidade` são `noindex`; os cardápios são da confeiteira.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${URL_DO_SITE}/conheca` },
    ...PAGINAS_DO_PRECO.map((p) => ({ url: `${URL_DO_SITE}${p.endereco}` })),
  ];
}
