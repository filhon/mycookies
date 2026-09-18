import type { Metadata, Viewport } from "next";
import { Archivo, Figtree } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
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
  title: {
    default: "MyCookie's",
    template: "%s · MyCookie's",
  },
  description:
    "Precificação, produção e fluxo de caixa dos doces artesanais da MyCookie’s.",
  applicationName: "MyCookie's",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MyCookie's",
    statusBarStyle: "default",
  },
  // Sistema interno de uma pessoa só: não existe motivo para ser indexado.
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
