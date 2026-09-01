export * from "./common";
export * from "./conta";
export * from "./configuracao";
export * from "./insumos";
export * from "./fichas";
export * from "./vendas";
export * from "./financeiro";

/**
 * Mapa único de caminhos do Firestore. É o único lugar que conhece o formato.
 *
 * Todo dado vive sob `contas/{contaId}/…`, e nunca sob o login: `uid` diz quem
 * entrou, `contaId` diz de quem é o dado. Nenhuma coleção na raiz além de
 * `contas`, nenhum documento acessível sem conta. A regra de segurança lê o
 * vínculo direto da custom claim, sem custo de leitura.
 */
export const caminhos = {
  conta: (contaId: string) => `contas/${contaId}`,
  configuracao: (contaId: string) => `contas/${contaId}/configuracao`,
  configuracaoGeral: (contaId: string) =>
    `contas/${contaId}/configuracao/geral`,
  insumos: (contaId: string) => `contas/${contaId}/insumos`,
  fichas: (contaId: string) => `contas/${contaId}/fichas`,
  clientes: (contaId: string) => `contas/${contaId}/clientes`,
  pedidos: (contaId: string) => `contas/${contaId}/pedidos`,
  listasCompra: (contaId: string) => `contas/${contaId}/listasCompra`,
  transacoes: (contaId: string) => `contas/${contaId}/transacoes`,
  metas: (contaId: string) => `contas/${contaId}/metas`,
  agregados: (contaId: string) => `contas/${contaId}/agregados`,
  resumoMensal: (contaId: string, competencia: string) =>
    `contas/${contaId}/agregados/${competencia}`,
  resumoGlobal: (contaId: string) => `contas/${contaId}/agregados/global`,
} as const;
