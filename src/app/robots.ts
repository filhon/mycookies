import type { MetadataRoute } from "next";
import { URL_DO_SITE } from "./site";

/**
 * Todo robô entra, os de IA inclusive: sem regra própria eles seguem o `*`
 * (`DECISOES.md#d177`). As telas do app não entram no `disallow`: elas dizem
 * `noindex` pelo layout raiz, e o robô barrado não leria esse `noindex`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${URL_DO_SITE}/sitemap.xml`,
  };
}
