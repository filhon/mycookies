import type { Metadata, Viewport } from "next";
import { Archivo, Figtree } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import { DESCRICAO } from "./descricao";
import { URL_DO_SITE } from "./site";
import "./globals.css";

// Só 600 e 700: a marca não tem Archivo 400, e `font-display` sem peso
// renderizaria no mais próximo carregado sem avisar.
const display = Archivo({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--fonte-display",
});

const interface_ = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--fonte-interface",
});

export const metadata: Metadata = {
  // `canonical` e Open Graph relativos viram absolutos daqui (`DECISOES.md#d178`).
  metadataBase: new URL(URL_DO_SITE),
  title: {
    default: "Rende",
    template: "%s · Rende",
  },
  description: DESCRICAO,
  applicationName: "Rende",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Rende",
    // "default" pinta a barra de branco com ícone escuro: quebra a faixa
    // única com o cabeçalho `brand-700`. Translúcida deixa o conteúdo
    // aparecer por trás dela — é o cabeçalho, sticky no topo, que vira a cor
    // da barra; o respiro de `safe-area-inset-top` em `CabecalhoPagina`
    // evita que título e ações fiquem atrás do relógio/entalhe.
    statusBarStyle: "black-translucent",
  },
  // O app é área logada; `/conheca` e `/como-calcular-o-preco-do-cookie`
  // sobrepõem isto e são indexáveis (`DECISOES.md#d172`, `#d176`).
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Sem trava de zoom: limitar escala quebra acessibilidade.
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  // O mesmo `brand-700` do manifesto, de propósito: dois donos para o mesmo
  // pixel dariam uma barra que combina com a marca no app instalado e com a
  // superfície na aba do navegador. Ver `DECISOES.md#d76` e `#d124`.
  themeColor: "#2A2C3A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${interface_.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
