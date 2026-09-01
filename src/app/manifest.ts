import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyCookie's · Gestão",
    short_name: "MyCookie's",
    description:
      "Precificação, produção e fluxo de caixa dos doces artesanais da MyCookie’s.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3eee3",
    theme_color: "#f3eee3",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "productivity", "food"],
    icons: [
      {
        src: "/icons/icone-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icone-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    // Atalhos apontam só para rotas que já existem: um atalho para 404 é pior
    // do que atalho nenhum. Ganham entradas conforme os módulos entram.
    shortcuts: [{ name: "Insumos", url: "/insumos" }],
  };
}
