import { cache } from "react";
import { estadoDoConvite, lerCodigo } from "@/lib/domain/convite";
import { primeiroNome } from "@/lib/domain/whatsapp";
import { lerBeta, lerConvite } from "@/lib/server/beta";

/**
 * O que a página e a prévia leem, uma vez por requisição (spec 183). O código
 * do endereço sai normalizado, ou vazio quando não tem a forma de um código.
 */
export const lerOConvite = cache(async (doEndereco: string) => {
  const [{ convite, conta }, beta] = await Promise.all([
    lerConvite(doEndereco),
    lerBeta(),
  ]);
  return {
    codigo: lerCodigo(doEndereco) ?? "",
    estado: estadoDoConvite(convite, conta, beta),
    convite,
    conta,
    beta,
  };
});

/**
 * O que o link diz antes de abrir: o nome de quem convida só no convite que
 * vale (`DECISOES.md#d183`, spec 183). O código nunca aparece.
 */
export function textoDaPrevia(lido: Awaited<ReturnType<typeof lerOConvite>>): {
  linhaDeCima: string;
  titulo: string;
  descricao: string;
} {
  if (lido.estado === "aberto" && lido.conta) {
    return {
      linhaDeCima: "Beta fechado · por convite",
      titulo: `${primeiroNome(lido.conta.proprietaria)} guardou uma vaga do Rende pra você`,
      descricao: "O Rende está em beta fechado, e só entra quem é convidada.",
    };
  }
  return {
    linhaDeCima: "Só entra quem é convidada",
    titulo: "O Rende está em beta fechado",
    descricao:
      "Só entra quem é convidada. Quem não tem convite entra na lista.",
  };
}
