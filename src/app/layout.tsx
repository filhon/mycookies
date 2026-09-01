import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3eee3" },
    { media: "(prefers-color-scheme: dark)", color: "#231a1a" },
  ],
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
