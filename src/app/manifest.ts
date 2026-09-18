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
    // A tela de abertura é o `canvas` claro: o ícone é `brand-700`, e precisa
    // de um fundo claro para ter contra o que aparecer.
    background_color: "#F7F4EE",
    // O `brand-700` do ícone, e não a superfície do tema. O Android assa este
    // valor dentro do WebAPK na instalação, e a partir daí a barra de status é
    // decoração de janela do sistema: nem media query nem
    // `<meta name="theme-color">` alcançam lá dentro. Um valor só, que precisa
    // estar certo nos dois temas — escuro nos dois quer dizer ícone do sistema
    // em branco nos dois. Trocar exige reinstalar o app. Ver `DECISOES.md#d76`
    // e `#d124`.
    theme_color: "#2A2C3A",
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
    shortcuts: [{ name: "Materiais", url: "/insumos" }],
  };
}
