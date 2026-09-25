/**
 * Quem responde pelo Rende enquanto não há empresa: uma pessoa física. O
 * Decreto 7.962/2013 (art. 2º) pede nome, CPF e endereço físico e eletrônico
 * de quem vende pela internet, e a LGPD (art. 9º, III) pede a identificação do
 * controlador. Um lugar só, lido por `/termos` e `/privacidade`; mora em
 * `src/app` para que o portão do deploy (o da spec 027) o veja.
 */
export const RESPONSAVEL: {
  nome: string;
  cpf: string;
  endereco: string;
  email: string;
  /**
   * A ajuda do pé das telas de acesso (`DECISOES.md#d195`): só dígitos, com
   * DDI. Sem ele, o link é o `mailto:` do `email`.
   */
  whatsapp?: string;
} = {
  nome: "Filipe Honório da Silva Santos",
  cpf: "104.869.324-43",
  endereco:
    "Rua Jardim Águas Claras, 184, Casa B, Águas Compridas, Olinda - PE, 53160-610",
  email: "fcbfilipesantos@gmail.com",
};
