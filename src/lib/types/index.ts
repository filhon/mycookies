export * from "./common";
export * from "./conta";
export * from "./configuracao";
export * from "./insumos";
export * from "./fichas";
export * from "./vendas";
export * from "./financeiro";
export * from "./producao";

/**
 * Mapa único de caminhos do Firestore. É o único lugar que conhece o formato.
 *
 * Todo dado vive sob `contas/{contaId}/…`, e nunca sob o login: `uid` diz quem
 * entrou, `contaId` diz de quem é o dado. Nenhuma coleção na raiz além de
 * `contas`, de `apelidos`, o índice dos endereços do cardápio
 * (`DECISOES.md#d319`), e de `plataforma`, a fase e as vagas do beta (spec
 * 181), que só o servidor toca; nenhum documento acessível sem conta. A
 * regra de segurança lê o vínculo direto da custom claim, sem custo de leitura.
 */
export const caminhos = {
  apelidos: "apelidos",
  apelido: (apelido: string) => `apelidos/${apelido}`,
  plataformaBeta: "plataforma/beta",
  /** O nome da coleção, para `collectionGroup`. */
  grupoConvites: "convites",
  convites: (contaId: string) => `contas/${contaId}/convites`,
  conta: (contaId: string) => `contas/${contaId}`,
  configuracao: (contaId: string) => `contas/${contaId}/configuracao`,
  configuracaoGeral: (contaId: string) =>
    `contas/${contaId}/configuracao/geral`,
  vitrine: (contaId: string) => `contas/${contaId}/configuracao/vitrine`,
  insumos: (contaId: string) => `contas/${contaId}/insumos`,
  fichas: (contaId: string) => `contas/${contaId}/fichas`,
  clientes: (contaId: string) => `contas/${contaId}/clientes`,
  pedidos: (contaId: string) => `contas/${contaId}/pedidos`,
  listasCompra: (contaId: string) => `contas/${contaId}/listasCompra`,
  fornadas: (contaId: string) => `contas/${contaId}/fornadas`,
  transacoes: (contaId: string) => `contas/${contaId}/transacoes`,
  metas: (contaId: string) => `contas/${contaId}/metas`,
  agregados: (contaId: string) => `contas/${contaId}/agregados`,
  resumoMensal: (contaId: string, competencia: string) =>
    `contas/${contaId}/agregados/${competencia}`,
  resumoGlobal: (contaId: string) => `contas/${contaId}/agregados/global`,
  membros: (contaId: string) => `contas/${contaId}/membros`,
  membro: (contaId: string, uid: string) => `contas/${contaId}/membros/${uid}`,
  aparelhos: (contaId: string) => `contas/${contaId}/aparelhos`,
  fiscalMei: (contaId: string) => `contas/${contaId}/fiscal/mei`,
} as const;
