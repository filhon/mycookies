import type { MetadataRoute } from "next";
import { URL_DO_SITE } from "./site";

/**
 * As páginas públicas do Rende, e só elas (`DECISOES.md#d177`). `/`, `/termos`
 * e `/privacidade` são `noindex`; os cardápios são da confeiteira.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${URL_DO_SITE}/conheca` },
    { url: `${URL_DO_SITE}/como-calcular-o-preco-do-cookie` },
  ];
}
