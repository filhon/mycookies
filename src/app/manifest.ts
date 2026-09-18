import type { MetadataRoute } from "next";
import { DESCRICAO } from "./descricao";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rende",
    short_name: "Rende",
    description: DESCRICAO,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // O `canvas` claro, e não o `brand-800` que o pacote pede para a abertura:
    // o `background_color` é a única tela de abertura que um PWA tem, e um
    // ícone `brand-700` sobre `brand-800` é um quadrado escuro sobre fundo
    // escuro. Assado no WebAPK como o `theme_color` (`#d124`).
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
    // ícone sem recorte e sem `rx` (`scripts/gerar-icones.mjs`, `#d44`), e são
    // o que garante o mesmo resultado nos dois sistemas: instalador que não lê
    // SVG cai neles em vez de na página.
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
