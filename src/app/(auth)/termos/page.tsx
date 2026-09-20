import type { Metadata } from "next";
import {
  PaginaDeTexto,
  type SecaoDeTexto,
} from "@/components/auth/PaginaDeTexto";

export const metadata: Metadata = { title: "Termos de uso · Rende" };

/**
 * As seções são da spec 027 (3.5); o texto é de quem conduz o projeto. A 028
 * reescreve o parágrafo do teste grátis; a 029, o de exportar e encerrar.
 */
const SECOES: SecaoDeTexto[] = [
  {
    titulo: "Quem presta o serviço",
    paragrafos: ["[texto de quem conduz o projeto]"],
  },
  {
    titulo: "O que o Rende é, e o que não é",
    paragrafos: [
      "[texto de quem conduz o projeto]",
      "[texto de quem conduz o projeto]",
    ],
  },
  {
    titulo: "A sua conta, a sua senha e a responsabilidade por elas",
    paragrafos: ["[texto de quem conduz o projeto]"],
  },
  {
    titulo: "O teste grátis de catorze dias e o que acontece depois",
    paragrafos: ["[texto de quem conduz o projeto]"],
  },
  {
    titulo: "Os dados são seus",
    paragrafos: ["[texto de quem conduz o projeto]"],
  },
  {
    titulo: "Encerramento, por qualquer lado",
    paragrafos: ["[texto de quem conduz o projeto]"],
  },
  {
    titulo: "Mudanças nestes termos",
    paragrafos: ["[texto de quem conduz o projeto]"],
  },
  { titulo: "Foro", paragrafos: ["[texto de quem conduz o projeto]"] },
];

export default function PaginaTermos() {
  return (
    <PaginaDeTexto
      titulo="Termos de uso"
      vigenteDesde="[texto de quem conduz o projeto]"
      secoes={SECOES}
    />
  );
}
