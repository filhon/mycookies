import type { Metadata } from "next";
import {
  PaginaDeTexto,
  type SecaoDeTexto,
} from "@/components/auth/PaginaDeTexto";

export const metadata: Metadata = { title: "Política de privacidade · Rende" };

/**
 * As seções seguem o art. 9 da LGPD, na ordem da spec 027 (3.5); o texto é de
 * quem conduz o projeto.
 */
const SECOES: SecaoDeTexto[] = [
  {
    titulo: "Quem controla os seus dados, e como falar com ele",
    paragrafos: ["[texto de quem conduz o projeto]"],
  },
  {
    titulo: "O que é coletado",
    paragrafos: ["[texto de quem conduz o projeto]"],
  },
  { titulo: "Para quê", paragrafos: ["[texto de quem conduz o projeto]"] },
  {
    titulo: "Quem opera por trás",
    paragrafos: [
      "[texto de quem conduz o projeto]",
      "[texto de quem conduz o projeto]",
      "[texto de quem conduz o projeto]",
    ],
  },
  {
    titulo: "Por quanto tempo",
    paragrafos: ["[texto de quem conduz o projeto]"],
  },
  {
    titulo: "Os seus direitos",
    paragrafos: ["[texto de quem conduz o projeto]"],
  },
  {
    titulo: "Cookies e rastreamento",
    paragrafos: ["[texto de quem conduz o projeto]"],
  },
  {
    titulo: "Mudanças nesta política",
    paragrafos: ["[texto de quem conduz o projeto]"],
  },
];

export default function PaginaPrivacidade() {
  return (
    <PaginaDeTexto
      titulo="Política de privacidade"
      vigenteDesde="[texto de quem conduz o projeto]"
      secoes={SECOES}
    />
  );
}
