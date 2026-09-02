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
    // O SVG fica no papel para o qual foi desenhado — conteúdo dentro da zona
    // segura, para sobreviver ao recorte circular do Android. Os PNGs são o
    // ícone sem recorte, e são o que garante o mesmo resultado nos dois
    // sistemas: instalador que não lê SVG cai neles em vez de na página.
    icons: [
      {
        src: "/icons/icone-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icone-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icone-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    // Atalhos apontam só para rotas que já existem: um atalho para 404 é pior
    // do que atalho nenhum. Ganham entradas conforme os módulos entram.
    shortcuts: [{ name: "Insumos", url: "/insumos" }],
  };
}
