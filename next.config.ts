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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
};

export default withSerwist(nextConfig);
