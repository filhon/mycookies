import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

// O Next 16 usa Turbopack por padrão, e o @serwist/next ainda depende de
// webpack para emitir o service worker. Como o funcionamento offline é
// requisito deste sistema, os scripts `dev` e `build` fixam `--webpack`.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Em dev o service worker atrapalha o hot reload e mascara erros de rede.
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

// O login do Google volta por `/__/auth/handler` no próprio domínio do app, e
// não no `firebaseapp.com`: a tela do Google diz "Rende", e o navegador que
// bloqueia armazenamento de terceiros não quebra o fluxo (`DECISOES.md#d199`).
// Em produção `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` é o domínio do app.
const projetoFirebase = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  async rewrites() {
    if (!projetoFirebase) return [];
    const origem = `https://${projetoFirebase}.firebaseapp.com`;
    return [
      { source: "/__/auth/:path*", destination: `${origem}/__/auth/:path*` },
      {
        source: "/__/firebase/:path*",
        destination: `${origem}/__/firebase/:path*`,
      },
    ];
  },
};

export default withSerwist(nextConfig);
